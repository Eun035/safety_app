-- feedbacks 공개 조회 정책 제거.
--
-- 20260829123930에서 테이블을 복구할 때 Phase 19 원본 SQL의 정책을 그대로
-- 가져왔는데, 그 정책은 주석("관리자/조회용으로만 SELECT 허용")과 달리
-- USING (true) + anon GRANT라 누구나 전체 피드백을 읽을 수 있었다.
--
-- feedbacks.comments에는 사용자가 직접 쓴 탈퇴 사유가 들어간다. 자유 서술이라
-- 개인적인 내용이 담길 수 있고, 앱은 이 테이블에 쓰기만 하고 읽지 않는다
-- (AccountDeletionModal의 INSERT가 유일한 사용처).
-- 따라서 클라이언트 조회 경로를 닫는다. 운영자는 service_role로 조회한다.

DROP POLICY IF EXISTS "Allow anonymous read to feedbacks" ON public.feedbacks;

REVOKE SELECT ON public.feedbacks FROM anon;
REVOKE SELECT ON public.feedbacks FROM authenticated;

-- INSERT는 그대로 유지 — 탈퇴 직전 익명 상태에서도 사유를 남길 수 있어야 한다.
