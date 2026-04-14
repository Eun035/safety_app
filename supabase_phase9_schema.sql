-- Phase 9: AI 네비게이션 및 마일리지 시스템을 위한 스키마 확장
-- Supabase SQL Editor에서 실행하세요.

-- 1. rides 테이블에 주행 성능 데이터 필드 추가
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS avg_speed FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_speed FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS stability_score INTEGER DEFAULT 100; -- 0~100 (안정성 수치)

-- 2. profiles 테이블에 마일리지 필드 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS mileage INTEGER DEFAULT 0;

-- 3. 안전 주행 마일리지 지급 함수 (예시)
-- 실제 로직은 앱 서버 또는 Edge Function에서 처리하는 것이 좋으나, 스키마 구조상 확인용입니다.
COMMENT ON COLUMN rides.is_safe_ride IS '과속 여부 및 안정도 분석을 통한 안전 주행 판정';
