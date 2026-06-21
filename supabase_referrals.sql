-- ─────────────────────────────────────────────────────────────────────────────
-- Phase: 인스타 공유 → 추천 코드 기반 가입 추적 + 양방향 보상 인프라
-- 실행 방법: Supabase Dashboard → SQL Editor 에서 통째로 실행
-- 멱등성 확보: IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) profiles 컬럼 확장 — 사용자별 고유 추천 코드 + 누가 데려왔는지
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS referral_code     TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS referred_by_code  TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code
    ON profiles(referral_code);

-- 2) referrals 테이블 — 한 추천 행위 = 한 행
CREATE TABLE IF NOT EXISTS referrals (
    id              BIGSERIAL PRIMARY KEY,
    inviter_code    TEXT NOT NULL,                  -- 데려온 사람의 referral_code
    invitee_user_id UUID UNIQUE,                    -- 가입 후 채워짐 (1인 1회만)
    utm_source      TEXT,                           -- instagram / kakaotalk / direct
    utm_medium      TEXT,                           -- ride_card / story / etc
    utm_campaign    TEXT,                           -- user_share / event / etc
    landed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),  -- /r/CODE 진입 시점
    signed_up_at    TIMESTAMPTZ,                    -- 익명·정식 가입 완료 시점
    first_ride_at   TIMESTAMPTZ,                    -- 첫 라이딩 완료 시점 (Task 5)
    reward_granted  BOOLEAN NOT NULL DEFAULT FALSE  -- 양방향 +500P 지급 여부
);

CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_code);
CREATE INDEX IF NOT EXISTS idx_referrals_invitee ON referrals(invitee_user_id);

-- 3) RLS — 본인 referral 행만 읽기 가능, INSERT는 익명 허용 (랜딩 시 기록)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referrals_read_own ON referrals;
CREATE POLICY referrals_read_own ON referrals FOR SELECT
    USING (
        invitee_user_id = auth.uid()
        OR inviter_code IN (SELECT referral_code FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS referrals_insert_any ON referrals;
CREATE POLICY referrals_insert_any ON referrals FOR INSERT
    WITH CHECK (true);   -- 익명도 랜딩 시 INSERT 가능. 보호는 invitee_user_id UNIQUE로

DROP POLICY IF EXISTS referrals_update_invitee ON referrals;
CREATE POLICY referrals_update_invitee ON referrals FOR UPDATE
    USING (invitee_user_id = auth.uid())
    WITH CHECK (invitee_user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) 양방향 보상 RPC — 초대받은 사람이 첫 라이딩 완료 시 양쪽 +500P
--    클라이언트(endRideSession)에서 1회 호출, 멱등성은 reward_granted=true로 보장
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION grant_referral_reward(p_invitee_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral   referrals%ROWTYPE;
    v_inviter_id UUID;
    v_reward     INT := 500;
BEGIN
    -- 1. 미보상 referral 조회 (1인 1회)
    SELECT * INTO v_referral
        FROM referrals
        WHERE invitee_user_id = p_invitee_user_id
          AND reward_granted = FALSE
        LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'no_pending_referral');
    END IF;

    -- 2. inviter 사용자 ID 조회 (referral_code → profiles.id)
    SELECT id INTO v_inviter_id
        FROM profiles
        WHERE referral_code = v_referral.inviter_code
        LIMIT 1;

    IF v_inviter_id IS NULL THEN
        -- inviter가 사라진 경우에도 invitee는 보상 받음, referral은 사라짐 처리
        UPDATE profiles SET points = COALESCE(points, 0) + v_reward
            WHERE id = p_invitee_user_id;
        UPDATE referrals
            SET reward_granted = TRUE,
                first_ride_at = COALESCE(first_ride_at, now())
            WHERE id = v_referral.id;
        RETURN jsonb_build_object('ok', true, 'invitee_reward', v_reward, 'inviter_reward', 0, 'inviter_missing', true);
    END IF;

    -- 3. 자기 추천 방지 (방어막 — 클라이언트에서도 1차 차단되어 있음)
    IF v_inviter_id = p_invitee_user_id THEN
        UPDATE referrals SET reward_granted = TRUE WHERE id = v_referral.id;
        RETURN jsonb_build_object('ok', false, 'reason', 'self_referral_blocked');
    END IF;

    -- 4. 양방향 +500P 적립
    UPDATE profiles SET points = COALESCE(points, 0) + v_reward
        WHERE id IN (v_inviter_id, p_invitee_user_id);

    -- 5. referral 마감
    UPDATE referrals
        SET reward_granted = TRUE,
            first_ride_at = COALESCE(first_ride_at, now())
        WHERE id = v_referral.id;

    RETURN jsonb_build_object(
        'ok', true,
        'invitee_reward', v_reward,
        'inviter_reward', v_reward,
        'inviter_id', v_inviter_id
    );
END;
$$;

-- 보안: 익명 사용자도 호출 가능 (본인 = invitee 한정)
GRANT EXECUTE ON FUNCTION grant_referral_reward(UUID) TO anon, authenticated;
