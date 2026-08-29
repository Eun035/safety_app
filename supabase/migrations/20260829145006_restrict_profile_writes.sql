-- profiles 쓰기 권한을 본인 행으로 제한.
--
-- 기존 정책 "Enable update for all"은 USING (true)라, anon GRANT와 합쳐져
-- 누구나 임의의 프로필을 수정할 수 있었다. 로컬에서 실제로 확인한 결과
-- 사용자 A의 토큰으로 사용자 B의 points를 999999로, nickname을 임의 값으로
-- 바꿀 수 있었다(HTTP 204). points는 추천·주차 보상의 재화이므로
-- 보상 체계 전체가 무의미해지는 상태였다.
--
-- 앱의 profiles 쓰기는 전부 본인 id 기준이므로(App.jsx/useUserStore/useRideSession)
-- 아래 제한으로 정상 동작에는 영향이 없다.
-- 보상 지급 RPC grant_referral_reward는 SECURITY DEFINER라 RLS를 우회하므로
-- 추천 보상도 그대로 동작한다.
--
-- ※ SELECT는 이번 범위에서 건드리지 않는다. AdminDashboard가 전체 프로필을
--    읽고 있어 함께 조이면 대시보드가 멈춘다. 관리자 역할을 DB에 도입하는
--    별도 작업으로 다뤄야 한다.

DROP POLICY IF EXISTS "Enable update for all" ON public.profiles;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- INSERT도 본인 행만. "Users can insert their own profile"(auth.uid() = id)이
-- 이미 있으므로 무제한 정책만 제거한다.
DROP POLICY IF EXISTS "Enable insert for all" ON public.profiles;
