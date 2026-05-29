# C-Safe: AI-Powered Urban Mobility Safety Platform

> **"초보 라이더의 습관을 바꾸고, 도시의 안전을 데이터로 설계한다."**
>
> 🌐 **Production**: https://safety-app-seven.vercel.app/

---

## 🏛️ 프로젝트 개요

C-Safe는 전동 킥보드(PM) 초보 사용자를 위한 **AI 기반 도시 모빌리티 행동 개선 플랫폼**입니다.  
단순 안전 대시보드가 아닌, 라이더가 앱에 장기적으로 의존하도록 설계된 **행동 진화 시스템**입니다.

```
사용자가 느끼는 것: "C-SAFE가 나를 자동으로 보호하고 있다."
실제로 일어나는 것: 모든 주행이 도시 안전 데이터 자산으로 축적된다.
```

---

## 🧬 핵심 가치 (Core Principles)

| 원칙 | 설명 |
|------|------|
| 🤖 **AI 행동 코칭** | 매 주행 후 개인화된 안전 피드백 제공 |
| 📊 **데이터 모트** | 아차사고, 급제동, 헬멧 착용 등 전략적 데이터 수집 |
| 🎮 **게임화** | 포인트·스트릭·배지로 안전 습관 형성 |
| 🔇 **마찰 최소화** | 자동화된 경고·AI 가이드로 사용자 입력 최소화 |
| 🏙️ **정책 지원** | 축적된 데이터를 지자체 교통 정책 근거로 제공 |

---

## 🛠 기술 스택 (Tech Stack)

| 레이어 | 기술 |
|--------|------|
| **Framework** | React 19 + Vite 8 |
| **Styling** | Tailwind CSS v4 (Cyberpunk Dark Theme) |
| **State** | Zustand (다중 전역 스토어) |
| **Maps** | react-kakao-maps-sdk (Kakao Maps API) |
| **Backend/DB** | Supabase (Postgres + Realtime + Auth + PostGIS RPC) |
| **Edge AI** | ONNX Runtime Web (WASM, 온디바이스 헬멧 감지) |
| **Location** | navigator.geolocation (단일 인스턴스, ref-count 관리) |
| **i18n** | i18next (한국어/영어/일본어/중국어) |
| **Animation** | Framer Motion |
| **PWA** | vite-plugin-pwa (skipWaiting, clientsClaim) |

---

## 🗂 아키텍처 구조

```
src/
├── App.jsx                      ← 전역 상태 코디네이터 (~1,310 lines)
├── components/
│   ├── admin/
│   │   └── AdminDashboard.jsx   ← B2G 정책 대시보드 (✨ React.lazy 레이지 로딩)
│   ├── common/                  ← 36개 UI 컴포넌트
│   │   ├── AISafetyCoach.jsx    ← 주행 후 AI 코칭 카드
│   │   ├── BeginnerMissionCard.jsx ← ✨ NEW: 초보자 미션 UI
│   │   ├── NavigationLaunchSheet.jsx ← ✨ NEW: 외부 앱 연동 (동의→앱선택→안전안내)
│   │   ├── SafeCorridorSheet.jsx ← ✨ NEW: 경로 안전 분석 시트
│   │   ├── ShadowImpactSheet.jsx ← ✨ UPGRADED: 실데이터 연동
│   │   ├── UserProfileSheet.jsx  ← ✨ UPGRADED: 프로필/미션 탭
│   │   └── ...
│   └── map/                     ← MapContainer (52KB), VibeRouteSelector 등
├── hooks/
│   ├── useBeginnerMissions.js   ← ✨ NEW: 미션 상태 + localStorage 영속화
│   ├── useNearMissEngine.js     ← 아차사고 이벤트 캡처 엔진
│   ├── useLocalStorage.js       ← 범용 localStorage 훅
│   ├── useRideSession.js        ← 주행 세션 상태 머신 (보호됨)
│   ├── useUserStore.js          ← 인증 + 프로필 영속화 (보호됨)
│   ├── useGeolocation.js        ← 단일 GPS 라이프사이클 (보호됨)
│   ├── useSafeData.js           ← Supabase 실시간 + 날씨 + TAGO PM
│   ├── useEdgeAI.js             ← ONNX/WASM 헬멧 감지 (10FPS)
│   └── useVoiceGuidance.js      ← TTS 래퍼 (다국어 지원)
├── services/
│   ├── B2GExportService.js
│   ├── SafeRouteService.js
│   └── ProfileControlService.js
├── utils/
│   ├── distance.js              ← Haversine 거리 계산
│   ├── physics.js               ← 제동 거리 물리 엔진
│   └── safetyScoring.js
└── data/
    ├── pm_parking_data.json     ← 천안시 PM 주차 구역 410개소
    ├── accidentHeatmap.json
    └── safetyGrid.json
```

---

## 🗃 Supabase 데이터 스키마

| 테이블 / RPC | 목적 |
|-------------|------|
| `profiles` | 사용자 프로필: 포인트, 안전점수, 누적거리, 닉네임 |
| `hazards` | 커뮤니티 신고 위험 구역 (실시간 Realtime 구독) |
| `rides` | 주행 세션 기록. ✨ 2026-05-27 컬럼 확장: `top_speed`, `sudden_brake_count`, `duration_minutes`, `ride_rsr`, `helmet_on_pct`, `co2_saved_kg`, `is_legal_park` + 이상치 CHECK 제약 5종 + 인덱스 2종. ✨ 2026-05-29 추가 확장: `to_loc_text` (목적지 텍스트), `helmet_pickup_station_id` (시작 거점), `helmet_return_station_id` (반납 거점) + partial index 3종 |
| `ride_paths` | 세션별 GPS 경로 좌표 배열 |
| `near_miss_events` | 아차사고 이벤트 (GPS + 맥락 데이터) |
| `zone_events` | ✨ NEW (2026-05-27): 위험구역 진출입 이벤트 + 사전계산 `rsr_value`. RSR(Risk Suppression Rate)의 서버 SoT |
| MATERIALIZED VIEW `rides_daily` | ✨ NEW (2026-05-27): 일별 사전 집계 (ride_count/distance/avg_top_speed/avg_rsr/avg_helmet_pct 등). AdminDashboard 30일 KPI 쿼리 가속 |
| RPC `get_nearby_hazards` | PostGIS 공간 쿼리 (반경 위험 구역 탐색) |
| RPC `update_safety_scores` | 격자 단위 안전 점수 집계 |
| RPC `increment_user_stats` | 원자적 포인트 + 거리 누적 |
| RPC `get_near_miss_clusters` | 위험 클러스터 분석 (Admin 지도 히트맵용) |
| RPC `get_rsr_by_zone` | ✨ NEW (2026-05-27): zone_id별 평균 RSR 집계 (도시 단위 정책 효과) |
| RPC `get_hazard_policy_effect` | ✨ NEW (2026-05-27): hazard 지정 ±30일 near_miss 카운트 + 감소율(%) — B2G 정책 입증 |
| RPC `refresh_rides_daily` | ✨ NEW (2026-05-27): rides_daily 머티뷰 갱신 (pg_cron 03:00 UTC 자동 + AdminDashboard 로드 시 수동) |

