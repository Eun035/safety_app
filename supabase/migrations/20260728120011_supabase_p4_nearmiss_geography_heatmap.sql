-- ============================================================
-- C-SAFE Migration: Near-Miss GEOGRAPHY + Batch Insert + Heatmap
-- Phase: P4 (Insight Layer — Heatmap Pipeline)
-- Date:  2026-06-26
-- ============================================================
-- 목적
--   1) near_miss_events 에 GEOGRAPHY(POINT,4326) generated 컬럼 추가
--      → 미터 단위 거리 쿼리(ST_DWithin geog, geog, meters) 자연 사용
--   2) 표현식 GIST → 컬럼 GIST 로 교체 (인덱스 적중률 ↑)
--   3) 배치 인서트 RPC: 1초/1점 수집 → 1분 batch / 주행종료 시 일괄 전송
--   4) 히트맵 집계 RPC: 그리드 클러스터링 (표준 행 출력 + GeoJSON 출력)
--
-- 호환성
--   - 기존 lat, lng 컬럼 그대로 유지 (클라이언트 useNearMissEngine.js 변경 불필요)
--   - geog 는 STORED generated 컬럼이라 ALTER 시점에 기존 행도 자동 백필
--   - get_near_miss_clusters() 는 시그니처가 확장됨 (기존 호출자는 DROP 후 신규 시그니처로 갱신 필요)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 1. GEOGRAPHY 컬럼 + GIST 인덱스 교체
-- ============================================================
ALTER TABLE public.near_miss_events
    ADD COLUMN IF NOT EXISTS geog GEOGRAPHY(POINT, 4326)
    GENERATED ALWAYS AS (
        CASE
            WHEN lat IS NOT NULL AND lng IS NOT NULL
            THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        END
    ) STORED;

DROP INDEX IF EXISTS public.idx_near_miss_location;

CREATE INDEX IF NOT EXISTS idx_near_miss_geog
    ON public.near_miss_events USING GIST (geog);

-- (참고) idx_near_miss_lat_lng (btree on lat,lng) 와
--        idx_near_miss_occurred_at, idx_near_miss_user_id 는 유지

