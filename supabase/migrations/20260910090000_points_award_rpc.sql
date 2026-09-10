-- 포인트 위·변조 봉인 (1/2): 적립 경로를 서버 RPC로 일원화
--
-- 배경: profiles UPDATE RLS는 행만 제한하고(auth.uid()=id) 컬럼 제한이 없어,
-- 로그인(익명 포함) 사용자가 자기 points/total_distance를 임의 PATCH할 수 있었다.
-- 다음 마이그레이션(2/2)에서 BEFORE UPDATE 트리거로 이 두 컬럼을 봉인한다.
--
-- 봉인 메커니즘: 정당한 적립 함수는 트랜잭션-로컬 GUC 'app.points_write'='1'을
-- 세팅하고, 트리거는 이 플래그가 없으면 points/total_distance 변경을 거부한다.
-- SECURITY DEFINER owner에 의존하지 않아(increment_user_stats owner 불명) 안전하다.
--
-- ⚠️ 순서: 이 마이그레이션(함수)과 신규 프론트를 먼저 배포하고, 구 세션이 드레인된
--    뒤에 2/2(트리거)를 배포한다. 트리거를 먼저 넣으면 구 프론트 적립이 전부 죽는다.

-- ── 1) award_points: 단발성 보상 적립 (미션/QR/퀴즈/헬멧/하이브리드) ──────────
--
-- 대상은 항상 호출자 본인(auth.uid())으로 고정 — 인자로 타 유저 지정 불가.
-- 금액은 클라 주도라 완전한 서버 권위화는 아니나, 상한으로 blast radius를 축소한다.

