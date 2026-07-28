# Supabase CLI — 로컬 ↔ 운영 마이그레이션 연동

C-Safe DB는 **Supabase CLI**로 관리합니다. 로컬 개발 DB와 운영(클라우드) DB의 스키마를
**하나의 마이그레이션 이력**으로 동기화합니다.

- 로컬 스택: `npm run db:start` (Docker 필요, CLI가 자동 기동/마이그레이션 적용)
- 앱 연결: 루트 `.env.local`이 이미 로컬(`http://127.0.0.1:54321`)을 가리킴 → `npm run dev`
- 이전 수작업 SQL은 `supabase/migrations_legacy/`에 보관(운영에 이미 적용됨, baseline이 대체)

> **Docker Desktop 실행 필요.** CLI 로컬 스택도 Docker를 사용합니다.

---

## 0. 사전 확인 — 운영 Postgres 버전 맞추기 (중요)

`supabase/config.toml`의 `major_version`(현재 **17**)을 **운영 프로젝트와 일치**시키세요.
- 운영 버전 확인: Supabase Dashboard → 프로젝트 → **Settings → Infrastructure**(또는 Database) → Postgres version.
- 다르면 `config.toml`의 `major_version` 값을 그 버전(예: `15`)으로 수정.

---

## 1. 최초 1회 — 운영에 연결하고 baseline 뽑기

> 운영 액세스 토큰과 **DB 비밀번호**가 필요합니다(제3자가 대신 못 함).
> 프로젝트 `ref`는 운영 `VITE_SUPABASE_URL`의 `https://<ref>.supabase.co` 에서 확인.

```bash
npx supabase login                      # 브라우저로 액세스 토큰 발급
npm run db:link -- --project-ref <ref>  # DB 비밀번호 입력
npm run db:pull                         # 운영 스키마 → supabase/migrations/<timestamp>_remote_schema.sql
```
- `db:pull`이 **현재 운영 스키마 전체**(테이블·RLS·함수·확장)를 baseline 마이그레이션 1개로 만듭니다.
- 파일에 없던 RPC(`get_nearby_hazards`, `increment_user_stats`)도 운영에 있으면 여기에 포함됩니다.

### Realtime publication 확인(주의)
`db pull`이 `supabase_realtime` publication 멤버십을 빠뜨릴 수 있습니다. baseline 파일을 열어
`alter publication supabase_realtime add table ...`가 `hazards`, `near_miss_events`,
`safety_grid_scores`(+`profiles`,`rides`)에 대해 있는지 확인하고, 없으면 baseline 끝에 추가:
```sql
alter publication supabase_realtime add table public.hazards, public.near_miss_events, public.safety_grid_scores;
```
필요 시 `npm run db:pull -- --schema public,realtime` 로 다시 시도할 수도 있습니다.

---

## 2. 로컬 개발

```bash
npm run db:start     # 로컬 스택 기동 (baseline + 시드 적용). 최초엔 이미지 다운로드로 수 분.
npm run db:status    # API URL / anon key / Studio URL 출력
npm run dev          # 앱: http://localhost:8888  (.env.local이 로컬을 가리킴)
```
- **Studio(로컬 관리)**: http://127.0.0.1:54323
- 정지: `npm run db:stop`  ·  로컬 DB 완전 초기화+재적용: `npm run db:reset`
- 시드: `config.toml`의 `[db.seed]`가 `seed_p4_near_miss_mock.sql`(near-miss 목업 50건)을 `db:reset` 시 로드.

---

## 3. 스키마 변경 흐름 (로컬 → 운영)

```bash
npm run db:new my_change     # supabase/migrations/<timestamp>_my_change.sql 생성
# ↳ 파일에 SQL 작성 (CREATE TABLE / ALTER / CREATE FUNCTION ...)
npm run db:reset             # 로컬에 전체 재적용해 검증 (baseline + 새 마이그레이션 + 시드)
npm run db:push              # 운영에 반영 → 로컬==운영 유지
```
- 운영이 외부(대시보드 SQL 등)에서 바뀌었으면: `npm run db:pull` 로 로컬 이력에 흡수 후 진행.
- 변경 미리보기: `npm run db:diff` (로컬 DB와 마이그레이션 간 차이).

---

## 4. 데이터 확인 (스모크)

`npm run db:status`의 DB URL로 접속하거나 Studio(54323) SQL Editor:
```sql
select extname from pg_extension order by 1;              -- postgis, uuid-ossp 포함
select 'rides' t, count(*) from rides
union all select 'near_miss_events', count(*) from near_miss_events
union all select 'hazards', count(*) from hazards;
select public.refresh_rides_daily();
select * from public.get_rsr_by_zone(30);
select tablename from pg_publication_tables where pubname='supabase_realtime';
```
앱에서 **로그인 → 주행 시작 → (이동) → 주차 종료** 시 `rides`·`ride_paths`·`zone_events`에 로우가 쌓이는지 확인.
> 게스트 모드로는 저장되지 않습니다. 로그인 상태로 테스트.

---

## 5. 트러블슈팅

- **`db:start` 실패 / Docker 오류**: Docker Desktop 실행 여부 확인(`docker ps`).
- **`db:push`가 baseline을 다시 적용하려 함**: `db:pull`로 만든 baseline은 링크 시 운영 이력에
  기록되어 재적용되지 않습니다. 그래도 충돌 시 `supabase migration list`로 로컬/운영 상태 비교.
- **major_version 경고**: 0절대로 운영 버전과 일치.
- **포트**: CLI 로컬은 54321(API)/54322(DB)/54323(Studio). 앱 8888, 백업 스택 8000과 비충돌.
- **운영을 다시 쓰고 싶을 때**: 루트 `.env.local` 삭제(또는 클라우드 URL/키로 교체) 후 `npm run dev`.

---

## 관련
- 오프라인 백업 스택(수동 compose): `infra/supabase/` (→ `infra/supabase/DEPRECATED.md`)
- 옛 수작업 SQL 보관: `supabase/migrations_legacy/`
