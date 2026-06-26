-- ============================================================
-- C-SAFE Seed: Near-Miss Mock Data (P4 Heatmap Demo)
-- Date: 2026-06-26
-- ============================================================
-- 목적
--   히트맵 시각화 검증용 가상 데이터 50건 주입.
--   두정역 / 천안제3산업단지 / 단국대 천안캠퍼스 3개 핫스팟에 분포.
--
-- 멱등성 / 정리
--   모든 시드 행은 nearby_hazard_id = 'SEED_P4_MOCK' 로 마킹.
--   재실행 안전: 이미 존재하면 스킵.
--   삭제: DELETE FROM public.near_miss_events
--          WHERE nearby_hazard_id = 'SEED_P4_MOCK';
--
-- 호환
--   - user_id = NULL  (auth.users FK 위반 방지)
--   - RLS: 일반 사용자는 시드 행을 못 보지만, get_near_miss_clusters() 는
--          SECURITY DEFINER 이므로 히트맵 RPC 에는 정상 노출.
-- ============================================================

DO $$
DECLARE
    v_existing integer;
    v_inserted integer;
BEGIN
    SELECT COUNT(*) INTO v_existing
      FROM public.near_miss_events
     WHERE nearby_hazard_id = 'SEED_P4_MOCK';

    IF v_existing > 0 THEN
        RAISE NOTICE 'Seed already present (% rows) — skipping. To re-seed: DELETE first.', v_existing;
        RETURN;
    END IF;

    WITH hotspots(name, center_lat, center_lng, spread, weight) AS (
        VALUES
            ('두정역',           36.8434::double precision, 127.1305::double precision, 0.005::double precision, 20),
            ('천안제3산업단지',  36.8650::double precision, 127.1183::double precision, 0.006::double precision, 18),
            ('단국대천안캠퍼스', 36.8369::double precision, 127.1664::double precision, 0.005::double precision, 12)
    ),
    inserted AS (
        INSERT INTO public.near_miss_events (
            user_id, lat, lng, speed_kmh, deceleration_intensity,
            weather_risk, in_stress_zone, helmet_on,
            nearby_hazard_id, nearby_hazard_type, occurred_at
        )
        SELECT
            NULL::uuid,
            (h.center_lat + (random() - 0.5) * h.spread * 2)::double precision,
            (h.center_lng + (random() - 0.5) * h.spread * 2)::double precision,
            (10 + floor(random() * 25))::integer,           -- 10~34 km/h
            (1 + floor(random() * 3))::integer,             -- 1|2|3
            (random() < 0.3),                               -- 30% 기상 위험
            (random() < 0.4),                               -- 40% 스트레스 존
            (random() < 0.7),                               -- 70% 헬멧 착용
            'SEED_P4_MOCK',                                 -- ★ 시드 마커
            (ARRAY['SLOPE','accident','도로파손','잔재물'])
                [1 + floor(random() * 4)::integer],
            now() - (random() * interval '30 days')
        FROM hotspots h,
             LATERAL generate_series(1, h.weight) AS gs
        RETURNING id
    )
    SELECT COUNT(*) INTO v_inserted FROM inserted;

    RAISE NOTICE 'Seeded % near-miss mock events (두정/산단/단국대).', v_inserted;
END $$;

-- ============================================================
-- 검증 쿼리 (위 DO 블록 실행 후 Dashboard 에서 별도 실행)
-- ============================================================
--
-- 1) 시드 카운트 + geog 백필 확인
--    SELECT
--        COUNT(*)                                                 AS seeded,
--        COUNT(geog)                                              AS with_geog,
--        MIN(occurred_at)                                         AS oldest,
--        MAX(occurred_at)                                         AS newest
--    FROM public.near_miss_events
--    WHERE nearby_hazard_id = 'SEED_P4_MOCK';
--
-- 2) 클러스터 RPC 호출 (천안 전체 bbox, min_count=2)
--    SELECT *
--    FROM public.get_near_miss_clusters(
--        36.80, 127.10, 36.90, 127.20,  -- 시드 범위 전체
--        30, 3, 2
--    );
--
-- 3) GeoJSON 형태로 동일 호출
--    SELECT public.get_near_miss_heatmap_geojson(
--        36.80, 127.10, 36.90, 127.20, 30, 3, 2
--    );
--
-- ============================================================
-- 시드 일괄 삭제
-- ============================================================
--    DELETE FROM public.near_miss_events
--     WHERE nearby_hazard_id = 'SEED_P4_MOCK';
-- ============================================================