---

## 🔁 앱 플로우

```
앱 실행
 └─ LanguageSelectorScreen      (언어 선택 게이트)
     └─ SplashScreen             (지도/인증 로딩 대기)
         └─ DisclaimerModal      (약관 동의 게이트)
             └─ SafetyQuiz       (안전 교육 퀴즈 → +500P)
                 └─ 메인 지도 화면

주행 시작 플로우:
  START RIDE 버튼
    → setNavStep('select_destination')
    → 목적지 검색 (풀오버레이 결과 패널 / 지도 마커 탭)
    → route_ready → ✨ SafeCorridorSheet 자동 팝업 (경로 안전 분석)
    →   [닫기] → RideSettings (차량 종류 + 속도 제한)
    →   [외부 앱으로 길 안내] → NavigationLaunchSheet (카카오/네이버)
    → HelmetDetectionCamera (Edge AI ONNX 2초 인증)
    → startRide() + startTracking() + TTS 안내

주행 중:
  → 실시간: 속도·안정도·마일리지 HUD
  → 보행자 스트레스 존 진입 감지 (TTS 경보)
  → useHazardWarning: PostGIS 근접 위험 경보
  → 물리 엔진: calculateStopDistance 기반 위험도
  → useNearMissEngine: 위험 수준 달성 시 아차사고 캡처

주행 종료:
  → 주차 인증 (Haversine 10m 지오펜싱)
  → endRideSession: Supabase 저장 + 격자 점수 업데이트
  → PaymentReceiptModal → StationRewardModal → RideSummaryModal
  → AISafetyCoach: 개인화 AI 코칭 카드 (✨ NEW)
```

---

## ✨ 주요 기능

### 1. Edge AI 온디바이스 헬멧 검증
- ONNX Runtime WASM으로 서버 통신 없이 실시간 카메라 분석
- 2초 누적 검증 후 주행 허용 (10FPS로 배터리 최적화)
- 인증 성공 시 100P 자동 적립

### 2. Haversine 지오펜싱 주차 검증
- 천안시 PM 주차 구역 410개소 대상 반경 10m 검증
- 합법 주차: +100P 리워드 / 불법 주차: 음성 경고 + 보상 차단

### 3. AI Safety Coach (✨ 2026-05-23 신규)
- 주행 종료 후 자동 표시되는 개인화 코칭 카드
- 완전 결정론적 룰 기반 (블랙박스 없음, 모든 인사이트 설명 가능)
- 평가 항목: 급제동·최고속도·헬멧착용·성장 추세
- 원형 안전 점수 게이지 (0~100점)
- 초보 라이더 친화적 지지적 언어 설계

### 4. Near-Miss Event Engine (✨ 2026-05-23 신규)
전략적 데이터 모트 자산으로, 아차사고 이벤트를 다음 맥락과 함께 저장:

| 수집 데이터 | 소스 |
|------------|------|
| GPS 좌표 | useGeolocation |
| 속도 (km/h) | useGeolocation |
| 감속 강도 (1~3단계) | 물리 엔진 위험도 |
| 기상 위험 여부 | useSafeData |
| 보행자 스트레스 존 여부 | STRESS_ZONES 상수 |
| 헬멧 착용 여부 | HelmetDetectionCamera |
| 인근 위험 구역 | useHazardWarning |

Supabase 저장 + localStorage 폴백 + 3초 쿨타임 중복 방지

### 5. GPS 단일 워처 아키텍처 (🔧 2026-05-23 수정)
- 기존: `useGeolocation` + `useHazardWarning`이 각각 독립적 `watchPosition` 실행 (GPS 워처 2개)
- 수정: `useHazardWarning`이 `useGeolocation` Zustand 스토어를 구독
- 효과: 배터리 절약, GPS race condition 해소

### 6. 실시간 위험 근접 경보
- PostGIS RPC `get_nearby_hazards` (반경 50m 서버 사이드 공간 쿼리)
- 네트워크 실패 시 로컬 Haversine 연산으로 자동 폴백
- 10m 이동 쓰로틀링으로 불필요한 연산 90% 감소

### 7. 디지털 트윈 물리 엔진
- `calculateStopDistance`: 속도·노면상태·반응시간 기반 제동거리 계산
- 위험 수준(safe/warning/danger) 실시간 표시
- 헤더 로고에 색상 코딩 반영 (정상: cyan / 위험: red)

### 8. VIBE 경로 시스템
- 3가지 VIBE 경로: Riverside Chill, Quiet Street, Street Runner
- 4가지 주행 선호도: 안전 최우선 / 에코 / 자전거 도로 / 최단거리
- 선호도별 예상 시간·거리 동적 계산 (Haversine 기반)
- 주행 시작 시 VIBE명 + 선호도 + 모드 결합 TTS 안내

### 9. ESG 임팩트 대시보드
- 주행 거리 기반 CO₂ 절감량 실시간 산출
- 안전 스트릭·위험 신고 수·안전 점수 시각화
- 주행 기록 기반 주간 리포트

