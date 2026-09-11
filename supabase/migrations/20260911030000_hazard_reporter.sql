-- 위험 제보자(reporter_id) 비공개 저장 + 제보 레이트 리밋 (2026-09-11)
--
-- 배경: hazards는 공개 SELECT이고 supabase_realtime 퍼블리케이션에 포함돼 있어
-- INSERT가 모든 클라이언트에 payload.new 전체 행으로 브로드캐스트된다. 여기에
-- reporter_id 컬럼을 두면 제보자의 (익명) uid가 그대로 노출된다(컬럼 GRANT는
-- realtime 페이로드에 적용되지 않고, 구독이 base 테이블이라 뷰로도 못 막는다).
--
-- 설계: reporter_id를 hazards에 넣지 않고 별도 비공개 테이블에 저장한다.
--   · hazard_reporters — RLS ON·클라 정책 0개·realtime 미포함 → service_role/admin 전용
--   · report_hazard() SECURITY DEFINER RPC — reporter_id=auth.uid() 서버 고정,
--     hazards INSERT + hazard_reporters 기록을 원자적으로 수행 + 제보 레이트 리밋.
--   · hazards 직접 INSERT 경로(정책·GRANT)는 제거 → 제보는 RPC로만 가능.
-- 이러면 hazards 테이블/ realtime 페이로드에는 reporter_id가 아예 없어 누출 불가.

-- ── 1) 비공개 제보자 매핑 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hazard_reporters (
    hazard_id   uuid PRIMARY KEY REFERENCES public.hazards(id) ON DELETE CASCADE,
    reporter_id uuid NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hazard_reporters_reporter
    ON public.hazard_reporters (reporter_id, created_at);

-- RLS ON + 정책 0개 + 전 롤 REVOKE → service_role(+definer 함수)만 접근.
ALTER TABLE public.hazard_reporters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hazard_reporters FROM PUBLIC;
REVOKE ALL ON public.hazard_reporters FROM anon;
REVOKE ALL ON public.hazard_reporters FROM authenticated;
GRANT ALL ON public.hazard_reporters TO service_role;
-- (supabase_realtime는 puballtables=false라 이 테이블은 realtime에 포함되지 않는다.)

-- ── 2) report_hazard RPC ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.report_hazard(
    p_title       text,
    p_lat         double precision,
    p_lng         double precision,
    p_type        text,
    p_description text DEFAULT NULL,
    p_safety_tip  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid        UUID := auth.uid();
    v_daily      INT;
    v_daily_cap  INT := 10;   -- 제보자별 24h 제보 상한
    v_id         uuid;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
    END IF;

    IF p_title IS NULL OR btrim(p_title) = ''
       OR p_lat IS NULL OR p_lng IS NULL OR p_type IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
    END IF;

    -- 레이트 리밋: 제보자별 24시간 롤링
    SELECT count(*) INTO v_daily
        FROM hazard_reporters
        WHERE reporter_id = v_uid AND created_at > now() - interval '24 hours';
    IF v_daily >= v_daily_cap THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited', 'daily', v_daily);
    END IF;

    INSERT INTO hazards (title, lat, lng, type, description, safety_tip)
        VALUES (p_title, p_lat, p_lng, p_type, p_description, p_safety_tip)
        RETURNING id INTO v_id;

    INSERT INTO hazard_reporters (hazard_id, reporter_id)
        VALUES (v_id, v_uid);

    RETURN jsonb_build_object('ok', true, 'hazard_id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.report_hazard(text, double precision, double precision, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_hazard(text, double precision, double precision, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.report_hazard(text, double precision, double precision, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_hazard(text, double precision, double precision, text, text, text) TO service_role;

-- ── 3) hazards 직접 INSERT 봉인 ───────────────────────────────────────────
-- 직접 INSERT는 reporter_id 기록·레이트 리밋을 우회하므로 막는다.
-- report_hazard()는 SECURITY DEFINER(owner=postgres)라 RLS를 우회해 계속 동작한다.
DROP POLICY IF EXISTS "Authenticated users can report hazards" ON public.hazards;
REVOKE INSERT ON public.hazards FROM anon;
REVOKE INSERT ON public.hazards FROM authenticated;
