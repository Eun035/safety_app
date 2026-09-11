-- 포인트 위·변조 봉인 (2/2): profiles.points/total_distance 직접 UPDATE 차단
--
-- ⚠️ 배포 순서 (2단계): 이 마이그레이션은 1/2(_points_award_rpc)와 신규 프론트를
--    먼저 배포하고, 브라우저에 남은 구 프론트 세션이 드레인된 뒤에 push 한다.
--    (구 세션은 profiles를 직접 UPDATE하므로 트리거를 먼저 켜면 적립이 403으로 죽는다.)
--    로컬 db:reset은 1/2+2/2를 함께 적용해 최종 상태를 검증한다.
--
-- 메커니즘: 정당한 적립 RPC(award_points / increment_user_stats /
-- grant_referral_reward)는 트랜잭션-로컬 GUC 'app.points_write'='1'을 세팅한다.
-- 이 플래그 없이 points 또는 total_distance가 바뀌면 42501(→ HTTP 403)로 거부한다.

CREATE OR REPLACE FUNCTION public.guard_points_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (NEW.points IS DISTINCT FROM OLD.points
        OR NEW.total_distance IS DISTINCT FROM OLD.total_distance)
       AND COALESCE(current_setting('app.points_write', true), '0') <> '1'
    THEN
        RAISE EXCEPTION 'points/total_distance can only change via award RPC'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

-- BEFORE UPDATE 만 → INSERT(신규 anon 생성, 게스트 승격 upsert)는 무영향.
-- IS DISTINCT FROM → points/distance 미변경 UPDATE(nickname/age/profile_image,
-- referral_code/referred_by_code)는 그대로 통과.
DROP TRIGGER IF EXISTS trg_guard_points_write ON public.profiles;
CREATE TRIGGER trg_guard_points_write
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_points_write();