### 10. B2G 정책 데이터 허브 (관리자)
- 위험 구역 히트맵 시각화
- 보행자 스트레스 존 레이어
- VIBE 경로 폴리라인 표시
- CSV 데이터 내보내기 (지자체 제출용)

---

## 📊 Rider Safety Index (RSI)

$$\text{RSI} = 0.4 \times H + 0.2 \times S + 0.2 \times B + 0.2 \times R$$

| 변수 | 의미 | 가중치 |
|------|------|--------|
| **H** (Helmet) | 헬멧 착용 AI 인증 | 40% |
| **S** (Speed) | 구역별 제한속도 준수율 | 20% |
| **B** (Braking) | 급제동 횟수 역산 | 20% |
| **R** (Route) | 위험 구역 우회율 | 20% |

---

## 🛡️ 장애 극복 전략 (Fault Tolerance)

| 장애 유형 | 폴백 전략 |
|-----------|-----------|
| GPS 신호 불안정 | 마지막 안정 좌표 유지 + Dead Reckoning |
| 네트워크 단절 | localStorage 캐시 위험 데이터 참조 |
| Edge AI 로드 실패 | 시뮬레이션 모드로 자동 전환 (주행 차단 않음) |
| Supabase 연결 실패 | 로컬 프로필 캐시 + localStorage 저장 |
| TTS 미지원 | 햅틱 진동(`navigator.vibrate`) 대체 출력 |

---

## 📜 개발 이력 (Changelog)

### [2026-05-29] UI 중복 정리 + 데이터 영속화 보강 + Dev 편의성

오늘 6개 커밋. "중복되거나 복잡한 아이콘·기능 정리" 사용자 요청에 따라 5개 영역(Pick 1·2·4·5·6)을 순차 정리하고 dev 환경 QA 편의성도 보강.

#### 🅰️ Pick 1 — 도구 패널 정리 + 죽은 컴포넌트 3개 제거 (`45c52ebb`)

어제 흐름 단축 작업의 부수효과로 자동 트리거에서 빠진 후 진입점 0건이던 컴포넌트들 처리.

- **제거된 컴포넌트 (3개 파일 통째 삭제):**
  - `StationUnlockScreen` — title="스테이션 언락 테스트", 디버그 잔재
  - `DrivingConsoleUI` — speedLimit만 조정, RideSettings의 부분집합
  - `VehicleSelectModal` — RideSettings의 `isBicycleMode` 토글에 이미 동일 기능
- **도구 패널(FAB Layers) 재구성:**
  - Before: Dashboard / PWA / 스테이션 언락 / ESG / 주행 콘솔 / 보행자 스트레스 존
  - After: Dashboard / PWA / ESG / 🆕 **주행 환경 설정** (Sliders, RideSettings) / 🆕 **경로 안전 분석** (ShieldCheck, SafeCorridor) / 보행자 스트레스 존
  - SafeCorridor 진입 버튼은 `routeDestination` 없으면 disabled
- 약 408줄 순감소

#### 🅱️ Pick 2 — ESGDashboard → ShadowImpactSheet 흡수 (`2d8c6b03`)

두 시트가 CO₂·도시 기여 데이터를 중복 표시하고 진입점이 분산되어 있던 문제 해소.

- ShadowImpactSheet에 신규 Card "🌿 환경 · 안전 임팩트" — CO₂(kg) / 나무 식재(2kg≈1그루) / 안전 점수(%) / 안전 스트릭(일) 2×2 그리드
- App.jsx에서 ESG 진입점(도구 패널 Leaf 버튼) + state + 렌더 + import 모두 제거
- `ESGDashboard.jsx` 파일 삭제 (~300줄 감소)
- 사용자 진입점 통합: 하단 Activity 탭 1개로 환경 + 라이더 인사이트 모두 노출

#### 🅳 Pick 4 — HelmetDetectionCamera 잡동사니 정리 (`0ff55b81`)

- **ride_logs insert 제거**: 존재하지 않는 테이블 호출(매 인증마다 console.error 발생)
- **토스트 중복 발화 제거**: HelmetDetectionCamera 내부 + App.jsx onSuccess 양쪽에서 발화하던 토스트를 App.jsx 단일 책임으로 통합
- handleSuccess 시그니처 단순화 (인자 제거)
- 미사용 import 정리 (supabase / useUserStore / toast)

#### 🅴 Pick 5 — 헬멧 3화면 일관성 통일 (`dba68a4a`)

- **타이틀 통일**: HelmetDetectionCamera 헤더를 `text-xl` → `text-[20px] font-black italic uppercase` + 서브타이틀 (Selector·Return과 동일 패턴), 텍스트 "Helmet Verify" + "실시간 Edge AI 검증"
- **보조 액션 라벨 통일**: Selector "선택안함" → "건너뛰기" (Return의 "건너뛰기"와 동사 일치)
- **토스트 메시지 패턴 통일** — `🪖 헬멧 [동작] · [정보]`
  - 거점 선택: `🪖 헬멧 거점 선택 · ${station.name}`
  - 인증 완료: `🪖 헬멧 인증 완료 · +100P 적립`
  - 반납 완료: `🪖 헬멧 반납 완료 · ${station.name} · +100P 적립`
- 🏆 이모지는 미션 완료 전용으로 분리

#### 🆕 Pick 6 — rides 컬럼 3개 추가 (`81eef4df`)

README 미해결 후속 작업 2건 동시 처리.

**DB 마이그레이션** ([`supabase_p3_rides_destination_helmet_station.sql`](supabase/migrations/supabase_p3_rides_destination_helmet_station.sql)):
- `rides.to_loc_text` — 검색바 목적지 텍스트
- `rides.helmet_pickup_station_id` — 시작 시 선택한 거점 id
- `rides.helmet_return_station_id` — 반납 인증 거점 id
- partial index 3종 (NULL 제외, 분석 쿼리 가속)

