# ⚠️ DEPRECATED — 이 셀프호스팅 스택은 백업용입니다

C-Safe DB의 **1차 로컬 도구는 이제 Supabase CLI** 입니다. → `supabase/README.CLI.md` 참고.

이 `infra/supabase/` 공식 셀프호스팅 compose 스택은 **오프라인/백업 시나리오**(CLI를 쓸 수 없거나
완전 오프라인으로 전체 스택을 직접 통제해야 할 때)를 위해 **보존**만 합니다.

## CLI vs 이 스택
| | Supabase CLI (권장) | infra/supabase (백업) |
|---|---|---|
| 기동 | `npm run db:start` | `cd infra/supabase && docker compose up -d` |
| 마이그레이션 | `supabase/migrations/` (baseline + 신규) | `supabase/migrations_legacy/` (수작업 SQL, migrator가 적용) |
| API 포트 | 54321 | 8000 |
| 운영 연동 | `db pull`/`db push` 로 동기화 | 없음(로컬 전용) |

## 주의
- **둘을 동시에 켜도 포트는 겹치지 않습니다**(54321 vs 8000). 단, 혼동을 피하려 보통 하나만 사용하세요.
- 이 스택의 마이그레이터는 `supabase/migrations_legacy/`(옛 수작업 SQL)를 적용합니다.
  최신 스키마 변경은 CLI 쪽(`supabase/migrations/`)에만 반영되므로, 이 백업 스택은
  **스키마가 뒤처질 수 있습니다.** 최신 상태가 필요하면 CLI를 쓰세요.
- 앱을 이 스택(8000)에 붙이려면 루트 `.env.local`의 URL/키를 `infra/supabase/README.CSAFE.md` 안내대로
  바꿔야 합니다(기본 `.env.local`은 CLI 로컬 54321을 가리킴).
