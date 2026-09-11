-- 추천 보상 인플레이션 방어 (2026-09-11)
--
-- 문제: 익명 계정은 무제한 생성 가능하고, 각 계정이 referred_by_code를 설정한 뒤
-- 첫 주행을 완료하면 grant_referral_reward()가 초대자에게 매번 +500을 지급한다.
-- 공격자가 자기 코드로 다수의 익명 계정을 farming하면 초대자 포인트가 무한 팽창한다.
--
-- 방어: 초대자(inviter_code) 단위로 보상 횟수를 서버에서 집계해 상한을 건다.
--   · 24시간 롤링 5건
--   · 누적 50건
-- 상한 초과 시 보상을 지급하지 않고 reason='rate_limited'로 반환한다.
-- (익명 가입 자체의 IP/기기지문 제한은 더 무거워 별도 후속으로 분리.)
--
-- 20260910090000의 본문을 유지하고, 'already_rewarded' 판정 직후·지급 직전에
-- 레이트 리밋 게이트만 삽입한다. set_config 플래그/REVOKE/GRANT는 동일.

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
    v_daily_limit  INT := 5;    -- 초대자별 24h 롤링 보상 상한
    v_total_limit  INT := 50;   -- 초대자별 누적 보상 상한
    v_daily_count  INT;
    v_total_count  INT;
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

    -- ── 레이트 리밋 게이트 (초대자 코드 단위) ──────────────────────────────
    -- 지금 지급하려는 건은 아직 reward_granted=false이므로 기존 지급분만 센다.
    SELECT
        count(*) FILTER (WHERE first_ride_at > now() - interval '24 hours'),
        count(*)
      INTO v_daily_count, v_total_count
      FROM referrals
      WHERE inviter_code = v_inviter_code AND reward_granted;

    IF v_daily_count >= v_daily_limit OR v_total_count >= v_total_limit THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited',
            'daily', v_daily_count, 'total', v_total_count);
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
