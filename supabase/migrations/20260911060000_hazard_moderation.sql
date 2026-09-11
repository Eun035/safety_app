-- 제보 모더레이션 보강 (2026-09-11): 소프트 삭제(hidden) + 제보자 닉네임 조회
--
-- A3) hazards.hidden 플래그로 소프트 삭제(복구 가능). 숨김 제보는 공개 지도·음성
--     경고·목록에서 제외하되 행은 보존한다(관리자가 복구 가능).
-- A2) get_hazard_reporters가 제보자 닉네임도 반환(모더레이션 가독성).

-- ── A3-1) hidden 컬럼 ─────────────────────────────────────────────────────
ALTER TABLE public.hazards ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- ── A3-2) 음성 경고 RPC: 숨김 제외 ────────────────────────────────────────
-- get_nearby_hazards는 주행 중 위험구역 음성 경고의 핵심. 숨김 제보는 제외한다.
CREATE OR REPLACE FUNCTION public.get_nearby_hazards (
  user_lat      double precision,
  user_lng      double precision,
  radius_meters double precision DEFAULT 50
)
  RETURNS SETOF public.hazards
  LANGUAGE sql
  AS $function$
  SELECT *
  FROM hazards
  WHERE hidden = false
    AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    );
$function$;

-- (공개 SELECT 정책은 그대로. 클라 fetchHazards가 hidden=false 필터를 건다.
--  관리자 대시보드는 숨김 포함 전체를 봐야 하므로 필터하지 않는다.)

-- ── A2) 제보자 조회 RPC: 닉네임 포함 (재정의 — 반환 컬럼 변경이라 DROP 후 생성) ──
DROP FUNCTION IF EXISTS public.get_hazard_reporters();
CREATE FUNCTION public.get_hazard_reporters()
RETURNS TABLE (
    hazard_id       uuid,
    reporter_id     uuid,
    reporter_nickname text,
    reported_at     timestamptz
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
        SELECT hr.hazard_id, hr.reporter_id, p.nickname, hr.created_at
        FROM hazard_reporters hr
        LEFT JOIN profiles p ON p.id = hr.reporter_id
        ORDER BY hr.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_hazard_reporters() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hazard_reporters() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_hazard_reporters() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hazard_reporters() TO service_role;
