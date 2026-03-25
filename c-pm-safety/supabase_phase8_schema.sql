-- Phase 8: 사용자 체계 및 데이터 축적을 위한 스키마 확장
-- Supabase SQL Editor에서 실행하세요.

-- 1. 사용자 프로필 테이블 (기본 정보 및 안전 점수)
-- Supabase Auth의 users 테이블과 연동할 수 있는 구조입니다.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  safety_score INTEGER DEFAULT 80, -- 기본 안전 점수 80점
  total_distance FLOAT DEFAULT 0,  -- 누적 주행 거리 (km)
  points INTEGER DEFAULT 0,        -- 누적 보상 포인트
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 주행 로그 테이블 (따릉이/PM 이용 내역)
CREATE TABLE IF NOT EXISTS rides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  start_loc_lat FLOAT NOT NULL,
  start_loc_lng FLOAT NOT NULL,
  end_loc_lat FLOAT,
  end_loc_lng FLOAT,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  distance FLOAT DEFAULT 0,
  hazards_passed INTEGER DEFAULT 0, -- 주행 중 통과한 위험 지역 수
  is_safe_ride BOOLEAN DEFAULT true -- 사고 없이 안전하게 주행했는지 여부
);

-- 3. 안전 점수 변동 이력
CREATE TABLE IF NOT EXISTS safety_score_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  change_amount INTEGER NOT NULL,
  reason TEXT NOT NULL, -- 'QUIZ_SUCCESS', 'HAZARD_REPORT', 'SAFE_RIDE_COMPLETED' 등
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE rides;

-- RLS 설정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_score_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view their own rides" ON rides FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rides" ON rides FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own score logs" ON safety_score_logs FOR SELECT USING (auth.uid() = user_id);
