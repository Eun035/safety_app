-- profiles 읽기를 본인 행으로 제한.
--
-- "Enable read access for all"이 USING (true)라, anon 키(클라이언트 번들에 공개)만
-- 있으면 전 사용자의 nickname·age·profile_image·points·safety_score·referral_code를
-- 페이지네이션으로 전부 덤프할 수 있었다. 게다가 profiles는 supabase_realtime
-- 퍼블리케이션에 포함돼 있어, SELECT가 열려 있는 한 타인 프로필의 변경을
-- 실시간 스트림으로 관전하는 것도 가능했다.
--
-- 20260829145006에서 쓰기는 본인 행으로 막았지만 읽기는 남겨뒀다. AdminDashboard가
-- 전체 프로필을 읽고 있어 함께 조이면 대시보드가 멈추기 때문이었고, 그 파일 주석에
-- "관리자 역할을 DB에 도입하는 별도 작업"으로 미뤄뒀다. 이제 is_admin()이 생겼으므로
-- 마무리한다.
--
-- 앱 영향: 타인 프로필을 읽는 화면은 없다(랭킹·리더보드 미구현). 전체 읽기를 쓰던
-- 유일한 곳이 AdminDashboard의 통계 2건이며, 아래 집계 RPC로 대체한다.
-- profiles realtime 구독도 앱에서 쓰지 않는다(채널 3개는 각각 safety_grid_scores /
-- near_miss_events / hazards 대상).

DROP POLICY IF EXISTS "Enable read access for all" ON public.profiles;
-- "Users can view their own profile" (auth.uid() = id) 은 그대로 둔다.


-- ── 관리자 집계 RPC ─────────────────────────────────────────────────────
--
-- 개별 행을 반환하지 않는다. 관리자에게도 원본 프로필은 주지 않는다(최소 권한).
-- 대시보드가 필요로 하는 것은 사용자 수와 평균값뿐이다.
CREATE OR REPLACE FUNCTION public.get_admin_profile_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin only' USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'user_count',       count(*),
        'points_total',     COALESCE(sum(points), 0),
        'avg_safety_score', COALESCE(round(avg(NULLIF(safety_score, 0))::numeric, 1), 0)
    )
      INTO result
      FROM public.profiles;

    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_profile_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_profile_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_profile_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_profile_stats() TO service_role;

COMMENT ON FUNCTION public.get_admin_profile_stats() IS
    '관리자 대시보드용 profiles 집계. 개별 행은 반환하지 않는다.';


-- ── 대시보드가 읽는 나머지 테이블에 관리자 예외 추가 ────────────────────
--
-- profiles만 집계 RPC로 가는 이유: PII 밀도가 가장 높고 필요한 게 집계 2개뿐이다.
-- 아래 테이블들은 대시보드가 여러 형태로 조회하므로 정책에 관리자 예외를 얹는다.

DROP POLICY IF EXISTS "Admins or owners can view rides" ON public.rides;
CREATE POLICY "Admins or owners can view rides" ON public.rides
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins or owners can view ride paths" ON public.ride_paths;
CREATE POLICY "Admins or owners can view ride paths" ON public.ride_paths
    FOR SELECT
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.rides
             WHERE rides.id = ride_paths.ride_id
               AND rides.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view own near miss events" ON public.near_miss_events;
CREATE POLICY "Users can view own near miss events" ON public.near_miss_events
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can view own zone events" ON public.zone_events;
CREATE POLICY "Users can view own zone events" ON public.zone_events
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());


-- rides_daily 집계 뷰: 읽기만 필요한데 anon/authenticated에 쓰기 권한까지 있었다.
REVOKE INSERT, UPDATE, DELETE ON public.rides_daily FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.rides_daily FROM authenticated;
