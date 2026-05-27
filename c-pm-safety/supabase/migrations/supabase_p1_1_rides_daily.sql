-- ============================================================
-- C-SAFE Migration: P1-1 rides_daily 머티리얼라이즈드 뷰
-- Date: 2026-05-27
-- ============================================================
-- 배경: AdminDashboard가 30일 KPI 산출 시 rides 전체를 풀스캔.
--      데이터 1만건+에서 응답 지연 발생.
-- 조치: 일별 사전 집계 뷰 + UNIQUE INDEX(CONCURRENTLY refresh 가능) +
--      REFRESH RPC. pg_cron이 있으면 매일 새벽 자동 갱신.
-- ============================================================

-- 1. 일별 집계 머티리얼라이즈드 뷰
-- (P0-1에서 추가된 컬럼 활용 — top_speed/sudden_brake_count/ride_rsr/helmet_on_pct)
DROP MATERIALIZED VIEW IF EXISTS public.rides_daily;

CREATE MATERIALIZED VIEW public.rides_daily AS
SELECT
    date_trunc('day', start_time)::date              AS day,
    COUNT(*)                                          AS ride_count,
    COUNT(DISTINCT user_id)                           AS unique_riders,
    COALESCE(SUM(distance), 0)                        AS total_distance_km,
    COALESCE(SUM(duration_minutes), 0)                AS total_minutes,
    ROUND(AVG(top_speed)::numeric, 1)                 AS avg_top_speed,
    COALESCE(SUM(sudden_brake_count), 0)              AS sudden_brake_total,
    ROUND(AVG(ride_rsr)::numeric, 1)                  AS avg_rsr,
    ROUND(AVG(helmet_on_pct)::numeric, 1)             AS avg_helmet_pct,
    COALESCE(SUM(co2_saved_kg), 0)                    AS total_co2_saved_kg,
    SUM(CASE WHEN is_legal_park IS TRUE THEN 1 ELSE 0 END) AS legal_park_count,
    SUM(CASE WHEN is_safe_ride IS TRUE THEN 1 ELSE 0 END)  AS safe_ride_count
FROM public.rides
WHERE start_time IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

-- 2. UNIQUE INDEX (REFRESH MATERIALIZED VIEW CONCURRENTLY를 위해 필수)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rides_daily_day
  ON public.rides_daily(day);

-- 3. REFRESH RPC (AdminDashboard에서 호출하거나 pg_cron이 호출)
CREATE OR REPLACE FUNCTION public.refresh_rides_daily()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- CONCURRENTLY: 갱신 중에도 SELECT 차단 없이 진행 (UNIQUE INDEX 필수)
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.rides_daily;
END;
$$;

-- 4. pg_cron 자동 갱신 (활성화된 경우에만)
-- pg_cron 확장이 없으면 조용히 스킵. 활성화 후 재실행 시 스케줄 등록.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- 기존 동일 작업 제거 후 재등록 (idempotent)
        PERFORM cron.unschedule('refresh-rides-daily')
        WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-rides-daily');

        PERFORM cron.schedule(
            'refresh-rides-daily',
            '0 3 * * *',                         -- 매일 03:00 UTC (KST 12:00)
            $cron$ SELECT public.refresh_rides_daily(); $cron$
        );
        RAISE NOTICE 'pg_cron 스케줄 등록 완료: 매일 03:00 UTC';
    ELSE
        RAISE NOTICE 'pg_cron 미설치 - AdminDashboard 로드 시 RPC 수동 호출됨';
    END IF;
END $$;

-- 5. 최초 1회 갱신 (뷰 생성 직후 데이터 채우기)
SELECT public.refresh_rides_daily();

-- ============================================================
-- 사용:
--   SELECT * FROM public.rides_daily WHERE day >= now() - interval '30 days';
--
-- 수동 갱신:
--   SELECT public.refresh_rides_daily();
--
-- 실행 방법:
--   Supabase Dashboard → SQL Editor에서 통째로 실행. idempotent.
-- ============================================================
