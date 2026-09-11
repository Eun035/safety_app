-- 관리자 제보자 조회 RPC (2026-09-11)
--
-- 20260911030000에서 제보자(reporter_id)를 비공개 테이블 hazard_reporters에 분리 저장했다.
-- 관리자가 스팸·허위 제보를 모더레이션하려면 제보자를 조회할 수 있어야 한다.
-- hazard_reporters는 클라 정책 0개(service_role 전용)이므로, is_admin 게이트를 건
-- SECURITY DEFINER RPC로만 노출한다. (일반 사용자·비관리자에게는 여전히 불가.)

CREATE OR REPLACE FUNCTION public.get_hazard_reporters()
RETURNS TABLE (
    hazard_id   uuid,
    reporter_id uuid,
    reported_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin only' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
        SELECT hr.hazard_id, hr.reporter_id, hr.created_at
        FROM hazard_reporters hr
        ORDER BY hr.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_hazard_reporters() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hazard_reporters() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_hazard_reporters() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hazard_reporters() TO service_role;
