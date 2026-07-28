-- Phase 46: Rides & Ride Paths 보안 강화를 위한 RLS 정책 (Row Level Security)
-- Supabase SQL Editor에서 실행하여 보안 설정을 활성화하고 정책을 적용하세요.

-- ======================================================
-- 1. Rides (주행 요약 로그) 테이블 RLS 정책 설정
-- ======================================================

-- RLS 활성화 (혹시 꺼져있을 경우를 대비)
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- 기존 유사 정책들 모두 초기화 (중복 방지)
DROP POLICY IF EXISTS "Users can view own rides." ON public.rides;
DROP POLICY IF EXISTS "Users can view their own rides" ON public.rides;
DROP POLICY IF EXISTS "Admins or owners can view rides" ON public.rides;
DROP POLICY IF EXISTS "Users can insert own rides." ON public.rides;
DROP POLICY IF EXISTS "Users can insert their own rides" ON public.rides;
DROP POLICY IF EXISTS "Users can update own rides." ON public.rides;
DROP POLICY IF EXISTS "Users can update own rides" ON public.rides;

-- [보안 정책 A-1] 조회(SELECT): 오직 주행 기록을 생성한 본인 또는 최고 관리자(service_role)만 조회 가능
CREATE POLICY "Admins or owners can view rides" 
ON public.rides FOR SELECT 
USING (
  auth.uid() = user_id 
  OR auth.jwt() ->> 'role' = 'service_role'
);

-- [보안 정책 A-2] 삽입(INSERT): 오직 인증된 사용자 본인의 ID로만 주행 기록 추가 가능
CREATE POLICY "Users can insert own rides" 
ON public.rides FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);

-- [보안 정책 A-3] 수정(UPDATE): 주행 완료 시(거리, 시간 정산 등) 본인의 주행 로그만 수정 가능
CREATE POLICY "Users can update own rides" 
ON public.rides FOR UPDATE 
USING (
  auth.uid() = user_id
);


-- ======================================================
-- 2. Ride Paths (상세 주행 경로) 테이블 RLS 정책 설정
-- ======================================================

-- RLS 활성화
ALTER TABLE public.ride_paths ENABLE ROW LEVEL SECURITY;

-- 기존 유사 정책들 초기화 (중복 방지)
DROP POLICY IF EXISTS "Users can insert their own ride paths" ON public.ride_paths;
DROP POLICY IF EXISTS "Users can insert own ride paths" ON public.ride_paths;
DROP POLICY IF EXISTS "Admins or owners can view ride paths" ON public.ride_paths;
DROP POLICY IF EXISTS "Users can view their own ride paths" ON public.ride_paths;

-- [보안 정책 B-1] 조회(SELECT): 연결된 주행 기록(rides)의 소유주가 본인이거나 최고 관리자(service_role)인 경우에만 경로 상세 조회 가능
CREATE POLICY "Admins or owners can view ride paths" 
ON public.ride_paths FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rides 
    WHERE rides.id = ride_paths.ride_id 
    AND (rides.user_id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role')
  )
);

-- [보안 정책 B-2] 삽입(INSERT): 본인이 소유한 주행 기록(rides)에 대해서만 정밀 이동 경로 추가 가능 (타인 경로 위조 방지)
CREATE POLICY "Users can insert own ride paths" 
ON public.ride_paths FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rides 
    WHERE rides.id = ride_paths.ride_id 
    AND rides.user_id = auth.uid()
  )
);
