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
    -- 본인이 이미 소유한 행 OR 아직 주인 없는(NULL) landing 행을 클레임 가능.
    -- WITH CHECK가 invitee_user_id를 반드시 본인 uid로만 채우게 강제하므로,
    -- 남의 landing 행을 가로채 다른 사람 id를 넣는 것은 차단된다.
    USING (invitee_user_id = auth.uid() OR invitee_user_id IS NULL)
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
    v_inviter_code TEXT;
    v_inviter_id   UUID;
    v_referral_id  BIGINT;
    v_already      BOOLEAN;
    v_reward       INT := 500;
BEGIN
    -- 1. 누가 이 invitee를 데려왔는지 = profiles.referred_by_code (신뢰 소스).
    --    클라이언트가 referrals.invitee_user_id 링크에 실패해도 profiles 링크는 성공하므로
    --    여기를 기준으로 삼는다.
    SELECT referred_by_code INTO v_inviter_code
        FROM profiles
        WHERE id = p_invitee_user_id;

    IF v_inviter_code IS NULL OR v_inviter_code = '' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'no_referrer');
    END IF;

    -- 2. inviter 사용자 ID 조회 (referral_code → profiles.id)
    SELECT id INTO v_inviter_id
        FROM profiles
        WHERE referral_code = v_inviter_code
        LIMIT 1;

    -- 3. 자기 추천 방지
    IF v_inviter_id = p_invitee_user_id THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'self_referral_blocked');
    END IF;

    -- 4. referral 행 확보 (멱등성 앵커).
    --    (a) 이미 invitee로 링크된 행이 있으면 그것,
    --    (b) 없으면 같은 inviter_code의 미청구 landing 행을 이 invitee로 청구,
    --    (c) 그래도 없으면 새로 INSERT (직접 링크 유입 등).
    SELECT id INTO v_referral_id
        FROM referrals
        WHERE invitee_user_id = p_invitee_user_id
        LIMIT 1;

    IF v_referral_id IS NULL THEN
        UPDATE referrals
            SET invitee_user_id = p_invitee_user_id,
                signed_up_at    = COALESCE(signed_up_at, now())
            WHERE id = (
                SELECT id FROM referrals
                    WHERE inviter_code = v_inviter_code
                      AND invitee_user_id IS NULL
                    ORDER BY landed_at DESC
                    LIMIT 1
            )
            RETURNING id INTO v_referral_id;
    END IF;

    IF v_referral_id IS NULL THEN
        INSERT INTO referrals (inviter_code, invitee_user_id, signed_up_at)
            VALUES (v_inviter_code, p_invitee_user_id, now())
            RETURNING id INTO v_referral_id;
    END IF;

    -- 5. 멱등성 — 이미 보상 지급됐으면 재지급 금지
    SELECT reward_granted INTO v_already FROM referrals WHERE id = v_referral_id;
    IF v_already THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'already_rewarded');
    END IF;

    -- 6. 보상 지급
    IF v_inviter_id IS NULL THEN
        -- inviter가 사라진 경우: invitee만 보상
        UPDATE profiles SET points = COALESCE(points, 0) + v_reward
            WHERE id = p_invitee_user_id;
        UPDATE referrals
            SET reward_granted = TRUE,
                first_ride_at  = COALESCE(first_ride_at, now())
            WHERE id = v_referral_id;
        RETURN jsonb_build_object('ok', true, 'invitee_reward', v_reward, 'inviter_reward', 0, 'inviter_missing', true);
    END IF;

    -- 양방향 +500P
    UPDATE profiles SET points = COALESCE(points, 0) + v_reward
        WHERE id IN (v_inviter_id, p_invitee_user_id);

    UPDATE referrals
        SET reward_granted = TRUE,
            first_ride_at  = COALESCE(first_ride_at, now())
        WHERE id = v_referral_id;

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
