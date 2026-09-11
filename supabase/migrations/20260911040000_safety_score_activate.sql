-- safety_score 이력 활성화 (2026-09-11)
--
-- safety_score_logs는 만들어졌으나 정책 0개·쓰기 경로 0개로 방치돼 있었다.
-- profiles.safety_score도 실제로 변경하는 코드가 없어 기본값(80)에 고정돼 있었다.
--
-- 이번에 안전점수 변동을 정식 기능으로 활성화한다:
--   · adjust_safety_score() SECURITY DEFINER RPC — 호출자 본인의 safety_score를
--     [0,100]로 클램프해 증감하고, 실제 반영된 변화량을 safety_score_logs에 기록.
--   · safety_score는 20260911010000 트리거로 봉인돼 있으므로 RPC가 app.points_write
--     플래그를 세팅해 통과한다(직접 UPDATE는 여전히 차단).
--   · safety_score_logs: 본인 이력만 SELECT(RLS), 쓰기는 RPC(definer)만.

-- ── 1) safety_score_logs 접근 정리 ────────────────────────────────────────
-- 기존 GRANT(20260829123826)는 anon/authenticated에 전체 쓰기를 열어뒀다. 회수한다.
REVOKE ALL ON public.safety_score_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.safety_score_logs FROM authenticated;
-- SELECT는 authenticated에 유지하되 RLS로 본인 행만 노출.
GRANT SELECT ON public.safety_score_logs TO authenticated;

DROP POLICY IF EXISTS "Users can view their own score logs" ON public.safety_score_logs;
CREATE POLICY "Users can view their own score logs"
    ON public.safety_score_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- ── 2) adjust_safety_score RPC ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.adjust_safety_score(
    delta_in  int,
    reason_in text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_old     INT;
    v_new     INT;
    v_applied INT;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
    END IF;

    -- 한 번의 변동 폭 제한(오남용 방지)
    IF delta_in IS NULL OR abs(delta_in) > 100 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'delta_out_of_range');
    END IF;

    SELECT COALESCE(safety_score, 80) INTO v_old FROM profiles WHERE id = v_uid;
    IF v_old IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'no_profile');
    END IF;

    v_new     := greatest(0, least(100, v_old + delta_in));
    v_applied := v_new - v_old;   -- 클램프 후 실제 반영된 변화량

    IF v_applied <> 0 THEN
        PERFORM set_config('app.points_write', '1', true);  -- safety_score 봉인 통과
        UPDATE profiles SET safety_score = v_new WHERE id = v_uid;
    END IF;

    -- 변화 이력은 0이어도 남기지 않는다(클램프로 무변동이면 로그 스킵).
    IF v_applied <> 0 THEN
        INSERT INTO safety_score_logs (user_id, change_amount, reason)
            VALUES (v_uid, v_applied, reason_in);
    END IF;

    RETURN jsonb_build_object('ok', true, 'old', v_old, 'new', v_new, 'applied', v_applied);
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_safety_score(int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_safety_score(int, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.adjust_safety_score(int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_safety_score(int, text) TO service_role;