**코드 변경:**
- `useRideSession.endRideSession` 시그니처에 `destinationText`, `helmetPickupStationId` 옵션 추가
- `rideId`를 try 블록 밖으로 이동 → `summary.db_ride_id`로 노출하여 헬멧 반납 시점에 같은 row UPDATE 가능 (게스트는 null)
- App.jsx의 endRideSession 호출 2곳 모두 `routeDestination?.title` + `selectedHelmetStation?.id` 전달
- `HelmetReturnSheet.onConfirm`에 `rides.helmet_return_station_id` UPDATE 추가

**자동 가동되는 기능 (마이그레이션 실행 후):**
- PersonalLog **TOP DESTINATIONS** 카드 (이전 "Coming soon" → 실데이터 누적 빈도 TOP 3)
- 헬멧 거점별 사용 패턴 / 시작-반납 매칭 데이터 (B2G 분석 + 개인 사이클 추적)

#### 🛠️ Dev 편의성 — 로컬에서 안전 퀴즈 항상 노출 (`3dc9c363`)

`csafe_quiz_meta` localStorage에 통과 기록이 누적되면 어제 작업한 정책(만점/15일/누적 10회+)에 따라 매번 건너뛰어 QA·확인이 번거로움.

```js
// App.jsx quizGateDecision useEffect
if (import.meta.env.DEV) {
  setQuizGateDecision(true);
  return;
}
```

- **로컬 dev (npm run dev)**: 항상 퀴즈 노출
- **운영 빌드 (Vercel)**: 어제 정책(만점 미달 / 15일 경과 / 누적 10회 미만 확률) 그대로 적용

#### 🔴 운영 체크리스트 — Supabase Dashboard SQL Editor에서 마이그레이션 1건 실행 필요

```
c-pm-safety/supabase/migrations/supabase_p3_rides_destination_helmet_station.sql
```

검증 쿼리:
```sql
SELECT '컬럼' AS 항목, count(*)::text AS 개수, '3이면 정상' AS 기대
FROM information_schema.columns
WHERE table_schema='public' AND table_name='rides'
  AND column_name IN ('to_loc_text','helmet_pickup_station_id','helmet_return_station_id')
UNION ALL
SELECT '인덱스', count(*)::text, '3이면 정상' FROM pg_indexes
WHERE schemaname='public' AND tablename='rides'
  AND indexname IN ('idx_rides_to_loc_text','idx_rides_helmet_pickup_station','idx_rides_helmet_return_station');
```

#### 🚧 미해결 후속 (별도 일정)

- **하단 5탭 재정의** (Pick 3) — VIBE/Activity/Wallet/Saved/Profile 통합·정리. 사용자가 매번 보는 핵심 UI라 큰 UX 변화이므로 신중 진행
- **헬멧 거점 Supabase 테이블 승격** — `helmet_stations.json` → `public.helmet_stations`로 운영 유연성 확보
- **헬멧 인증 모델 교체** — `dummy_helmet.onnx` → 실제 검출 모델 + threshold 강화 + 입력 위변조 차단 (실서비스 진입 필수)

---

### [2026-05-28] 헬멧 인증 풀 사이클 + UI 정리 + 퀴즈 개편

오늘 13개 커밋. 주행 시작·종료 양 끝에 헬멧 거점 인증 단계를 신설하고, 흐름을 3단계로 단축. 헬멧 인증 자동 통과·우회 경로를 봉쇄해 부정 적립 차단. PersonalLog·도구 패널의 mock/중복 자산을 대대적으로 정리하고 안전 퀴즈를 13문항으로 확대.

#### 🪖 헬멧 인증 풀 사이클 (시작 거점 선택 → AI 인증 → 주행 → 반납 인증)

**최종 흐름:** `START → 목적지 → 🪖 거점 선택 → 🪖 AI 인증(+100P) → 주행 → 🅿️ 합법 주차(+100P) → 🏆 반납 인증(+100P) → 결제 → 요약`

| 단계 | 신규 컴포넌트 | 보상 |
|---|---|---|
| **시작 헬멧 거점 선택** | `components/common/HelmetStationSelector.jsx` | — |
| **헬멧 AI 인증** | (기존 `HelmetDetectionCamera.jsx`) | +100P (Supabase profiles.points upsert) |
| **헬멧 반납 인증** | `components/common/HelmetReturnSheet.jsx` | +100P |

**신규 시드:** `data/helmet_stations.json` — 천안 단대~신부동·두정동 일대 가상 거점 10개 (STATION 5 + STORE 5). 필드: `id/name/type/lat/lng/address/hours/helmetCount/brandPartners[]`

**거점 선택 시트 (시작):**
- 목적지 반경 800m 이내 거점 우선 표시 (최대 8개, `calculateDistance` Haversine)
- 반경 내 없으면 가장 가까운 5개 자동 표시
- 카드: 타입 배지(STATION=cyan / STORE=amber), 거리, 운영시간, 헬멧 수량, 제휴 브랜드
- 하단 **"선택안함 (헬멧 지참)"** 전폭 버튼. backdrop/X = 선택안함과 동일 처리

**반납 인증 시트 (종료):**
- 시작 시 선택한 거점(`selectedHelmetStation`)이 있으면 그 카드를 cyan 강조 + "내가 선택" 배지로 우선 표시
- 없으면 주행 종료 위치 기준 가장 가까운 3개 거점 자동 추천
- 거점 클릭 시 +100P 적립 + "🏆 OOO에 반납 인증 완료!" 토스트 + 로컬 쿠폰 push + 결제 영수증 진입
- 하단 **"건너뛰기 (반납 인증 안 함)"** 버튼

**보상 누적 (사이클 완성 시 300P):** 시작 인증 100 + 합법 주차 100 + 반납 인증 100. 퀴즈 +500P 대비 적정 균형.

#### 🔒 헬멧 인증 게이트 강화 — 자동 통과·임의 우회 차단

이전엔 dummy 모델이 ~2초 후 `isHelmetDetected=true` 발화 시 `useEffect`가 `handleSuccess(true)`를 *자동 호출*해 사용자 액션 없이 통과되었고, "검증 건너뛰기 (테스트 모드)" 버튼이 항상 노출되어 우회 가능했음. 사용자 보고("언락 버튼 없이 그냥 넘어감")에 따라 두 경로 모두 봉쇄.

