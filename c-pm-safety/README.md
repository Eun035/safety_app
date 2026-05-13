# C-Safe: PM Safety Integration Platform

## 🚀 프로젝트 개요
C-Safe는 전동 킥보드(PM) 사용자의 안전을 최우선으로 하는 스마트 시티 모빌리티 플랫폼입니다. 실시간 도로 데이터, AI 위험 분석, 그리고 지정 주차 구역(Station) 시스템을 결합하여 최적의 안전 주행 경험을 제공합니다.

## 🛠 최근 업데이트 (2026-05-13)

### 1. 시스템 안정성 및 크래시(ReferenceError) 완벽 대응
- **변수 참조 오류 근절**: 시스템 초기화를 방해하던 고질적인 `ReferenceError: isFollowMode is not defined` 현상을 추적하여, 프로젝트 전체에서 상태명을 `gpsFollowMode`로 전면 교체함으로써 전역 스코프 충돌 문제를 원천 차단했습니다.
- **아이콘 임포트 누락 복구**: UI 컴포넌트 이동 중 발생한 `Share2` 아이콘 참조 오류를 즉시 복구하여 런타임 시스템 다운을 방지했습니다.

### 2. 관리자 허브(Admin Strategy Center) 3대 모드 완성
- **AI Station Recommendation (Red)**: 사고 저감율 데이터 기반으로 도출된 최적의 헬멧 스테이션 설치 지점을 화려한 네온 레드(Neon Red) 이중 서클과 오버레이로 강조 표시했습니다.
- **Pedestrian Stress Map (Orange)**: 보행자-PM 상충 데이터가 집중된 위험 구역을 스트레스 지수(Level)에 비례하는 크기와 점선 오버레이로 정교하게 시각화했습니다.
- **Vibe Designer (Green)**: 안전 최우선, 노을 맛집 등 사용자의 취향과 주행 목적을 반영한 실제 경로 좌표를 폴리라인(Polyline)으로 지도상에 구현하여 경로 제안 기능을 실체화했습니다.

### 3. UI 컴포넌트 구조화 및 겹침 방지(Layout Cleanup)
- **지도 컨트롤 일원화**: `App.jsx`와 `MapContainer.jsx` 양쪽에 분산되어 중복 표시되던 GPS, 화면 공유, PM 가시성 토글 버튼들을 제거하고 `App.jsx`의 플로팅 액션 버튼(FAB)으로 통합 관리하도록 아키텍처를 개편했습니다.
- **수직 간격 최적화**: 화면 하단의 모드 선택 패널과 우측 하단 툴바가 모바일 환경에서 겹치지 않도록 FAB 그룹의 높이를 대폭 상향 조정(bottom-40)하여 쾌적한 뷰를 확보했습니다.

### 4. 온보딩 시퀀스 최적화 (프레젠테이션 모드)
- **로컬 캐시 무효화**: 언어 선택 → 스플래시(인코딩) → 면책조항 → 안전 퀴즈 → 지도 확인으로 이어지는 초기 온보딩 흐름이 브라우저 캐시(`localStorage`)로 인해 생략되는 현상을 방지했습니다. 상태 관리를 휘발성 `useState`로 변경하여 매번 접속 시 완벽한 시퀀스가 순차적으로 진행되도록 시연 환경을 극대화했습니다.

## 🌐 기술 스택
- **Frontend**: React 19, Tailwind CSS, Vite
- **Maps**: Kakao Maps SDK
- **Backend**: Supabase (Realtime DB), Local AI Analysis Server
- **UI Components**: Lucide React, Framer Motion

## 📦 배포 및 실행
- **Production**: Vercel (https://pm-onaj.vercel.app/)
- **Local Dev**: `npm run dev`

---
*C-Safe Security Protocol V2.4 - Protected by Advanced Agentic Coding.*
