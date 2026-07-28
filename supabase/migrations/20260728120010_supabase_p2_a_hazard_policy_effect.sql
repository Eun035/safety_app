-- ============================================================
-- C-SAFE Migration: P2-A Hazard 정책 효과 측정 RPC
-- Date: 2026-05-27
-- ============================================================
-- 배경: B2G 협상에서 "위험구역 지정의 실제 효과"를 정량 입증하려면
--      각 hazard의 created_at 전후 윈도우에서 near_miss_events 발생량을
--      비교해야 한다. PostGIS 의존 없이 lat/lng 박싱으로 근사.
-- ============================================================

-- get_hazard_policy_effect:
--   최근 (window_days*2)일 내 추가된 hazard들에 대해
--   각 hazard 좌표 반경 약 radius_meters m 이내에서
--   지정 전 window_days일 vs 지정 후 window_days일 아차사고 발생 비교.
--
-- 박싱: 1° 위도 ≈ 111km, 따라서 radius_meters / 111000 를 lat/lng 양쪽에 적용.
--       위도 36° 부근에서 경도 1° ≈ 90km라 약간 over-coverage지만 시각화/협상
--       자료 목적상 허용 가능. 정확도가 필요해지면 PostGIS ST_DWithin으로 교체.
CREATE OR REPLACE FUNCTION public.get_hazard_policy_effect(
    radius_meters integer DEFAULT 200,
    window_days   integer DEFAULT 30,
    max_hazards   integer DEFAULT 10
)
RETURNS TABLE (
    hazard_id          uuid,
    hazard_title       text,
    hazard_type        text,
    hazard_lat         double precision,
    hazard_lng         double precision,
    hazard_created_at  timestamptz,
    before_count       bigint,
    after_count        bigint,
    reduction_pct      numeric            -- 양수면 감소(%), 음수면 증가(%)
)
LANGUAGE sql SECURITY DEFINER
AS $$
WITH recent_hazards AS (
    SELECT id, title, type, lat, lng, created_at
    FROM public.hazards
    WHERE created_at > now() - ((window_days * 2) || ' days')::interval
    ORDER BY created_at DESC
    LIMIT max_hazards
),
deg AS (
    SELECT (radius_meters::numeric / 111000.0)::numeric AS d
)
SELECT
    h.id AS hazard_id,
    h.title AS hazard_title,
    h.type AS hazard_type,
    h.lat AS hazard_lat,
    h.lng AS hazard_lng,
    h.created_at AS hazard_created_at,
    COUNT(*) FILTER (
        WHERE nme.occurred_at BETWEEN h.created_at - (window_days || ' days')::interval
                                  AND h.created_at
    ) AS before_count,
    COUNT(*) FILTER (
        WHERE nme.occurred_at >  h.created_at
          AND nme.occurred_at <= h.created_at + (window_days || ' days')::interval
    ) AS after_count,
    CASE
        WHEN COUNT(*) FILTER (
            WHERE nme.occurred_at BETWEEN h.created_at - (window_days || ' days')::interval
                                      AND h.created_at
        ) > 0
        THEN ROUND(
            (1 - COUNT(*) FILTER (
                WHERE nme.occurred_at >  h.created_at
                  AND nme.occurred_at <= h.created_at + (window_days || ' days')::interval
            )::numeric
            / COUNT(*) FILTER (
                WHERE nme.occurred_at BETWEEN h.created_at - (window_days || ' days')::interval
                                          AND h.created_at
            )) * 100, 1
        )
        ELSE NULL
    END AS reduction_pct
FROM recent_hazards h
CROSS JOIN deg
LEFT JOIN public.near_miss_events nme
       ON ABS(nme.lat - h.lat) <= deg.d
      AND ABS(nme.lng - h.lng) <= deg.d
      AND nme.occurred_at BETWEEN h.created_at - (window_days || ' days')::interval
                              AND h.created_at + (window_days || ' days')::interval
GROUP BY h.id, h.title, h.type, h.lat, h.lng, h.created_at
ORDER BY h.created_at DESC;
$$;

-- ============================================================
-- 사용 예:
--   SELECT * FROM public.get_hazard_policy_effect(200, 30, 5);
--   → 최근 60일 내 추가된 hazard 5개, 반경 200m 이내,
--     지정 전 30일 vs 지정 후 30일 비교
--
-- 실행: Supabase Dashboard SQL Editor에서 통째로 실행. idempotent.
-- ============================================================