**HelmetDetectionCamera.jsx 변경:**
- 자동 `onSuccess` 발화 useEffect 제거 → 인식 100% 도달해도 모달 유지
- 신규 **"🔓 잠금 해제 · 주행 시작"** 전폭 버튼 (cyber-green + shadow-neon-green)
  - `isHelmetDetected=false`: disabled + "헬멧 인증 대기 중..." 라벨
  - `isHelmetDetected=true`: 활성화. 사용자가 명시적으로 클릭해야 다음 단계 진입
- "검증 건너뛰기" 버튼은 `hasPermission === false` 케이스에만 노출 (카메라 권한 거부 사용자 fallback). 라벨도 "수동으로 주행 시작 (카메라 권한 거부 우회)"로 의도 명확화

UX 케이스:

| 상태 | 버튼 | 가능 동작 |
|---|---|---|
| 권한 OK + 인증 미완료 | "헬멧 인증 대기 중..." (회색 disabled) | 카메라에 헬멧 보이기 또는 X 닫기만 |
| 권한 OK + 인증 완료 (100%) | "🔓 잠금 해제 · 주행 시작" (활성) | 클릭 → +100P + 주행 시작 |
| 권한 거부 | "수동으로 주행 시작 (권한 거부 우회)" | 클릭 → 보상 없이 진행 |

#### ✏️ 주행 시작 흐름 단축 (5단계 자동 체인 → 3단계)

**Before:** START → 목적지 → SafeCorridor → RideSettings → VehicleSelect → HelmetAuth → 주행 (5단계 시트가 줄줄이)

**After:** START → 목적지 → 🪖 거점 선택 → 🪖 AI 인증 → 주행 (3단계 + 헬멧 사이클)

- SafeCorridor / RideSettings / VehicleSelect 자동 트리거 제거 (코드는 보존, 추후 도구 패널 진입 버튼 추가 시 재활용 가능)
- 중간 결손: `RideSettings.onNext` prop 누락(`onClose`만 호출되어 VehicleSelect 영영 안 뜸) + `setIsVehicleSelectOpen(true)` 호출 0건이던 흐름 단절 동시 해결
- 차량 종류는 `rideConfig.isBicycleMode` 기본값(false=킥보드)로 고정

#### 📊 PersonalLog (`PersonalInsights`) 효용성 강화 — Mock 5건 제거

| # | 변경 | Before | After |
|---|---|---|---|
| 1 | 주간 변화율 | "12%" 하드코딩 | 실제 7일 vs 직전 7일 변화율, 케이스별 분기(없음/0/↑/↓) |
| 2 | 막대그래프 | `[30,45,25,60,40,80,50]` 가짜 | 최근 7일 일별 거리 실측 + 요일 라벨(오늘 강조) |
| 3 | Total Effort 카드 | "N Sessions" 의미 모호 | **AVG SAFETY (RSR %)** — 안전 운전 습관 한눈에 |
| 4 | Top Destinations 빈 메시지 | "주행 기록을 쌓아 분석을 확인하세요!" (거짓말) | "목적지 텍스트 저장 기능 준비 중" (정직 + 후속 명시) |
| 5 | View All History | onClick 없음 (죽은 버튼) | "View Full Impact" + ShadowImpact 시트 오픈 연결 |

부수: `getRideTs(r)` 유틸로 Supabase `start_time`/localStorage `date` 양쪽 timestamp 파싱 일원화 (Supabase 로드 데이터가 누락되던 버그 동시 해결)

#### 🧹 UI 정리 (메인 도구 패널)

- **위험 구역 히트맵 토글 제거** (주황 Activity 아이콘): AdminDashboard "Near-Miss Cluster Map"(P2-A, 동적 RPC) + ShadowImpact "시간대 위험 패턴"(P1-2, 실데이터)과 중복. 정적 `accidentHeatmap.json` mock 기반이라 혼란 유발 → 코드 + 정적 파일 통째 삭제 (87줄 순감소, MapContainer 6개 분기 동시 정리)
- **디버그용 헬멧 강제 진입 버튼 제거** (보라 Shield 아이콘, `title="테스트 AI 헬멧 인식 강제 오픈"`): 정상 흐름이 완전 연결되어 중복 + 부정 적립 경로(임의 +100P 획득) 차단

#### 📝 안전 퀴즈 개편 (8 → 13문항, 정답 확인 딜레이 2초)

- `quiz_q7` (무면허 벌금) 삭제 — 4개 언어 모두
- 5개 신규 문항 추가 — 4개 언어 모두 (총 40 라인 i18n)
  - q10 (X): 주행 중 휴대폰 사용 허용?
  - q11 (X): 음주 운전 적발 시 1만 원 이하 벌금만?
  - q12 (O): 횡단보도에서 내려서 끌고 가야?
  - q13 (O): 양쪽 이어폰 착용은 청각 차단으로 위험?
  - q14 (O): 주행 종료 후 차도/인도 무단 방치는 도로교통법 위반?
- 정답 분포: X=6 / O=7 (균형)
- 매 시도마다 13문항 중 랜덤 3개 추출
- 정답 확인 후 다음 문항 진행 딜레이 1.5초 → **2초** (해설 가독 시간 확보)

#### 🚧 후속 필수 작업 (실서비스 진입 전, 상시 체크사항)

헬멧 인증은 현재 **데모 수준**이며 실제 안전 검증 기능을 하지 않음.

| # | 항목 | 상태 |
|---|---|---|
| 1 | **모델 교체** — `dummy_helmet.onnx` → 실제 헬멧 검출 모델 + `useEdgeAI` confidence threshold 강화 | ❌ 미해결 |
| 2 | **UI 레벨 우회 차단** — 디버그 강제 진입 / 자동 통과 / 임의 우회 버튼 | ✅ **봉쇄 완료 (2026-05-28)** |
| 3 | **모델 위변조 차단** — 카메라에 헬멧 사진·모자 들이대기 등 입력 위변조 방지 (face-helmet 동시 감지 + threshold) | ❌ 미해결 (모델 교체와 한 묶음) |
| 4 | **재시작 우회 차단** — 인증 완료 직전 앱 강제 종료 후 재진입 등 흐름 우회 시 마일리지 차단 + 안전점수 감점 | ❌ 미해결 |

