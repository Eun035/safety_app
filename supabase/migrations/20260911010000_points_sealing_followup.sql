-- 포인트 봉인 후속 정리 (2026-09-11)
--
-- Stage 1/2 배포·구 프론트 드레인이 끝난 뒤의 마무리 작업.
--   1) 하위호환용으로 남겨둔 구버전 grant_referral_reward(uuid) 완전 제거.
--   2) 봉인 대상 컬럼에 safety_score 추가(방어 완성).

-- ── 1) 구버전 grant_referral_reward(uuid) DROP ────────────────────────────
-- 20260906061657에서 REVOKE만 해두고 다음 배포 주기 이후 DROP하기로 했다.
-- Stage 1(신규 프론트, 인자 없는 () 호출)이 배포·드레인됐으므로 이제 제거한다.
DROP FUNCTION IF EXISTS public.grant_referral_reward(uuid);

-- ── 2) guard_points_write: safety_score 봉인 추가 ─────────────────────────
-- profiles.safety_score는 클라 직접 UPDATE도, 이를 갱신하는 RPC도 없다
-- (update_safety_scores는 safety_grid_scores만 갱신). 즉 정당한 UPDATE 경로가
-- 없으므로 봉인해도 기능 손상이 없고, 향후 변조 시도를 선제 차단한다.
-- 서버에서 갱신이 필요해지면 app.points_write 플래그를 세팅하면 통과한다.
CREATE OR REPLACE FUNCTION public.guard_points_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (NEW.points IS DISTINCT FROM OLD.points
        OR NEW.total_distance IS DISTINCT FROM OLD.total_distance
        OR NEW.safety_score IS DISTINCT FROM OLD.safety_score)
       AND COALESCE(current_setting('app.points_write', true), '0') <> '1'
    THEN
        RAISE EXCEPTION 'points/total_distance/safety_score can only change via award RPC'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;
-- 트리거(trg_guard_points_write)는 20260910090100에서 이미 생성됨. 함수만 교체.
