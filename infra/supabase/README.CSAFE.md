# C-Safe 로컬 셀프호스팅 Supabase

C-Safe 앱의 백엔드(Supabase)를 **로컬 Docker**로 띄워, 데이터 누적·관리를 로컬에서 확인하기 위한 구성입니다.
프런트(React)는 컨테이너에 넣지 않고 **호스트에서 `npm run dev`** 로 실행합니다.

> ⚠️ 이 구성은 **로컬 개발 전용**입니다. `.env`의 데모 키/비밀번호를 **운영에 사용하지 마세요.**

---

## 1. 구성 요약

- `docker-compose.yml` — Supabase 공식 셀프호스팅 스택 (db, kong, auth, rest, realtime, storage, studio, meta, functions 등)
- `docker-compose.migrator.yml` — **C-Safe 추가분**. 스택 기동 후 프로젝트 SQL 마이그레이션을 순서대로 적용하는 1회성 `db-migrator` 서비스
- `scripts/apply-migrations.sh` — 의존성 순서 적용 스크립트 (`../../supabase/migrations` 를 단일 소스로 사용)
- `.env` — 시크릿(gitignore). `.env.example`에서 복사됨. 변경점 2가지:
  - `ENABLE_ANONYMOUS_USERS=true` (앱이 익명 로그인만 사용)
  - `COMPOSE_FILE=docker-compose.yml:docker-compose.migrator.yml` (마이그레이터 자동 로드)

---

## 2. 사전 준비

- **Docker Desktop 설치 + 실행 중**이어야 합니다. 확인:
  ```bash
  docker --version
  docker ps          # 데몬 동작 확인 (에러 나면 Docker Desktop 먼저 실행)
  ```
- 최초 실행 시 이미지 다운로드로 수 분~십수 분 걸릴 수 있습니다(컨테이너 10개+).

---

## 3. 실행

```bash
cd infra/supabase

# 기동 (백그라운드)
docker compose up -d

# 상태 확인 — 전 서비스 healthy 될 때까지
docker compose ps

# 마이그레이션 로그 확인 (오류 없이 "✅ 전체 마이그레이션 적용 완료" 나와야 함)
docker compose logs db-migrator
```

- **Studio(관리 대시보드)**: http://localhost:8000
  - 로그인: `.env`의 `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` (기본 `supabase` / `this_password_is_insecure_and_should_be_updated`)
- **API 게이트웨이(Kong)**: http://localhost:8000 (앱이 여기로 연결)

정지 / 초기화:
```bash
docker compose stop            # 정지 (데이터 유지)
docker compose down            # 컨테이너 제거 (데이터 유지)
docker compose down -v         # ⚠️ 볼륨까지 삭제 = DB 완전 초기화 → 다음 up에서 마이그레이션 재적용
```

> 마이그레이터는 **멱등**합니다. `rides` 테이블이 이미 있으면 재적용을 건너뜁니다.
> 처음부터 다시 깔려면 `docker compose down -v` 후 `up`.

---

## 4. 앱(React)을 로컬 Supabase에 연결

repo 루트에 이미 **`.env.local`** 을 만들어 두었습니다:
```
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=<데모 anon 키 = infra/supabase/.env 의 ANON_KEY 와 동일>
```
Vite가 `.env.local` 을 우선 로드하므로 **코드 변경 없이** 로컬로 붙습니다.
(Kakao/공공데이터 키는 기존 루트 `.env` 를 그대로 사용 — `.env.local`은 Supabase만 덮어씀. 루트 `.env`가 없다면 Kakao 키를 별도 설정해야 지도 기능이 동작합니다.)

```bash
cd ../..          # repo 루트
npm run dev        # http://localhost:8888
```

- 브라우저 콘솔에 "Supabase 환경변수 미설정" 경고가 **없어야** 정상입니다.
- 로컬 클라우드로 다시 돌아가려면 `.env.local`을 지우거나 URL/키를 원래대로 바꾸면 됩니다.

---

## 5. 데이터 확인 (스모크 테스트)

Studio → SQL Editor, 또는:
```bash
docker compose exec db psql -U postgres -d postgres
```
```sql
-- 확장 확인
select extname from pg_extension order by 1;      -- postgis, uuid-ossp 포함

-- 테이블/누적 확인
select 'rides' t, count(*) from rides
union all select 'ride_paths', count(*) from ride_paths
union all select 'zone_events', count(*) from zone_events
union all select 'near_miss_events', count(*) from near_miss_events
union all select 'hazards', count(*) from hazards
union all select 'profiles', count(*) from profiles;

-- 관리 지표 RPC 동작
select public.refresh_rides_daily();
select * from public.get_rsr_by_zone(30);

-- Realtime publication 구독 테이블
select tablename from pg_publication_tables where pubname='supabase_realtime';
```

앱에서 **로그인 → 주행 시작 → (실제 이동) → 주차 종료** 하면 `rides`·`ride_paths`·`zone_events`에 로우가 쌓이는지 로컬 DB에서 확인하세요.
> 게스트 모드로는 저장되지 않습니다. 반드시 로그인 상태로 테스트.

---

## 6. 트러블슈팅 / 알려진 제한

- **포트 충돌**: `8000`(Kong·Studio), `5432`/`6543`(Supavisor 풀러), 앱 `8888`. 로컬에 기존 Postgres(5432)가 있으면 충돌할 수 있음 → 해당 서비스 종료 또는 `.env`의 `POSTGRES_PORT` 변경.
- **Windows에서 `analytics`/`vector` 관련 지연·실패**: 이 버전 compose엔 analytics가 기본 포함되지 않지만, 특정 서비스가 unhealthy로 멈추면 `docker compose logs <서비스>`로 확인. 필요 시 해당 서비스를 줄인 경량 구성으로 조정 가능.
- **마이그레이터가 auth.users 없다고 실패**: `auth`가 healthy 된 뒤 적용하도록 `depends_on`을 걸어 두었으나, 그래도 실패하면 `docker compose up -d db auth` 로 먼저 띄운 뒤 `docker compose up -d db-migrator` 재실행.
- **정의가 없어 404 나는 RPC(앱 폴백 존재, 비차단)**:
  - `get_nearby_hazards` — 위험구역 근접 탐색. 없으면 앱이 로컬 거리 계산으로 폴백.
  - `increment_user_stats` — 포인트/거리 누적. 없으면 앱이 일반 UPDATE로 폴백.
  - 이 둘은 프로젝트 SQL에 정의가 없어 로컬에서도 404가 날 수 있으나 **동작에는 무해**합니다.
- **재적용 에러**: 일부 마이그레이션이 `CREATE TABLE`(IF NOT EXISTS 아님)이라 같은 DB에 두 번 적용하면 에러. 멱등 가드로 스킵되지만, 강제 재적용은 `down -v` 후 `up`.

---

## 7. 마이그레이션 적용 순서(참고)

`scripts/apply-migrations.sh`가 아래 순서로 적용합니다(알파벳순 아님 — 의존성 순):
```
uuid-ossp, postgis 확장
→ supabase_schema (hazards)
→ phase8 (profiles, rides) → phase9 → p0_1 → p3
→ near_miss_events → p0_2(zone_events) → safety_path_schema(ride_paths, safety_grid_scores)
→ p1_1(rides_daily 뷰) → p2_a → p4(postgis 재작성)
→ phase10_rls → phase19_feedbacks → rls_security_update(최종)
→ supabase_referrals (추천) → seed(선택)
```