이 작업들이 끝나기 전엔 헬멧 인증/반납 +200P / `helmet_streak_3` 미션 자동 완료 / RSI 산식 헬멧 가중치(H=95 시뮬레이션값) 모두 정확성 보장 불가.

> 오늘(2026-05-28) UI 레벨 부정 적립 경로 3종(디버그 버튼 + 자동 통과 + 임의 우회)이 모두 봉쇄됨. 남은 건 **모델 자체의 신뢰성** 한 갈래로 좁혀짐.

#### 🪛 향후 후속 가능 작업 (미해결, 우선순위 낮음)

- TOP DESTINATIONS 가동: `rides` 테이블에 `to_loc_text` 컬럼 추가 + `endRideSession`이 검색바 목적지 텍스트 함께 저장
- 도구 패널에 SafeCorridor / RideSettings 진입 버튼 추가 (자동 흐름에서 빠진 컴포넌트 복원)
- 선택한 헬멧 거점을 `rides` 테이블에 `helmet_station_id`로 저장 (어느 거점 빌렸는지 추적)
- 거점 데이터를 Supabase 테이블로 승격 (`helmet_stations`) — 동적 추가/운영
- 헬멧 인증 토스트 중복(`HelmetDetectionCamera.handleSuccess` 내부 + App.jsx onSuccess 두 곳) 정리
- `HelmetDetectionCamera`가 존재하지 않을 수 있는 `ride_logs` 테이블에 insert 시도 — 정리 필요

---

### [2026-05-27] Epic 10: 데이터 파이프라인 강화 (P0~P2-A)

운영 데이터의 single source of truth를 서버로 이전하고, 분석 가속·라이더 인사이트 위젯·B2G 정책 시각화까지 한 사이클 완성.

#### 🟥 P0-1 · `rides` 핵심 메트릭 컬럼 영속화
주행 종료 시점 메트릭(top_speed, sudden_brake_count, ride_rsr 등)이 localStorage `csafe_ride_history`에만 저장돼 다른 디바이스에서 같은 계정 로그인 시 통계 회귀가 발생하던 문제 해결.
- 마이그레이션: [`supabase_p0_1_rides_extension.sql`](supabase/migrations/supabase_p0_1_rides_extension.sql)
  - 7개 컬럼 추가 + 이상치 CHECK 제약 5종 + 인덱스 2종
- `useRideSession.endRideSession`: insert payload에 신규 컬럼 전체 포함, `helmetOn` 인자 추가

#### 🟥 P0-2 · `zone_events` 테이블 신설 (RSR 서버 SoT)
RSR(B2G 핵심 KPI)이 클라이언트 localStorage에만 살아 ① 사용자가 캐시 비우면 KPI 0 ② AdminDashboard의 RSR이 관리자 본인 브라우저만 보는 문제 해결.
- 마이그레이션: [`supabase_p0_2_zone_events.sql`](supabase/migrations/supabase_p0_2_zone_events.sql)
  - `zone_events` 테이블 + 사전계산 `rsr_value` + RLS 2개 + RPC `get_rsr_by_zone`
- `endRideSession`에 zone_events batch insert 통합 (rsr_value 계산 후 저장)
- AdminDashboard RSR 산출: Supabase `zone_events` 우선 + localStorage 폴백

#### 🟥 P0-3 · 오프라인 sync 큐 (`csafe_pending_sync`)
일시적 네트워크/권한 오류로 Supabase insert가 실패하면 row가 영구 손실되던 문제 해결.
- 신규 유틸: [`src/lib/pendingSyncQueue.js`](src/lib/pendingSyncQueue.js)
  - 테이블별 큐(최대 200건 FIFO) + `enqueue()` / `flush(userId)` / `peek()` / `clear()`
- `endRideSession`: ride_id를 `crypto.randomUUID()`로 사전 생성하여 rides 실패 시에도 ride_paths/zone_events가 같은 id로 큐 적재
- `useNearMissEngine.captureNearMiss`: insert 실패 시 큐 + localStorage 이중 폴백
- `App.jsx`: 정상 사용자 마운트/로그인 변경/`online` 이벤트 시 자동 `flush()` 호출

#### 🟧 P1-1 · `rides_daily` 머티리얼라이즈드 뷰 (쿼리 100배+ 가속)
AdminDashboard의 AGE/NMRE 산출이 rides 전체를 매 호출마다 풀스캔하던 문제 해결.
- 마이그레이션: [`supabase_p1_1_rides_daily.sql`](supabase/migrations/supabase_p1_1_rides_daily.sql)
  - 일별 사전 집계 뷰 + UNIQUE INDEX(CONCURRENTLY refresh용) + RPC `refresh_rides_daily`
  - pg_cron 자동 갱신(매일 03:00 UTC) — 확장 미설치 시 조용히 스킵
- AdminDashboard: 진입 시 RPC 백그라운드 호출 + 60일 윈도우 단일 fetch, AGE/NMRE의 exposure/ride_count 산출을 dailyAggregates 기반으로 전환 (raw rides 풀스캔 폴백 유지)

#### 🟧 P1-2 · ShadowImpactSheet 라이더 인사이트 위젯 신설
기존 5건 합산 통계 카드 위주로 "자기 변화 인지(재방문 동력)"가 약하던 점을 보완.
- **RSR 14일 추이 라인차트**: 일별 평균 RSR + 전일 대비 델타(▲/▼) + 50% 기준선
- **시간대 위험 패턴 히트맵**: 요일 × 시간 7×24 SVG, 강도는 max 대비 비율(rgba 0.2~0.9)
- `nearMisses` 변수를 `allNearMisses`(히트맵용, 전체) + `nearMisses`(리스트용, 10건)로 분리

