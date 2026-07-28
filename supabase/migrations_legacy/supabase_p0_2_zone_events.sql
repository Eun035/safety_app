-- ============================================================
-- C-SAFE Migration: P0-2 zone_events 테이블 신설
-- Date: 2026-05-27
-- ============================================================
-- 배경: RSR(Risk Suppression Rate)이 B2G 핵심 KPI인데 zone 이벤트가
--      클라이언트 localStorage(csafe_zone_events)에만 영속화되어 있어
--      (1) 사용자가 캐시 비우면 전체 KPI가 0이 되고
--      (2) AdminDashboard의 RSR이 관리자 본인 브라우저 localStorage만 본다.
-- 조치: zone_events 테이블 신설 + AdminDashboard 쿼리 Supabase 전환.
-- ============================================================

-- 1. 테이블
CREATE TABLE IF NOT EXISTS public.zone_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id         uuid REFERENCES public.rides(id) ON DELETE CASCADE,
    user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    zone_id         text NOT NULL,

    -- 속도 계측 (km/h)
    v_entry         numeric,            -- 진입 시점 속도
    v_target        numeric,            -- 권장 제한속도 (보통 10 km/h)
    v_actual_avg    numeric,            -- 존 내부 평균 속도
    v_sum           numeric,            -- 샘플 속도 누적합 (감사 추적용)
    v_count         integer,            -- 샘플 횟수

    -- 시각
    started_at      timestamptz,
    ended_at        timestamptz,

    -- 사전 계산된 per-event RSR (%)
    -- RSR = (1 − (V_actual − V_target) / (V_entry − V_target)) × 100
    -- V_entry ≤ V_target 인 케이스는 100 (완벽 통제)
    rsr_value       numeric,

    created_at      timestamptz DEFAULT now()
);

-- 2. 이상치 방어
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'zone_events_rsr_sane') THEN
    ALTER TABLE public.zone_events
      ADD CONSTRAINT zone_events_rsr_sane
      CHECK (rsr_value IS NULL OR (rsr_value >= 0 AND rsr_value <= 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'zone_events_speed_sane') THEN
    ALTER TABLE public.zone_events
      ADD CONSTRAINT zone_events_speed_sane
      CHECK (
        (v_entry IS NULL OR (v_entry >= 0 AND v_entry <= 80)) AND
        (v_target IS NULL OR (v_target >= 0 AND v_target <= 80)) AND
        (v_actual_avg IS NULL OR (v_actual_avg >= 0 AND v_actual_avg <= 80))
      );
  END IF;
END $$;

-- 3. 분석 쿼리 가속용 인덱스
CREATE INDEX IF NOT EXISTS idx_zone_events_user_ride
  ON public.zone_events(user_id, ride_id);
CREATE INDEX IF NOT EXISTS idx_zone_events_started_at
  ON public.zone_events(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_zone_events_zone_id
  ON public.zone_events(zone_id);

-- 4. RLS 정책
ALTER TABLE public.zone_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own zone events" ON public.zone_events;
DROP POLICY IF EXISTS "Users can insert own zone events" ON public.zone_events;

CREATE POLICY "Users can view own zone events"
    ON public.zone_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own zone events"
    ON public.zone_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 5. Admin용 도시 전체 RSR 집계 RPC (service_role 권장)
-- 일정 기간 내 모든 zone_events의 평균 RSR을 zone_id별로 반환
CREATE OR REPLACE FUNCTION public.get_rsr_by_zone(
    days_back integer DEFAULT 30
)
RETURNS TABLE (
    zone_id      text,
    event_count  bigint,
    avg_rsr      numeric,
    avg_v_entry  numeric,
    avg_v_actual numeric
)
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT
        zone_id,
        COUNT(*) AS event_count,
        ROUND(AVG(rsr_value)::numeric, 1) AS avg_rsr,
        ROUND(AVG(v_entry)::numeric, 1) AS avg_v_entry,
        ROUND(AVG(v_actual_avg)::numeric, 1) AS avg_v_actual
    FROM public.zone_events
    WHERE started_at > now() - (days_back || ' days')::interval
    GROUP BY zone_id
    ORDER BY event_count DESC;
$$;

-- ============================================================
-- 실행 방법: Supabase Dashboard → SQL Editor에서 이 파일 통째로 실행.
-- 모든 구문이 idempotent하므로 재실행해도 안전합니다.
-- ============================================================
