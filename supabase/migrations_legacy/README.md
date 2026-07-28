# migrations_legacy — 수작업 마이그레이션 보관소 (더 이상 CLI가 적용하지 않음)

이 폴더의 SQL은 Supabase CLI 도입 **이전에 손으로 작성·적용**하던 마이그레이션입니다.
**운영(클라우드) DB에는 이미 전부 적용**되어 있고, 이제는 **`supabase db pull`로 뽑은 baseline
마이그레이션**(`../migrations/<timestamp>_remote_schema.sql`)이 이들을 대체합니다.

## 왜 여기로 옮겼나
- CLI의 `supabase/migrations/`는 `<timestamp>_name.sql` 형식만 순서대로 관리합니다.
- 비-timestamp 파일이 섞이면 `supabase db reset` / `db push`가 깨집니다.
- 그래서 원본은 **이력 참고용**으로만 이 폴더에 보관합니다. (CLI는 이 폴더를 무시)

## 적용 순서(참고 — 알파벳순 아님, 의존성 순)
```
supabase_schema (hazards)
→ phase8 (profiles, rides) → phase9 → p0_1 → p3
→ near_miss_events → p0_2(zone_events) → safety_path_schema
→ p1_1(rides_daily 뷰) → p2_a → p4(postgis 재작성)
→ phase10_rls → phase19_feedbacks → rls_security_update(최종)
→ supabase_referrals (추천기능)
```

## 주의
- **여기 파일을 직접 편집해도 아무 효과 없음.** 스키마를 바꾸려면:
  `npm run db:new <이름>` → 새 마이그레이션 작성 → `npm run db:reset`(로컬 검증) → `npm run db:push`(운영 반영).
- 오프라인 백업 스택(`infra/supabase/`)의 마이그레이터는 여전히 이 폴더를 사용합니다.
