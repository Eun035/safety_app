-- Phase 10: Security Hardening (RLS 강화)
-- 악의적인 스크래핑 및 데이터 변조(어뷰징) 방지

-- 1. Profiles 테이블 권한 통제
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 누구나 프로필을 읽을 수는 있지만(랭킹 등)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.profiles FOR SELECT USING (true);

-- 자기 자신의 프로필만 수정 가능 (마일리지 클라이언트 임의 수정 방지)
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. Rides (주행 기록) 테이블 권한 통제
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- 오직 자기 자신의 주행 기록만 조회 가능 (프라이버시 및 데이터 스크래핑 방지)
DROP POLICY IF EXISTS "Users can view own rides." ON public.rides;
CREATE POLICY "Users can view own rides." 
ON public.rides FOR SELECT 
USING (auth.uid() = user_id);

-- 오직 자기 자신의 주행 기록만 생성 가능
DROP POLICY IF EXISTS "Users can insert own rides." ON public.rides;
CREATE POLICY "Users can insert own rides." 
ON public.rides FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 자기 자신의 주행 기록만 업데이트 가능 (종료 시)
DROP POLICY IF EXISTS "Users can update own rides." ON public.rides;
CREATE POLICY "Users can update own rides." 
ON public.rides FOR UPDATE 
USING (auth.uid() = user_id);

-- 3. Hazards (위험 제보) 테이블 권한 통제
ALTER TABLE public.hazards ENABLE ROW LEVEL SECURITY;

-- 위험 제보는 지도 렌더링을 위해 누구나 조회 가능
DROP POLICY IF EXISTS "Hazards are viewable by everyone." ON public.hazards;
CREATE POLICY "Hazards are viewable by everyone." 
ON public.hazards FOR SELECT USING (true);

-- 위험 제보는 '인증된 사용자'만 생성 가능 (어뷰징, 스팸 방지)
DROP POLICY IF EXISTS "Authenticated users can create hazards." ON public.hazards;
CREATE POLICY "Authenticated users can create hazards." 
ON public.hazards FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
