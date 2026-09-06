-- 서버 기준 관리자 역할 도입.
--
-- 지금까지 관리자 판별은 UserProfileSheet.jsx에서 prompt() 결과를 "admin1234"와
-- 비교하는 클라이언트 코드였다. 번들만 열면 보이고, 무엇보다 서버가 관리자 여부를
-- 전혀 모르므로 RLS 판단에 쓸 수 없었다.
--
-- 관리자 표시를 profiles의 컬럼(is_admin)으로 두지 않는 이유:
--   현재 "Users can update own profile" 정책이 본인 행의 *모든 컬럼*을 허용한다.
--   is_admin이 profiles에 있으면 사용자가 PATCH /profiles?id=eq.<자기id> 한 번으로
--   스스로를 관리자로 승격시킬 수 있다. 그래서 클라이언트 GRANT가 전혀 없는
--   별도 테이블로 분리한다.
--
-- 이후 모든 정책은 public.is_admin() 하나만 참조한다. 관리자 신원을 부여하는
-- 방식(이메일 로그인 / 익명 uid 수동 등록 등)을 나중에 바꿔도 정책은 그대로 쓴다.

CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    note       text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 정책을 하나도 만들지 않는다 = 클라이언트 역할로는 읽기·쓰기 모두 불가.
-- 관리자 등록/해제는 service_role(Supabase 대시보드 SQL 편집기)로만 한다.
REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated;
GRANT ALL ON TABLE public.admin_users TO service_role;


-- RLS 재귀 회피용 헬퍼.
--
-- ⚠️ 정책 안에서 대상 테이블을 다시 SELECT하면 그 SELECT가 또 정책을 평가해
--    무한 재귀(42P17)가 난다. SECURITY DEFINER 함수는 소유자 권한으로 실행되어
--    RLS를 우회하므로 재귀가 끊긴다.
-- ⚠️ 그래서 이 함수를 admin_users 자신의 정책에는 절대 쓰지 않는다
--    (위에서 admin_users에 정책을 아예 만들지 않은 이유이기도 하다).
-- ⚠️ search_path 고정은 필수다. 미고정 SECURITY DEFINER 함수는 검색경로
--    하이재킹 표적이 된다.
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT uid IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = uid);
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

COMMENT ON TABLE public.admin_users IS
    '관리자 명단. 클라이언트 GRANT 없음 — service_role로만 등록/해제한다.';
COMMENT ON FUNCTION public.is_admin(uuid) IS
    'RLS 정책에서 쓰는 관리자 판별. SECURITY DEFINER라 profiles 정책 안에서 호출해도 재귀하지 않는다.';

-- 초기 관리자 등록은 마이그레이션에 넣지 않는다(환경마다 uid가 다르다).
-- Supabase 대시보드에서 관리자 계정을 만든 뒤 SQL 편집기에서:
--   INSERT INTO public.admin_users (user_id, note)
--   VALUES ('<관리자-계정-uid>', 'C-Safe 운영자')
--   ON CONFLICT DO NOTHING;
