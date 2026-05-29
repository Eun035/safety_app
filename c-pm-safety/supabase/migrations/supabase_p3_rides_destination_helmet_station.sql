-- ============================================================
-- C-SAFE Migration: rides 테이블 - 목적지 텍스트 + 헬멧 거점 ID 컬럼 추가
-- Date: 2026-05-29
-- ============================================================
-- 배경:
-- 1. PersonalLog의 TOP DESTINATIONS 카드가 r.to_loc 필드를 읽는데
--    rides 테이블에 해당 컬럼이 없어 영영 빈 상태로 표시됨
-- 2. 사용자가 시작 시 선택한 헬멧 거점 + 반납 시 인증한 거점이 어디에도
--    저장되지 않아 B2G 분석/개인 사이클 추적 모두 불가
--
-- 조치:
-- - rides.to_loc_text: 검색바에서 선택한 목적지 텍스트 (예: "단국대 공학관")
-- - rides.helmet_pickup_station_id: 시작 시 선택한 헬멧 거점 id
--   (helmet_stations.json의 id, 예: "hs-001")
-- - rides.helmet_return_station_id: 종료 후 반납 인증 거점 id
-- ============================================================

-- 1. 컬럼 추가 (모두 idempotent)
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS to_loc_text                 text;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS helmet_pickup_station_id    text;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS helmet_return_station_id    text;

-- 2. 분석 쿼리 가속용 인덱스 (TOP DESTINATIONS / 거점 사용 패턴)
CREATE INDEX IF NOT EXISTS idx_rides_to_loc_text
  ON public.rides(to_loc_text)
  WHERE to_loc_text IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rides_helmet_pickup_station
  ON public.rides(helmet_pickup_station_id)
  WHERE helmet_pickup_station_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rides_helmet_return_station
  ON public.rides(helmet_return_station_id)
  WHERE helmet_return_station_id IS NOT NULL;

-- ============================================================
-- 실행 방법:
-- Supabase Dashboard → SQL Editor에서 이 파일 내용을 실행하세요.
-- 모든 구문이 idempotent하므로 재실행해도 안전합니다.
--
-- 검증 쿼리:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='rides'
--      AND column_name IN ('to_loc_text','helmet_pickup_station_id',
--                          'helmet_return_station_id');
--   → 3행 반환 시 적용 완료
-- ============================================================
