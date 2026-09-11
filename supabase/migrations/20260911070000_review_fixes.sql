-- 세션 자체 리뷰에서 발견한 결함 수정 (2026-09-11)
--
-- ① adjust_safety_score: safety_score_logs.reason은 NOT NULL인데 RPC는 reason_in을
--    DEFAULT NULL로 받는다. reason 없이 호출되면 INSERT가 NOT NULL 위반 → 트랜잭션
--    전체(점수 UPDATE 포함) 롤백. COALESCE로 방어한다.
-- ② hazards.hidden 소프트 삭제가 get_nearby_hazards에서만 적용되고 공개 SELECT
--    정책은 USING(true)라, 숨긴 제보가 직접 select/realtime로 여전히 노출됐다.
--    SELECT 정책을 hidden=false(+관리자)로 좁혀 서버에서 강제한다.

-- ── ① adjust_safety_score reason NULL 방어 ───────────────────────────────
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

    IF delta_in IS NULL OR abs(delta_in) > 100 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'delta_out_of_range');
    END IF;

    SELECT COALESCE(safety_score, 80) INTO v_old FROM profiles WHERE id = v_uid;
    IF v_old IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'no_profile');
    END IF;

    v_new     := greatest(0, least(100, v_old + delta_in));
    v_applied := v_new - v_old;

    IF v_applied <> 0 THEN
        PERFORM set_config('app.points_write', '1', true);
        UPDATE profiles SET safety_score = v_new WHERE id = v_uid;
        -- reason은 NOT NULL 컬럼 → NULL이면 기본 사유로 대체
        INSERT INTO safety_score_logs (user_id, change_amount, reason)
            VALUES (v_uid, v_applied, COALESCE(reason_in, 'adjust'));
    END IF;

    RETURN jsonb_build_object('ok', true, 'old', v_old, 'new', v_new, 'applied', v_applied);
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_safety_score(int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_safety_score(int, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.adjust_safety_score(int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_safety_score(int, text) TO service_role;

-- ── ② hazards 공개 SELECT: 숨김 서버 강제 ─────────────────────────────────
-- 정책을 둘로 분리한다. is_admin()은 anon에 EXECUTE 권한이 없으므로(관리자 열거
-- 방지), 단일 정책에서 호출하면 anon의 hazards 조회가 permission denied로 터진다.
--   · 공개 정책: 모두에게 hidden=false만 노출 (is_admin 미호출 → anon 안전)
--   · 관리자 정책: authenticated 한정으로 숨김 포함 전체 (RLS는 OR 결합)
DROP POLICY IF EXISTS "Hazards are viewable by everyone" ON public.hazards;
CREATE POLICY "Hazards are viewable by everyone" ON public.hazards
    FOR SELECT
    USING (hidden = false);

DROP POLICY IF EXISTS "Admins can view hidden hazards" ON public.hazards;
CREATE POLICY "Admins can view hidden hazards" ON public.hazards
    FOR SELECT
    TO authenticated
    USING (public.is_admin());
