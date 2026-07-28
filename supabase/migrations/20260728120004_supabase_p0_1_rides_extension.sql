-- ============================================================
-- C-SAFE Migration: P0-1 rides 테이블 핵심 메트릭 컬럼 확장
-- Date: 2026-05-27
-- ============================================================
-- 배경: 주행 종료 시점 메트릭(top_speed, sudden_brake_count, ride_rsr 등)이
--      클라이언트 localStorage(csafe_ride_history)에만 저장되어, 다른 디바이스에서
--      같은 계정 로그인 시 통계 회귀 발생. 분석 파이프라인의 single source of
--      truth를 rides 테이블로 통일.
-- ============================================================

-- 1. 핵심 메트릭 컬럼 추가 (모두 idempotent)
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS top_speed          numeric;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS sudden_brake_count integer DEFAULT 0;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS duration_minutes   integer;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS ride_rsr           numeric;   -- per-ride RSR (%)
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS helmet_on_pct      numeric;   -- 0~100
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS co2_saved_kg       numeric;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS is_legal_park      boolean;

-- 2. 이상치 방어 CHECK 제약 (드물게 들어오는 GPS/속도 이상치 차단)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rides_distance_sane'
  ) THEN
    ALTER TABLE public.rides
      ADD CONSTRAINT rides_distance_sane
      CHECK (distance IS NULL OR (distance >= 0 AND distance <= 100));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rides_top_speed_sane'
  ) THEN
    ALTER TABLE public.rides
      ADD CONSTRAINT rides_top_speed_sane
      CHECK (top_speed IS NULL OR (top_speed >= 0 AND top_speed <= 80));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rides_brake_count_sane'
  ) THEN
    ALTER TABLE public.rides
      ADD CONSTRAINT rides_brake_count_sane
      CHECK (sudden_brake_count IS NULL OR (sudden_brake_count >= 0 AND sudden_brake_count <= 200));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rides_ride_rsr_sane'
  ) THEN
    ALTER TABLE public.rides
      ADD CONSTRAINT rides_ride_rsr_sane
      CHECK (ride_rsr IS NULL OR (ride_rsr >= 0 AND ride_rsr <= 100));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rides_helmet_pct_sane'
  ) THEN
    ALTER TABLE public.rides
      ADD CONSTRAINT rides_helmet_pct_sane
      CHECK (helmet_on_pct IS NULL OR (helmet_on_pct >= 0 AND helmet_on_pct <= 100));
  END IF;
END $$;

-- 3. 분석 쿼리 가속용 인덱스
CREATE INDEX IF NOT EXISTS idx_rides_user_start_time
  ON public.rides(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_rides_start_time
  ON public.rides(start_time DESC);

-- ============================================================
-- 실행 방법: Supabase Dashboard → SQL Editor에서 이 파일 통째로 실행.
-- 모든 구문이 idempotent하므로 재실행해도 안전합니다.
-- ============================================================
