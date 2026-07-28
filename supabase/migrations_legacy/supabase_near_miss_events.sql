-- ============================================================
-- C-SAFE Migration: Near-Miss Events Table
-- Phase: Near-Miss Engine (Strategic Data Moat)
-- Date: 2026-05-23
-- ============================================================
-- 목적: 아차사고 이벤트를 GPS/맥락 데이터와 함께 저장
--      도시 위험 예측 및 정책 추천 엔진의 핵심 데이터셋
-- ============================================================

-- 1. near_miss_events 테이블 생성
CREATE TABLE IF NOT EXISTS public.near_miss_events (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 위치 데이터
    lat                 double precision,
    lng                 double precision,

    -- 이벤트 맥락
    speed_kmh           integer DEFAULT 0,           -- 이벤트 발생 시 속도 (km/h)
    deceleration_intensity integer DEFAULT 1,        -- 1=보통, 2=강, 3=매우강
    weather_risk        boolean DEFAULT false,        -- 기상 위험 여부
    in_stress_zone      boolean DEFAULT false,        -- 보행자 스트레스 존 여부
    helmet_on           boolean DEFAULT false,        -- 헬멧 착용 여부

    -- 주변 위험 정보 (nullable)
    nearby_hazard_id    text,                        -- hazards 테이블 참조 (uuid 또는 fallback id)
    nearby_hazard_type  text,                        -- 'accident' | 'SLOPE' | '도로파손' | etc.

    occurred_at         timestamptz DEFAULT now(),
    created_at          timestamptz DEFAULT now()
);

-- 2. 공간 인덱스 (PostGIS 기반 위험 클러스터 분석용)
-- PostGIS 확장이 활성화된 경우에만 실행
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_near_miss_location
                 ON public.near_miss_events USING GIST (
                     ST_SetSRID(ST_MakePoint(lng, lat), 4326)
                 )';
    END IF;
END $$;

-- 일반 인덱스 (PostGIS 없는 경우 fallback)
CREATE INDEX IF NOT EXISTS idx_near_miss_occurred_at ON public.near_miss_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_near_miss_user_id ON public.near_miss_events(user_id);
CREATE INDEX IF NOT EXISTS idx_near_miss_lat_lng ON public.near_miss_events(lat, lng);

-- 3. RLS 정책
ALTER TABLE public.near_miss_events ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 읽기 허용
CREATE POLICY "Users can view own near miss events"
    ON public.near_miss_events FOR SELECT
    USING (auth.uid() = user_id);

-- 본인 데이터만 삽입 허용
CREATE POLICY "Users can insert own near miss events"
    ON public.near_miss_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 관리자 전체 읽기 (어드민 정책 분석용)
-- 주의: 실서비스에서는 service_role 키를 사용하는 별도 API를 통해 접근 권장
-- CREATE POLICY "Admin can view all near miss events"
--     ON public.near_miss_events FOR SELECT
--     USING (auth.jwt() ->> 'role' = 'admin');

-- 4. 위험 클러스터 분석을 위한 RPC 함수 (Admin Dashboard용)
-- 반경 내 아차사고 밀집 구역을 반환
CREATE OR REPLACE FUNCTION get_near_miss_clusters(
    radius_meters integer DEFAULT 100
)
RETURNS TABLE (
    cluster_lat  double precision,
    cluster_lng  double precision,
    event_count  bigint,
    avg_speed    numeric,
    weather_pct  numeric
)
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT
        ROUND(lat::numeric, 3) AS cluster_lat,
        ROUND(lng::numeric, 3) AS cluster_lng,
        COUNT(*) AS event_count,
        ROUND(AVG(speed_kmh)::numeric, 1) AS avg_speed,
        ROUND((SUM(weather_risk::int)::numeric / COUNT(*)) * 100, 1) AS weather_pct
    FROM public.near_miss_events
    WHERE occurred_at > now() - interval '30 days'
    GROUP BY ROUND(lat::numeric, 3), ROUND(lng::numeric, 3)
    HAVING COUNT(*) >= 2
    ORDER BY event_count DESC
    LIMIT 50;
$$;

-- ============================================================
-- 실행 방법:
-- Supabase Dashboard > SQL Editor 에서 이 파일 내용을 실행하세요.
-- 또는: supabase db push (로컬 CLI 연동 시)
-- ============================================================
