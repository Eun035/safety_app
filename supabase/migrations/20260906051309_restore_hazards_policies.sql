-- hazards RLS 복구 — 시민 위험 제보 기능이 죽어 있던 것을 고친다.
--
-- 20260829123826_remote_schema.sql이 기존 정책 4개("Anyone can view hazards",
-- "Anyone can report hazards", "Hazards are viewable by everyone.",
-- "Authenticated users can create hazards.")를 전부 DROP했는데 대체 정책이 없었다.
-- RLS가 ON인 채 정책이 0개면 전면 거부다.
--
-- 그 결과:
--   - useSafeData.fetchHazards가 에러가 아니라 "0행"을 받아(RLS는 에러를 내지 않는다)
--     지도에 위험구역이 하나도 뜨지 않았다. 폴백은 catch 블록에만 있어 발동하지 않았다.
--   - reportHazard의 INSERT가 거부되어 시민 제보가 전혀 저장되지 않았다.
--     (운영 hazards 테이블 0행)
--
-- 읽기를 공개로 되돌리는 근거:
--   hazards에는 개인정보 컬럼이 없는 도시 공공 안전 정보(급경사·사고다발·도로파손)이고,
--   이미 get_nearby_hazards(SECURITY DEFINER)가 anon에게 열려 있어 RLS로 막아둔 것이
--   실질 보호가 아니라 지도 표시만 죽인 상태였다.

-- ── 정책 ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Hazards are viewable by everyone" ON public.hazards;
CREATE POLICY "Hazards are viewable by everyone" ON public.hazards
    FOR SELECT
    USING (true);

-- 제보는 로그인 세션(익명 포함)이 있어야 한다. 앱은 부팅 시 signInAnonymously를
-- 하므로 정상 사용자는 항상 통과한다.
DROP POLICY IF EXISTS "Authenticated users can report hazards" ON public.hazards;
CREATE POLICY "Authenticated users can report hazards" ON public.hazards
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- 수정·삭제는 관리자만. 시민 제보를 임의로 지우거나 좌표를 옮길 수 있으면
-- 안전 정보 자체가 조작 대상이 된다.
DROP POLICY IF EXISTS "Admins can update hazards" ON public.hazards;
CREATE POLICY "Admins can update hazards" ON public.hazards
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete hazards" ON public.hazards;
CREATE POLICY "Admins can delete hazards" ON public.hazards
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 정책 실수에 대비한 이중 방어. 테이블 GRANT 자체를 좁힌다.
REVOKE INSERT, UPDATE, DELETE ON public.hazards FROM anon;
REVOKE DELETE ON public.hazards FROM authenticated;

-- ── location 자동 채움 ──────────────────────────────────────────────────
--
-- get_nearby_hazards는 ST_DWithin(location, ...)으로 검색하는데, 앱은 lat/lng만
-- INSERT하고 location을 채우는 트리거가 없었다(pg_trigger 조회 결과 0건).
-- 즉 정책을 고쳐 제보가 저장되더라도 그 제보는 음성 경고에 영영 잡히지 않는다.

CREATE OR REPLACE FUNCTION public.hazards_sync_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hazards_sync_location_trg ON public.hazards;
CREATE TRIGGER hazards_sync_location_trg
    BEFORE INSERT OR UPDATE OF lat, lng ON public.hazards
    FOR EACH ROW
    EXECUTE FUNCTION public.hazards_sync_location();

-- 기존 행 백필 (좌표는 있는데 location이 비어 있던 행)
UPDATE public.hazards
   SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
 WHERE location IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;

COMMENT ON FUNCTION public.hazards_sync_location() IS
    'lat/lng → PostGIS location 동기화. get_nearby_hazards가 location으로 검색하므로 필수.';

-- 참고(후속 과제): 제보자 추적용 reporter_id 컬럼은 이번에 넣지 않았다.
-- hazards는 공개 SELECT이고 realtime 퍼블리케이션에도 포함돼 있어, 컬럼을 추가하면
-- 제보자의 익명 uid가 그대로 노출된다. 컬럼 단위 GRANT는 realtime 페이로드에
-- 적용되지 않으므로, 공개용 뷰를 따로 두는 설계가 필요하다.
