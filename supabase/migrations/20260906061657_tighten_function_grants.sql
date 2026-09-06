-- SECURITY DEFINER 함수들의 실행 권한과 search_path 정리.
--
-- 대부분의 함수가 EXECUTE 제한 없이 만들어져 기본값대로 PUBLIC(=anon 포함)이
-- 호출할 수 있었고, search_path도 고정돼 있지 않았다. SECURITY DEFINER 함수는
-- 소유자 권한으로 실행되므로 검색경로 하이재킹의 표적이 된다.
--
-- 앱의 일반 사용자는 익명 로그인이라도 JWT role이 'authenticated'다.
-- 따라서 anon에서 회수해도 정상 사용자 경로는 영향이 없다.

-- ── 1) grant_referral_reward: 인자를 신뢰하던 문제 ──────────────────────
--
-- 기존 grant_referral_reward(p_invitee_user_id uuid)는 인자를 auth.uid()와
-- 대조하지 않았고 anon도 호출할 수 있었다. 임의 UUID를 넣어 호출하면 그 사용자의
-- referrals.reward_granted가 미리 소진되어, 정작 본인은 정당한 시점에
-- 'already_rewarded'로 거부된다(보상 탈취는 아니지만 서비스 방해).
--
-- 인자를 없애고 호출자 본인(auth.uid())에게만 동작하도록 바꾼다.

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

-- 구버전은 즉시 DROP하지 않는다. 이미 배포된 앱이 인자 있는 형태로 호출하고
-- 있어, 프론트가 갱신되기 전에 지우면 추천 보상이 끊긴다. 호출만 막아두고
-- 다음 배포 주기 이후 DROP한다.
REVOKE ALL ON FUNCTION public.grant_referral_reward(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_referral_reward(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.grant_referral_reward(uuid) FROM authenticated;


-- ── 2) 관리자 전용 함수 ────────────────────────────────────────────────
-- 대시보드에서만 쓰는 함수들. anon 실행을 막고 관리자 검사를 건다.

CREATE OR REPLACE FUNCTION public.refresh_rides_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin only' USING ERRCODE = '42501';
    END IF;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.rides_daily;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_rides_daily() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_rides_daily() FROM anon;
GRANT EXECUTE ON FUNCTION public.refresh_rides_daily() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_rides_daily() TO service_role;

-- get_hazard_policy_effect / get_rsr_by_zone 은 대시보드 전용이고 프론트의
-- 일반 사용자 경로에서는 호출하지 않는다. anon만 회수한다(집계라 관리자 검사까지는
-- 걸지 않는다 — 개별 사용자를 식별할 수 없는 형태다).
-- ⚠️ anon에서만 회수하면 안 된다. EXECUTE가 PUBLIC으로 부여돼 있으면 anon이
--    거기서 상속받아 그대로 호출할 수 있다. PUBLIC을 먼저 회수하고 필요한
--    역할에만 다시 부여한다.
REVOKE ALL ON FUNCTION public.get_hazard_policy_effect(integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hazard_policy_effect(integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_hazard_policy_effect(integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hazard_policy_effect(integer, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.get_rsr_by_zone(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_rsr_by_zone(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_rsr_by_zone(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rsr_by_zone(integer) TO service_role;


-- ── 3) 일반 사용자 경로: 권한 유지, anon만 회수 ────────────────────────
--
-- update_safety_scores  : 주행 종료 시 호출 (useRideSession)
-- get_near_miss_clusters: 지도 히트맵 (useHazardHeatmap → MapContainer)
-- 둘 다 authenticated는 반드시 유지해야 한다. 회수하면 기능이 죽는다.
REVOKE ALL ON FUNCTION public.update_safety_scores(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_safety_scores(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_safety_scores(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_safety_scores(jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.get_near_miss_clusters(double precision, double precision, double precision, double precision, integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_near_miss_clusters(double precision, double precision, double precision, double precision, integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_near_miss_clusters(double precision, double precision, double precision, double precision, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_near_miss_clusters(double precision, double precision, double precision, double precision, integer, integer, integer) TO service_role;

-- 프론트에서 호출하지 않는 함수. anon 실행만 막아둔다.
REVOKE ALL ON FUNCTION public.get_near_miss_heatmap_geojson(double precision, double precision, double precision, double precision, integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_near_miss_heatmap_geojson(double precision, double precision, double precision, double precision, integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_near_miss_heatmap_geojson(double precision, double precision, double precision, double precision, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_near_miss_heatmap_geojson(double precision, double precision, double precision, double precision, integer, integer, integer) TO service_role;