#### 🟧 P1-3 · Mock 잔재 제거
- `PersonalInsights`의 피크시간 하드코딩("08:00 - 09:00 AM") → `rides.start_time` GROUP BY 최빈 시간대
- `useRideSession`의 `csafe_hazard_reports`(기본값 mock '3') → 본인 `near_miss_events` 카운트 (Supabase + localStorage 폴백)
- ESGDashboard의 "당신의 주행 데이터가 N개의 위험 포트홀을 발견했습니다" 메시지가 실제 데이터와 정합

#### 🟦 P2-A · B2G 정책 시각화 (지자체 설득력)
- 마이그레이션: [`supabase_p2_a_hazard_policy_effect.sql`](supabase/migrations/supabase_p2_a_hazard_policy_effect.sql)
  - RPC `get_hazard_policy_effect(radius_meters, window_days, max_hazards)` — lat/lng 박싱(PostGIS 무의존)으로 hazard별 ±N일 near_miss 카운트 + 감소율(%) 산출
- AdminDashboard Policy Controls 아래 2단 그리드 신규 위젯:
  - **Near-Miss Cluster Map · 30일**: `react-kakao-maps-sdk`의 Map + Circle. event_count 비례 반경(50 + 15×count m) / 투명도(0.2 + 0.5×intensity)
  - **Hazard 정책 효과 · ±30일**: 최근 hazard 5개의 지정 전/후 30일 카운트를 카드 리스트로 비교 (감소 ▼ emerald / 증가 ▲ red)

#### 🛠 같은 날 부속 작업 (UX/안정성)
- 진입 흐름 재구성: **Splash → Language → Disclaimer → Quiz → Map** (이전엔 Language 풀스크린 → Splash+Disclaimer/Quiz 오버레이 혼재)
- 안전 퀴즈 게이트 정책 영속화 (`csafe_quiz_meta`):
  1. 직전 시도 정답 < 3개 → 재노출
  2. 마지막 완료 후 15일 경과 → 재노출
  3. 누적 시도 < 10회 + 안전점수↓ 또는 운전이력↓ → 확률 노출
- 초보자 미션 진행 트리거 통합 (`first_ride` / `helmet_streak_3` / `smooth_5km` / `weekly_streak_7`) — 훅/UI/탭 통합은 이미 있었으나 `progressMission` 호출이 누락된 상태였음
- PWA SW 강제 갱신 + `controllerchange` 자동 reload (`main.jsx`)
- terser `keep_classnames`/`keep_fnames` 활성화로 `html5-qrcode` 내부 클래스 TDZ 충돌 해소

#### 🔴 운영 체크리스트 — Supabase Dashboard SQL Editor에서 4개 마이그레이션 실행 필요
다음 4개 SQL 파일을 순서대로 실행해야 신규 컬럼·테이블·RPC가 적용됩니다(모두 idempotent).
1. `supabase/migrations/supabase_p0_1_rides_extension.sql`
2. `supabase/migrations/supabase_p0_2_zone_events.sql`
3. `supabase/migrations/supabase_p1_1_rides_daily.sql`
4. `supabase/migrations/supabase_p2_a_hazard_policy_effect.sql`

---

### [2026-05-25] 내비게이션 UX 완성

#### ✅ route_ready → SafeCorridorSheet 자동 오픈 플로우 완성
- `App.jsx`: `onRouteReady`에서 `RideSettings` 즉시 오픈 제거
- `useEffect([navStep])`: `route_ready` 감지 시 `SafeCorridorSheet` 자동 팝업
- `SafeCorridorSheet.onClose` → `RideSettings` 자동 전환 (닫기 후 주행 설정)
- `SafeCorridorSheet.onNavigate` → `NavigationLaunchSheet` 전환 (외부 앱 연동)
- 완성된 주행 시작 UX 플로우: 목적지선택 → 안전분석 → 주행설정 → 헬멧인증 → 주행

#### ✅ 검색 결과 UI 풀오버레이 개선
- 기존: 가이드 패널 내부 `max-h-[160px]` 인라인 드롭다운 → 하단 UI와 겹침
- 개선: 화면 전체 `z-[200]` 고정 오버레이로 분리
- 반투명 배경 블러 (탭하면 닫힘) + X 버튼 + 건수 표시
- 아이템에 타입별 이모지 아이콘 + cyan 배지 + 선택 버튼 추가
- `max-h-[70vh]` 스크롤 영역으로 다수 결과도 여유롭게 표시

---

### [2026-05-24] Epic 9: 게임화 · 실데이터 · 내비게이션 경험 완성

#### 🔴 Supabase near_miss_events 마이그레이션 실행 완료
- `near_miss_events` 테이블 DB 적용 → 실제 아차사고 데이터 수집 시작
- RLS 정책 (본인 읽기/쓰기), `get_near_miss_clusters()` RPC 활성화

#### 🟠 온보딩 localStorage 영속화 (C3 버그 수정)
- `hasAgreedDisclaimer` → `useLocalStorage('csafe_agreed_disclaimer')`
- `hasCompletedOnboarding` → `useLocalStorage('csafe_completed_onboarding')`
- 새로고침 시 언어선택→약관→퀴즈 반복 문제 완전 해소

#### 🟡 초보자 미션 시스템 (신규)
- `useBeginnerMissions.js`: 5개 미션 정의, 진행도·완료 상태 localStorage 영속화
- 미션 목록: 첫 안전 주행(+200P) / 헬멧 3연속(+300P★) / 급제동 없이 5km(+500P) / 7일 연속(+1000P★) / 위험 신고(+150P)
- `BeginnerMissionCard.jsx`: 진행도 바 애니메이션, 스트릭 배지, 완료 날짜 표시
- `UserProfileSheet` 탭 분리: 프로필 탭 / 미션 탭
- 미션 완료 시 토스트 알림으로 포인트 지급 안내

#### 🟢 ShadowImpactSheet 실데이터 연동
- `rideHistory` 주행 통계 카드: 횟수·거리·CO₂·속도·아차사고 6개 지표
- 실제 GPS `ride_paths` 경로 → SVG 경로 렌더링 (12샘플 정규화)
- 아차사고 이벤트 위치를 경로 위에 빨간 점으로 오버레이
- 아차사고 이력 리스트 + 최근 주행 기록 섹션 추가
- 데이터 없을 시 기존 목업 애니메이션으로 폴백

