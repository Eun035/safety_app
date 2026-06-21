-- Phase 19: Feedback Survey Table
-- Supabase SQL Editor에서 실행하여 새로운 feedbacks 테이블을 구축합니다.

CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    tags TEXT[] DEFAULT '{}',
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) 설정
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- 누구나 피드백을 남길 수 있도록 (INSERT 허용)
CREATE POLICY "Allow anonymous inserts to feedbacks" ON public.feedbacks
    FOR INSERT 
    WITH CHECK (true);

-- 관리자/조회용으로만 SELECT 허용 (이 앱에서는 쓰기만 허용)
CREATE POLICY "Allow anonymous read to feedbacks" ON public.feedbacks
    FOR SELECT 
    USING (true);
