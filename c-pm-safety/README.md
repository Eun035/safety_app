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
├── App.jsx                      ← 전역 상태 코디네이터 (~1,250 lines)
├── components/
│   ├── admin/
│   │   └── AdminDashboard.jsx   ← B2G 정책 대시보드 (39KB)
│   ├── common/                  ← 34개 UI 컴포넌트
│   │   ├── AISafetyCoach.jsx    ← ✨ NEW: 주행 후 AI 코칭 카드
│   │   ├── HelmetDetectionCamera.jsx
│   │   ├── RideSummaryModal.jsx
│   │   ├── UserProfileSheet.jsx
│   │   └── ...
│   └── map/                     ← MapContainer (52KB), VibeRouteSelector 등
├── hooks/
│   ├── useNearMissEngine.js     ← ✨ NEW: 아차사고 이벤트 캡처 엔진
│   ├── useHazardWarning.js      ← 🔧 FIXED: GPS 중복 워처 제거
│   ├── useRideSession.js        ← 주행 세션 상태 머신
│   ├── useUserStore.js          ← 인증 + 프로필 영속화
│   ├── useGeolocation.js        ← 단일 GPS 라이프사이클 (Zustand)
│   ├── useSafeData.js           ← Supabase 실시간 + 날씨 + TAGO PM
│   ├── useEdgeAI.js             ← ONNX/WASM 헬멧 감지 (10FPS)
│   ├── useVoiceGuidance.js      ← TTS 래퍼 (다국어 지원)
│   ├── useHazardWarning.js      ← PostGIS RPC + 로컬 폴백 근접 경보
│   └── ...
├── services/
│   ├── B2GExportService.js      ← 지자체 CSV 데이터 내보내기
│   ├── SafeRouteService.js      ← 안전 경로 계산
│   └── ProfileControlService.js
├── utils/
│   ├── distance.js              ← Haversine 거리 계산
│   ├── physics.js               ← 제동 거리 물리 엔진
│   └── safetyScoring.js         ← 격자 기반 안전 점수 집계
└── data/
    ├── pm_parking_data.json     ← 천안시 PM 주차 구역 410개소
    ├── accidentHeatmap.json     ← 사고 발생 히트맵 데이터
    └── safetyGrid.json          ← 안전 구역 격자 정의
```

---

## 🗃 Supabase 데이터 스키마

| 테이블 / RPC | 목적 |
|-------------|------|
| `profiles` | 사용자 프로필: 포인트, 안전점수, 누적거리, 닉네임 |
| `hazards` | 커뮤니티 신고 위험 구역 (실시간 Realtime 구독) |
| `rides` | 주행 세션 기록 (시작/종료 시각, 거리, 안전 여부) |
| `ride_paths` | 세션별 GPS 경로 좌표 배열 |
| `near_miss_events` | ✨ NEW: 아차사고 이벤트 (GPS + 맥락 데이터) |
| RPC `get_nearby_hazards` | PostGIS 공간 쿼리 (반경 위험 구역 탐색) |
| RPC `update_safety_scores` | 격자 단위 안전 점수 집계 |
| RPC `increment_user_stats` | 원자적 포인트 + 거리 누적 |
| RPC `get_near_miss_clusters` | ✨ NEW: 위험 클러스터 분석 (Admin용) |

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
    → 카카오맵에서 목적지 선택
    → RideSettings (차량 종류 + 속도 제한)
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

### [2026-05-23] Epic 8: AI Safety Coach + Near-Miss Engine + GPS 최적화

#### 🔧 GPS 중복 워처 제거 (배터리 절약)
- `useHazardWarning`의 자체 `watchPosition` 제거
- `useGeolocation` Zustand 스토어 구독으로 전환
- 모든 위험 감지 로직(PostGIS RPC, 로컬 폴백, TTS) 100% 보존

#### ✨ useNearMissEngine (전략적 데이터 자산)
- 위험 수준 달성 시 아차사고 이벤트 자동 캡처
- GPS·속도·날씨·스트레스존·헬멧·위험구역 맥락 수집
- Supabase `near_miss_events` 테이블 저장 + localStorage 폴백
- 3초 쿨타임으로 중복 이벤트 방지

#### ✨ AISafetyCoach (주행 후 AI 코칭)
- `RideSummaryModal` 닫힌 후 자동 표시
- 결정론적 룰 기반 코칭 (급제동/속도/헬멧/성장 추세)
- 원형 안전 점수 게이지 (0~100점)
- 최대 3개 인사이트 카드 (인지 부하 최소화)

#### 🗃️ Supabase 마이그레이션
- `near_miss_events` 테이블 + RLS 정책
- `get_near_miss_clusters()` RPC (관리자 위험 클러스터 분석)

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
*Protected by Advanced Agentic Coding | Last updated: 2026-05-23*
