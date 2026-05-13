# C-Safe: PM Safety Integration Platform

## 🚀 프로젝트 개요
C-Safe는 전동 킥보드(PM) 사용자의 안전을 최우선으로 하는 스마트 시티 모빌리티 플랫폼입니다. 실시간 도로 데이터, AI 위험 분석, 그리고 지정 주차 구역(Station) 시스템을 결합하여 최적의 안전 주행 경험을 제공합니다.

## 📜 개발 일지 및 업데이트 내역 (Changelog)

### [2026-05-13] 관리자 허브 고도화 및 안정성 대폭 향상
1. **시스템 안정성 및 크래시(ReferenceError) 완벽 대응**
   - 시스템 초기화를 방해하던 고질적인 `isFollowMode` 참조 에러를 추적하여 전역 `gpsFollowMode`로 전면 교체함으로써 충돌 원천 차단.
   - UI 컴포넌트 이동 중 누락된 `Share2` 아이콘 참조 오류를 즉시 복구하여 런타임 다운 방지.
2. **관리자 허브(Admin Strategy Center) 3대 모드 완성**
   - **AI 추천 (Red)**: 사고 저감율 기반 최적의 헬멧 스테이션 설치 지점을 화려한 네온 오버레이로 강조.
   - **보행자 스트레스 (Orange)**: 상충 데이터 집중 구역을 스트레스 지수(Level)에 비례하게 정교하게 시각화.
   - **Vibe Designer (Green)**: 사용자 취향(노을 맛집 등) 반영 실제 경로를 폴리라인(Polyline)으로 실체화.
3. **UI 컴포넌트 구조화 및 겹침 방지**
   - 분산되었던 GPS, 화면 공유, PM 가시성 토글 버튼들을 `App.jsx` 플로팅 액션 버튼(FAB)으로 통합 관리.
   - 모바일 환경에서 하단 버튼들과 겹치지 않도록 FAB 그룹 높이를 대폭 상향(bottom-40).
4. **온보딩 시퀀스 최적화 및 핫픽스**
   - 브라우저 캐시(`localStorage`)를 무효화하여 접속 시마다 언어 선택부터 지도 확인까지 온보딩이 순차 진행되도록 시연 환경 극대화.
   - 안전 퀴즈 통과 시 발생하던 `Supabase 406 Not Acceptable` 에러를 `.maybeSingle()`과 `upsert` 로직으로 대체하여 포인트 즉각 생성 및 지급.
   - 카카오맵 'P' 마커의 모바일 터치 무시 현상을 `clickable={true}` 속성 적용 및 중복 이벤트 제거로 완벽 복구.

### [2026-05-12] UI/UX 1차 개편 및 로직 최적화
1. **시스템 안정성 및 성능 최적화**
   - `MapContainer.jsx`의 Hooks 호출 순서 오류 및 상태 업데이트 무한 루프를 해결하여 렌더링 최적화.
   - GPS 신호 지연 시 가상의 보정 데이터를 활용하도록 Geolocation 탄력성 강화.
2. **UI/UX 미니멀리즘 및 시인성 개선**
   - 지도 가독성을 방해하던 불필요한 목 데이터와 상태 배지를 제거하는 '클린 맵 뷰' 적용.
   - 카메라 버튼 제거 및 '주행 시작' 버튼 가로 확장으로 메인 액션 바 조작 편의성 극대화.
3. **지능형 주차 구역(P) 연동 및 목적지 설정**
   - PM 전용 주차 구역 파란색 'P' 배지 도입 및 터치 시 자동 목적지 설정 인터랙션 추가.
   - 안전 주차 시 제공되는 리워드 혜택 안내를 통한 올바른 주차 문화 장려.
4. **디지털 트윈 및 시뮬레이터 복구**
   - 로고 클릭 시 주행 가상 시나리오를 확인할 수 있는 디지털 트윈 시뮬레이터 접속 기능 복구.

## 🌐 기술 스택
- **Frontend**: React 19, Tailwind CSS, Vite
- **Maps**: Kakao Maps SDK
- **Backend**: Supabase (Realtime DB), Local AI Analysis Server
- **UI Components**: Lucide React, Framer Motion

## 📦 배포 및 실행
- **Production**: Vercel (https://safety-app-seven.vercel.app/)
- **Local Dev**: `npm run dev`

---
*C-Safe Security Protocol V2.4 - Protected by Advanced Agentic Coding.*