CREATE OR REPLACE FUNCTION public.award_points(
    amount_in   int,
    distance_in double precision DEFAULT 0,
    reason_in   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
    END IF;

    -- 상한 검증: 미션 최대 1000 고려해 여유 있게 1..2000
    IF amount_in IS NULL OR amount_in < 1 OR amount_in > 2000 THEN
        RAISE EXCEPTION 'award_points: amount out of range (%).', amount_in
            USING ERRCODE = '22003';
    END IF;
    IF distance_in IS NULL OR distance_in < 0 OR distance_in > 1000 THEN
        RAISE EXCEPTION 'award_points: distance out of range (%).', distance_in
            USING ERRCODE = '22003';
    END IF;

    -- 트리거 통과 플래그(트랜잭션-로컬)
    PERFORM set_config('app.points_write', '1', true);

    UPDATE profiles
        SET points         = COALESCE(points, 0) + amount_in,
            total_distance = COALESCE(total_distance, 0) + distance_in
        WHERE id = v_uid;

    RETURN jsonb_build_object('ok', true, 'amount', amount_in, 'reason', reason_in);
END;
$$;

REVOKE ALL ON FUNCTION public.award_points(int, double precision, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_points(int, double precision, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_points(int, double precision, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_points(int, double precision, text) TO service_role;


-- ── 2) increment_user_stats: 주행 완료 적립 (재정의) ───────────────────────
--
-- 기존 정의는 운영 DB에만 존재해 로컬에는 없었다(그래서 로컬은 클라 폴백을 탐).
-- 여기서 레포에 정의를 확정해 로컬==운영을 정합시키고, 대상을 auth.uid()로 강제한다.
-- 구 프론트가 user_id_in을 넘겨도 무시하므로 하위호환 유지(구 시그니처 DROP 불필요).

CREATE OR REPLACE FUNCTION public.increment_user_stats(
    user_id_in   uuid,
    inc_points   int,
    inc_distance double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();   -- 인자(user_id_in)는 의도적으로 무시하고 호출자 본인으로 고정
BEGIN
    IF v_uid IS NULL THEN
        RETURN;
    END IF;

    IF inc_points IS NULL OR inc_points < 0 OR inc_points > 2000 THEN
        RAISE EXCEPTION 'increment_user_stats: points out of range (%).', inc_points
            USING ERRCODE = '22003';
    END IF;
    IF inc_distance IS NULL OR inc_distance < 0 OR inc_distance > 1000 THEN
        RAISE EXCEPTION 'increment_user_stats: distance out of range (%).', inc_distance
            USING ERRCODE = '22003';
    END IF;

    PERFORM set_config('app.points_write', '1', true);

    UPDATE profiles
        SET points         = COALESCE(points, 0) + inc_points,
            total_distance = COALESCE(total_distance, 0) + inc_distance
        WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_stats(uuid, int, double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_user_stats(uuid, int, double precision) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_user_stats(uuid, int, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_stats(uuid, int, double precision) TO service_role;


-- ── 3) grant_referral_reward: 추천 보상 (재정의 — 플래그 세팅만 추가) ────────
--
-- 20260906061657_tighten_function_grants.sql 의 본문을 그대로 유지하고,
-- points UPDATE 이전에 set_config 한 줄만 삽입한다(같은 트랜잭션 → 1회로 양쪽 커버).

CREATE OR REPLACE FUNCTION public.grant_referral_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invitee      UUID := auth.uid();
    v_inviter_code TEXT;
    v_inviter_id   UUID;
    v_referral_id  BIGINT;
    v_already      BOOLEAN;
    v_reward       INT := 500;
BEGIN
    IF v_invitee IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
    END IF;

    SELECT referred_by_code INTO v_inviter_code
        FROM profiles WHERE id = v_invitee;

    IF v_inviter_code IS NULL OR v_inviter_code = '' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'no_referrer');
    END IF;

    SELECT id INTO v_inviter_id
        FROM profiles WHERE referral_code = v_inviter_code LIMIT 1;

    IF v_inviter_id = v_invitee THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'self_referral_blocked');
    END IF;

    SELECT id INTO v_referral_id
        FROM referrals WHERE invitee_user_id = v_invitee LIMIT 1;

    IF v_referral_id IS NULL THEN
        UPDATE referrals
            SET invitee_user_id = v_invitee,
                signed_up_at    = COALESCE(signed_up_at, now())
            WHERE id = (
                SELECT id FROM referrals
                    WHERE inviter_code = v_inviter_code AND invitee_user_id IS NULL
                    ORDER BY landed_at DESC LIMIT 1
            )
            RETURNING id INTO v_referral_id;
    END IF;

    IF v_referral_id IS NULL THEN
        INSERT INTO referrals (inviter_code, invitee_user_id, signed_up_at)
            VALUES (v_inviter_code, v_invitee, now())
            RETURNING id INTO v_referral_id;
    END IF;

    SELECT reward_granted INTO v_already FROM referrals WHERE id = v_referral_id;
    IF v_already THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'already_rewarded');
    END IF;

    -- 트리거 통과 플래그(트랜잭션-로컬) — 아래 points UPDATE들을 모두 커버
    PERFORM set_config('app.points_write', '1', true);

    IF v_inviter_id IS NULL THEN
        UPDATE profiles SET points = COALESCE(points, 0) + v_reward
            WHERE id = v_invitee;
        UPDATE referrals SET reward_granted = TRUE, first_ride_at = COALESCE(first_ride_at, now())
            WHERE id = v_referral_id;
        RETURN jsonb_build_object('ok', true, 'invitee_reward', v_reward, 'inviter_reward', 0, 'inviter_missing', true);
    END IF;

    UPDATE profiles SET points = COALESCE(points, 0) + v_reward
        WHERE id IN (v_inviter_id, v_invitee);
    UPDATE referrals SET reward_granted = TRUE, first_ride_at = COALESCE(first_ride_at, now())
        WHERE id = v_referral_id;

    RETURN jsonb_build_object('ok', true, 'invitee_reward', v_reward, 'inviter_reward', v_reward, 'inviter_id', v_inviter_id);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_referral_reward() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_referral_reward() FROM anon;
GRANT EXECUTE ON FUNCTION public.grant_referral_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_referral_reward() TO service_role;
