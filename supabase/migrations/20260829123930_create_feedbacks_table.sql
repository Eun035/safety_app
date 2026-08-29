-- feedbacks 테이블 — 운영 DB 누락분 복구.
--
-- Phase 19에서 정의됐으나(20260728120013) 운영에는 실제로 생성된 적이 없어,
-- AccountDeletionModal의 탈퇴 사유 INSERT가 계속 실패하고 있었다.
-- (앱은 실패 시 토스트로 알리고 탈퇴 자체는 계속 진행하도록 되어 있음)
--
-- 앱이 기대하는 스키마: rating(1~5, NOT NULL) / tags TEXT[] / comments TEXT

CREATE TABLE IF NOT EXISTS public.feedbacks (
    -- uuid_generate_v4()는 uuid-ossp가 extensions 스키마에 있어 search_path에 안 잡힘.
    -- gen_random_uuid()는 PG13+ 내장이라 확장 의존이 없다.
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    tags TEXT[] DEFAULT '{}',
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- 익명 사용자도 피드백을 남길 수 있어야 한다(탈퇴 직전 흐름 포함)
DROP POLICY IF EXISTS "Allow anonymous inserts to feedbacks" ON public.feedbacks;
CREATE POLICY "Allow anonymous inserts to feedbacks" ON public.feedbacks
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous read to feedbacks" ON public.feedbacks;
CREATE POLICY "Allow anonymous read to feedbacks" ON public.feedbacks
    FOR SELECT
    USING (true);

GRANT SELECT, INSERT ON public.feedbacks TO anon;
GRANT SELECT, INSERT ON public.feedbacks TO authenticated;
GRANT ALL ON public.feedbacks TO service_role;