#### 🔵 AdminDashboard 레이지 로딩
- `React.lazy()` 적용으로 초기 번들 ~39KB 절감
- `<Suspense>` fallback: 사이버펑크 스타일 스피너
- 관리자 패널 열 때만 코드 청크 로드

#### 🗺️ Safe Corridor 경로 안전 분석 (신규)
- `SafeCorridorSheet.jsx`: 목적지 설정 완료(`route_ready`) 시 자동 팝업
- 직선 경로를 12등분 샘플링 → 600m 이내 위험 구역·보행자 스트레스 존 탐지
- 안전 등급 A~F 자동 산정 (위험 구역 수 기반)
- 위험 구역 목록: 출발점 기준 거리 + 경로 수직 거리 표시

#### 📱 외부 내비게이션 앱 연동 (신규)
- `NavigationLaunchSheet.jsx`: 3단계 동의 플로우
  1. **동의 확인**: 위치 정보 제공 동의 + 목적지 미리보기
  2. **앱 선택**: 카카오맵 / 네이버지도 (선택 localStorage 기억)
  3. **안전 안내**: 화면 주시 금지(법적 의무) · 음성 안내 우선 · 정차 후 확인
- 앱 딥링크(`kakaomap://`, `nmap://`) 시도 → 1.5초 후 웹 폴백 자동 전환
- 출발 시 TTS: `"주행 중 화면 주시를 삼가고 음성 안내에 집중해 주세요. 안전 운행하세요!"`

---

### [2026-05-23] Epic 8: AI Safety Coach + Near-Miss Engine + GPS 최적화

#### 🔧 GPS 중복 워처 제거 (배터리 절약)
- `useHazardWarning`의 자체 `watchPosition` 제거
- `useGeolocation` Zustand 스토어 구독으로 전환

#### ✨ useNearMissEngine (전략적 데이터 자산)
- 위험 수준 달성 시 아차사고 이벤트 자동 캡처
- Supabase `near_miss_events` 저장 + localStorage 폴백 + 3초 쿨타임

#### ✨ AISafetyCoach (주행 후 AI 코칭)
- 결정론적 룰 기반 코칭 (급제동/속도/헬멧/성장 추세)
- 원형 안전 점수 게이지, 최대 3개 인사이트 카드

---

### [2026-05-23] Epic 7: 주행 시퀀스 안정화 + ID 영속화

- **Edge AI 주행 시퀀스 통합**: 목적지 선택 → Ride Control → 헬멧 인증 → 주행 시작 필수 관문화
- **사용자 ID 영구 고정**: `c_safe_device_id`로 기기 고유 ID 생성, 재시작 시 동일 ID 재사용
- **PWA 즉시 갱신**: `skipWaiting: true` + `clientsClaim: true`로 배포 즉시 업데이트
- **하단 내비게이션 고정**: `grid grid-cols-5`로 레이아웃 고정, 닉네임 5글자 트런케이션

---

### [2026-05-20] Epic 6: Vibe TTS 연동 + RLS 보안 강화

- Vibe 경로 + 선호도 + 운행 모드 결합 동적 TTS 안내
- `rides` / `ride_paths` 테이블 RLS 정책 수립 (본인 + service_role만 접근)

---

### [2026-05-16] Epic 5: Edge AI MVP + 주행 제어 고도화

- ONNX Runtime WASM 헬멧 감지 파이프라인 완성
- `DrivingConsoleUI` 속도 제어 시스템 도입
- VIBE 에코모드(유유자적) 추가 + 동적 시간/거리 계산

---

### [2026-05-15] Epic 4: PostGIS 공간 아키텍처 전환

- `get_nearby_hazards` RPC로 클라이언트 O(N) 연산 → 서버 공간 인덱스 이관
- 10m 이동 쓰로틀링으로 CPU 과부하 방지

---

### [2026-05-14] Epic 3: Safe-Route + 맞춤형 주행 콘솔

- SafeRouteService: 교통량·자전거도로 기반 경로 점수화
- ProfileControlService: 초보자(15km/h 강제) + 시니어(소프트 브레이킹) 모드
- ProfileEditModal: 닉네임·아바타·나이 편집 + DB/로컬 즉시 반영

---

### [2026-05-13] Epic 2: 관리자 허브 + 온보딩 최적화

- AdminDashboard: AI 추천 / 보행자 스트레스 / Vibe Designer 3대 모드
- FAB 통합 관리 + 하단 버튼 겹침 해소
- SafetyQuiz Supabase 406 에러 수정 (`maybeSingle` + `upsert`)

---

### [2026-05-12] Epic 1: 지도 UI 정비 + 코어 안정화

- `MapContainer` Hooks 순서 오류 + 무한 루프 해결
- PM 주차 구역 'P' 마커 + 터치 목적지 설정
- 디지털 트윈 시뮬레이터 복구

---

## 📈 비즈니스 확장성

1. **B2G**: 위험 구간·아차사고 데이터를 지자체에 제공 → 인프라 개선 근거
2. **보험사**: 헬멧 인증·안전 주행 데이터 기반 PM 전용 보험 연계
3. **정책 추천 엔진**: 위험 클러스터 → 속도제한구역·주차정책 자동 제안 (개발 중)
4. **플랫폼 확장**: AR 주차 가이드 / 음성 기반 완전 핸즈프리 주행

---

## 📦 배포 및 실행

```bash
# 로컬 개발
cd c-pm-safety
npm install
npm run dev

# 프로덕션 빌드
npm run build

# 환경 변수 (.env)
VITE_KAKAO_MAP_API_KEY=your_kakao_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Production URL**: https://safety-app-seven.vercel.app/

---

*C-Safe Security Protocol V3.0 — AI-Powered Urban Mobility Safety Platform*  
*Protected by Advanced Agentic Coding | Last updated: 2026-05-25*
