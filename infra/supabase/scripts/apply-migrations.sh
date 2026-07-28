#!/usr/bin/env bash
# C-Safe 로컬 셀프호스팅 Supabase — 마이그레이션 순서 적용 스크립트
# db-migrator 컨테이너에서 실행된다. db/auth healthy 이후 호출됨(compose depends_on).
set -euo pipefail

MIG=/migrations
EXTRA=/extra

psql_run() {
  echo "[migrator] ▶ apply: $(basename "$1")"
  psql -v ON_ERROR_STOP=1 -f "$1"
}

# ── 멱등성 가드 ────────────────────────────────────────────────
# 이미 적용된 DB(rides 테이블 존재)면 재적용을 건너뛴다. 일부 마이그레이션이
# CREATE TABLE(IF NOT EXISTS 아님)이라 재실행 시 에러가 나기 때문.
# 완전 재적용을 원하면: docker compose down -v 후 up.
ALREADY=$(psql -tA -c "select (to_regclass('public.rides') is not null);" | tr -d '[:space:]')
if [ "${ALREADY}" = "t" ]; then
  echo "[migrator] ✅ 이미 적용됨(rides 존재) — 건너뜀. 재적용하려면 'docker compose down -v'."
  exit 0
fi

echo "[migrator] === 확장(extension) 생성 ==="
psql -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS postgis;'

echo "[migrator] === 마이그레이션 적용(의존성 순서) ==="
# 순서 근거: profiles/rides(phase8) → 컬럼 ALTER(phase9/p0_1/p3) →
# near_miss/zone/paths → 집계뷰(p1_1은 p0_1 컬럼 필요) → 정책효과(p2_a) →
# postgis 리라이트(p4) → RLS(phase10/phase19) → 최종 RLS(rls_security_update).
psql_run "$MIG/supabase_schema.sql"                         # hazards
psql_run "$MIG/supabase_phase8_schema.sql"                  # profiles, rides, safety_score_logs
psql_run "$MIG/supabase_phase9_schema.sql"                  # ALTER rides/profiles
psql_run "$MIG/supabase_p0_1_rides_extension.sql"           # ALTER rides (top_speed 등)
psql_run "$MIG/supabase_p3_rides_destination_helmet_station.sql"  # ALTER rides
psql_run "$MIG/supabase_near_miss_events.sql"               # near_miss_events (+cluster v1)
psql_run "$MIG/supabase_p0_2_zone_events.sql"               # zone_events (+get_rsr_by_zone)
psql_run "$MIG/supabase_safety_path_schema.sql"             # ride_paths, safety_grid_scores
psql_run "$MIG/supabase_p1_1_rides_daily.sql"               # matview rides_daily (p0_1 컬럼 필요)
psql_run "$MIG/supabase_p2_a_hazard_policy_effect.sql"      # get_hazard_policy_effect
psql_run "$MIG/supabase_p4_nearmiss_geography_heatmap.sql"  # postgis, cluster v2
psql_run "$MIG/supabase_phase10_rls.sql"                    # RLS profiles/rides/hazards
psql_run "$MIG/supabase_phase19_feedbacks.sql"             # feedbacks (uuid-ossp)
psql_run "$MIG/supabase_rls_security_update.sql"            # 최종 RLS (rides/ride_paths)

# ── 추천 기능(있으면) ──────────────────────────────────────────
if [ -f "$EXTRA/supabase_referrals.sql" ]; then
  echo "[migrator] === 추천(referrals) 적용 ==="
  psql_run "$EXTRA/supabase_referrals.sql"
fi

# ── 시드(선택) ────────────────────────────────────────────────
if [ -f "$EXTRA/seed_p4_near_miss_mock.sql" ]; then
  echo "[migrator] === near-miss 목업 시드 적용(선택) ==="
  psql_run "$EXTRA/seed_p4_near_miss_mock.sql" || echo "[migrator] (시드 실패 무시)"
fi

echo "[migrator] ✅ 전체 마이그레이션 적용 완료."