-- ============================================================
-- 2. 배치 인서트 RPC
-- ============================================================
-- 호출 패턴 (클라이언트):
--   supabase.rpc('insert_near_miss_batch', { events: [ {...}, {...} ] })
--
-- events: JSON 배열. 각 원소 스키마:
--   {
--     "lat":        number  (required),
--     "lng":        number  (required),
--     "speed_kmh":  number  (default 0),
--     "deceleration_intensity": 1|2|3 (default 1),
--     "weather_risk":    boolean (default false),
--     "in_stress_zone":  boolean (default false),
--     "helmet_on":       boolean (default false),
--     "nearby_hazard_id":   string|null,
--     "nearby_hazard_type": string|null,
--     "occurred_at":  ISO timestamp (default now())
--   }
--
-- 보안: SECURITY INVOKER → RLS 그대로 적용
--       user_id 는 클라이언트가 보내지 않고 auth.uid() 로 강제 주입 (스푸핑 차단)
CREATE OR REPLACE FUNCTION public.insert_near_miss_batch(
    events jsonb
)
RETURNS TABLE (
    inserted_count integer,
    first_id       uuid,
    last_id        uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_count   integer := 0;
    v_first   uuid;
    v_last    uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required for near-miss batch insert'
            USING ERRCODE = '42501';
    END IF;

    IF events IS NULL OR jsonb_typeof(events) <> 'array' THEN
        RAISE EXCEPTION 'events must be a non-null JSON array, got %', jsonb_typeof(events)
            USING ERRCODE = '22023';
    END IF;

    WITH inserted AS (
        INSERT INTO public.near_miss_events (
            user_id, lat, lng, speed_kmh, deceleration_intensity,
            weather_risk, in_stress_zone, helmet_on,
            nearby_hazard_id, nearby_hazard_type, occurred_at
        )
        SELECT
            v_user_id,
            (e->>'lat')::double precision,
            (e->>'lng')::double precision,
            COALESCE((e->>'speed_kmh')::integer, 0),
            COALESCE((e->>'deceleration_intensity')::integer, 1),
            COALESCE((e->>'weather_risk')::boolean, false),
            COALESCE((e->>'in_stress_zone')::boolean, false),
            COALESCE((e->>'helmet_on')::boolean, false),
            NULLIF(e->>'nearby_hazard_id', ''),
            NULLIF(e->>'nearby_hazard_type', ''),
            COALESCE((e->>'occurred_at')::timestamptz, now())
        FROM jsonb_array_elements(events) AS e
        WHERE (e->>'lat')  IS NOT NULL
          AND (e->>'lng')  IS NOT NULL
          AND (e->>'lat')::double precision BETWEEN -90  AND 90
          AND (e->>'lng')::double precision BETWEEN -180 AND 180
        RETURNING id
    )
    SELECT COUNT(*)::integer, MIN(id), MAX(id)
      INTO v_count, v_first, v_last
      FROM inserted;

    RETURN QUERY SELECT v_count, v_first, v_last;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_near_miss_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_near_miss_batch(jsonb) TO authenticated;

-- ============================================================
-- 3. 클러스터 집계 RPC (geog 기반, 뷰포트 bbox 지원)
-- ============================================================
-- 기존 get_near_miss_clusters(radius_meters integer) 를 폐기하고 시그니처 확장.
-- 그리드 방식 유지 이유:
--   - DBSCAN (ST_ClusterDBSCAN) 보다 가볍고 결정론적
--   - grid_decimals=3 → 약 110m / decimals=2 → 약 1.1km
--
-- 보안: SECURITY DEFINER → RLS 우회. min_count>=2 가 k-익명성 가드.
DROP FUNCTION IF EXISTS public.get_near_miss_clusters(integer);

CREATE OR REPLACE FUNCTION public.get_near_miss_clusters(
    sw_lat        double precision DEFAULT NULL,
    sw_lng        double precision DEFAULT NULL,
    ne_lat        double precision DEFAULT NULL,
    ne_lng        double precision DEFAULT NULL,
    since_days    integer          DEFAULT 30,
    grid_decimals integer          DEFAULT 3,
    min_count     integer          DEFAULT 2
)
RETURNS TABLE (
    cluster_lat  double precision,
    cluster_lng  double precision,
    event_count  bigint,
    avg_speed    numeric,
    weather_pct  numeric,
    last_seen    timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH params AS (
        SELECT
            CASE
                WHEN sw_lat IS NOT NULL AND sw_lng IS NOT NULL
                 AND ne_lat IS NOT NULL AND ne_lng IS NOT NULL
                THEN ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)::geography
            END AS env,
            GREATEST(LEAST(grid_decimals, 5), 1)  AS gd,
            GREATEST(min_count, 1)                AS mc,
            GREATEST(since_days, 1)               AS sd
    )
    SELECT
        ROUND(lat::numeric, p.gd)::double precision  AS cluster_lat,
        ROUND(lng::numeric, p.gd)::double precision  AS cluster_lng,
        COUNT(*)                                     AS event_count,
        ROUND(AVG(nm.speed_kmh)::numeric, 1)         AS avg_speed,
        ROUND((SUM(nm.weather_risk::int)::numeric
               / NULLIF(COUNT(*), 0)) * 100, 1)      AS weather_pct,
        MAX(nm.occurred_at)                          AS last_seen
    FROM public.near_miss_events nm, params p
    WHERE nm.occurred_at > now() - make_interval(days => p.sd)
      AND nm.geog IS NOT NULL
      AND (p.env IS NULL OR ST_Intersects(nm.geog, p.env))
    GROUP BY 1, 2, p.mc
    HAVING COUNT(*) >= p.mc
    ORDER BY event_count DESC
    LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.get_near_miss_clusters(
    double precision, double precision, double precision, double precision,
    integer, integer, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_near_miss_clusters(
    double precision, double precision, double precision, double precision,
    integer, integer, integer
) TO anon, authenticated;

-- ============================================================
-- 4. 히트맵 GeoJSON RPC
-- ============================================================
-- 프론트엔드(react-kakao-maps-sdk 자체 렌더, 또는 외부 leaflet/mapbox 도구,
-- 어드민 대시보드의 Plotly density_mapbox) 가 그대로 소비 가능한
-- FeatureCollection JSON.
--   - geometry.coordinates = [lng, lat]  (GeoJSON 표준 — Kakao 의 {lat,lng} 와 반대)
--   - properties.count → 히트맵 강도값 (가중치)
CREATE OR REPLACE FUNCTION public.get_near_miss_heatmap_geojson(
    sw_lat        double precision DEFAULT NULL,
    sw_lng        double precision DEFAULT NULL,
    ne_lat        double precision DEFAULT NULL,
    ne_lng        double precision DEFAULT NULL,
    since_days    integer          DEFAULT 30,
    grid_decimals integer          DEFAULT 3,
    min_count     integer          DEFAULT 2
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'type',     'FeatureCollection',
        'features', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry', jsonb_build_object(
                        'type',        'Point',
                        'coordinates', jsonb_build_array(c.cluster_lng, c.cluster_lat)
                    ),
                    'properties', jsonb_build_object(
                        'count',       c.event_count,
                        'avg_speed',   c.avg_speed,
                        'weather_pct', c.weather_pct,
                        'last_seen',   c.last_seen
                    )
                )
            ),
            '[]'::jsonb
        )
    )
    FROM public.get_near_miss_clusters(
        sw_lat, sw_lng, ne_lat, ne_lng,
        since_days, grid_decimals, min_count
    ) AS c;
$$;

REVOKE ALL ON FUNCTION public.get_near_miss_heatmap_geojson(
    double precision, double precision, double precision, double precision,
    integer, integer, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_near_miss_heatmap_geojson(
    double precision, double precision, double precision, double precision,
    integer, integer, integer
) TO anon, authenticated;

-- ============================================================
-- 실행 방법
--   Supabase Dashboard → SQL Editor → 이 파일 전체 실행
--   또는: supabase db push  (CLI 연동 시)
--
-- 검증 쿼리 (Dashboard 에서 실행)
--   -- 신규 컬럼 백필 확인
--   SELECT COUNT(*) total,
--          COUNT(geog) with_geog
--     FROM public.near_miss_events;
--
--   -- 시드 데이터가 적을 때 min_count=1 로 호출
--   SELECT * FROM public.get_near_miss_clusters(
--       NULL,NULL,NULL,NULL, 30, 3, 1
--   );
--
--   -- 천안 시청 주변 반경 2km bbox 예시
--   SELECT public.get_near_miss_heatmap_geojson(
--       36.815, 127.155, 36.835, 127.185, 30, 3, 1
--   );
-- ============================================================
