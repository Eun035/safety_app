# C-Safe — AI-Powered Urban Mobility Safety Platform

> **"초보 라이더의 습관을 바꾸고, 도시의 안전을 데이터로 설계한다."**

🌐 **Production**: https://safety-app-seven.vercel.app/  
📁 **App Source**: [`c-pm-safety/`](./c-pm-safety)  
📋 **Detailed Docs**: [`c-pm-safety/README.md`](./c-pm-safety/README.md)

---

## 🚀 What is C-Safe?

C-Safe는 전동 킥보드(PM) **초보 라이더**를 위한 AI 기반 도시 모빌리티 행동 개선 플랫폼입니다.

단순한 안전 지도가 아닙니다.  
라이더가 **더 안전해질수록, 앱에 더 의존하도록** 설계된 행동 진화 시스템입니다.

```
사용자가 느끼는 것: "C-SAFE가 나를 자동으로 보호하고 있다."
실제로 일어나는 것: 모든 주행이 도시 안전 데이터 자산으로 축적된다.
```

---

## ✨ 현재 구현된 핵심 기능

| 기능 | 상태 |
|------|------|
| Edge AI 헬멧 인증 (ONNX/WASM) | ✅ 완료 |
| Haversine 지오펜싱 주차 검증 | ✅ 완료 |
| PostGIS 실시간 위험 근접 경보 | ✅ 완료 |
| 물리 엔진 기반 제동거리 계산 | ✅ 완료 |
| VIBE 경로 시스템 (3가지 경로) | ✅ 완료 |
| B2G 관리자 대시보드 | ✅ 완료 |
| 안전 교육 퀴즈 온보딩 (+500P) | ✅ 완료 |
| 다국어 지원 (KO/EN/JA/ZH) | ✅ 완료 |
| **AI Safety Coach** (주행 후 개인화 코칭) | ✅ **2026-05-23 신규** |
| **Near-Miss Event Engine** (아차사고 데이터 수집) | ✅ **2026-05-23 신규** |
| **GPS 단일 워처 최적화** (배터리 절약) | ✅ **2026-05-23 수정** |
| Beginner Mission System | 🔜 예정 |
| Urban Policy Recommendation Engine | 🔜 예정 |

---

## 🏗 기술 스택

- **Frontend**: React 19, Vite 8, Tailwind CSS v4
- **State**: Zustand (다중 스토어)
- **Maps**: Kakao Maps SDK
- **Backend**: Supabase (Postgres + Realtime + PostGIS)
- **AI/ML**: ONNX Runtime Web (WASM)
- **PWA**: vite-plugin-pwa

---

## 📂 프로젝트 구조

```
safety_app/
├── c-pm-safety/          ← 메인 React 앱
│   ├── src/
│   │   ├── components/   ← 34개 UI 컴포넌트
│   │   ├── hooks/        ← 13개 커스텀 훅
│   │   ├── services/     ← 3개 서비스 모듈
│   │   └── utils/        ← 거리/물리/안전점수 유틸
│   └── supabase/
│       └── migrations/   ← DB 스키마 마이그레이션 SQL
├── vercel.json           ← 배포 설정
└── README.md             ← 이 파일
```

---

## 🔄 최근 업데이트 (2026-05-23)

### 🔧 GPS 중복 워처 제거
`useHazardWarning`이 자체 `watchPosition`을 실행하던 문제 해결.  
`useGeolocation` Zustand 스토어를 공유하여 GPS 워처를 1개로 통합 → **배터리 절약**

### ✨ Near-Miss Event Engine
아차사고 이벤트(GPS·속도·날씨·스트레스존·헬멧 착용·위험구역)를 자동 수집하여 Supabase에 저장.  
도시 위험 예측 및 정책 추천의 핵심 데이터 모트 자산.

### ✨ AI Safety Coach
매 주행 후 자동 표시되는 개인화 코칭 카드.  
결정론적 룰 기반으로 완전히 설명 가능한 안전 점수(0~100)와 최대 3개 인사이트 제공.

---

## 🚀 빠른 시작

```bash
cd c-pm-safety
npm install
npm run dev
```

---

*C-Safe Security Protocol V3.0 | Last updated: 2026-05-23*
