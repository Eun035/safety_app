# C-Safe: PM Safety Integration Platform

## 🚀 프로젝트 개요
C-Safe는 전동 킥보드(PM) 사용자의 안전을 최우선으로 하는 스마트 시티 모빌리티 플랫폼입니다. 실시간 도로 데이터, AI 위험 분석, 그리고 지정 주차 구역(Station) 시스템을 결합하여 최적의 안전 주행 경험을 제공합니다.

## 📜 개발 일지 및 업데이트 내역 (Changelog)

### [2026-05-15] Epic 3: 시스템 성능 최적화 및 PostGIS 기반 공간 데이터 아키텍처 전환
1. **PostGIS 기반 '서버 사이드 근접 알림' 시스템 구축**
   - 클라이언트(폰)에서 수행하던 O(N) 거리 연산 부하를 서버의 공간 인덱스(GiST)로 이관.
   - `get_nearby_hazards` RPC를 통해 반경 50m 이내 위험 구역을 초고속으로 탐색 및 통보.
   - 네트워크 장애 시를 대비한 '로컬-서버 하이브리드' 폴백(Fallback) 안전장치 구현.
2. **주행 중 CPU 과부하 방지 '연산 쓰로틀링' 적용**
   - `useHazardWarning` 내 10m 단위 거리 변화 감지 로직 도입으로 불필요한 반복 연산 90% 제거.
   - 배터리 소모 최적화 및 `Digital Twin Lite` UI 애니메이션의 60FPS 안정성 확보.
3. **주행 기록 영속성 및 UI 디테일 개선**
   - `useRideSession` 내 데이터 로드 로직 수정을 통해 앱 재시작 시 주행 기록 유실 문제 해결.
   - 사용자 프로필 내 네임태그 하단 배지 레이아웃을 1열 그리드로 정렬하여 가독성 및 UI 일관성 강화.
4. **주행 요약(Ride Summary) 화면의 지능형 버튼 기능 명세화**
   - **'Share to Instagram'**: Web Share API를 활용한 실시간 주행 성과 공유 및 데스크톱 환경에서의 자동 사진 다운로드/문구 복사 폴백 로직 정립.
   - **'포인트 교환'**: 주행 숙련도 및 안전 지수 기반의 타겟팅 광고(Targeted Ad Banner) 연동 및 리워드 교환 버튼 배치.

### [2026-05-14] Epic 1: PM 전용 '안전 경로 내비게이션 (Safe-Route API)'
1. **Safe-Route API 백엔드 로직 연동**
   - 지자체 교통량 데이터 및 자전거도로 비율을 점수화하여 최적의 안전 경로 알고리즘(`SafeRouteService`) 구현.
   - 우회 거리에 비례하여 Safe-to-Earn 포인트 자동 계산 및 지급 로직 구축.
2. **50m 전 햅틱 및 음성(TTS) 알림 지원**
   - `navigator.geolocation` 기반 사용자 실시간 위치 추적 훅(`useSafeNavigation`) 적용.
   - 경로 상 사고 다발 교차로 진입 50m 전 모바일 기기 진동 및 Web Speech API 기반 경고 알림 송출.
3. **지도 내 UI/UX 시각화 반영**
   - Kakao Map 상에 추천된 안전 경로(Polyline)와 위험 지역(Circle) 동적 렌더링.
   - 주행 준비(`route_ready`) 단계에서 추가 획득 포인트 및 예상 소요 시간 직관적 노출.

### [2026-05-14] Epic 2: 사용자 숙련도 기반 '맞춤형 주행 콘솔' 및 핵심 시스템 디버깅
1. **사용자 숙련도 맞춤형 프로필 API (`ProfileControlService`) 적용**
   - 시니어 안심 모드(65세 이상) 진입 시 급가속 차단 및 제동거리 연장(소프트 브레이킹) 제어값 산출 로직 구현.
   - 초보자 모드(주행 5회 미만) 진입 시 UI 설정과 무관하게 시스템 상 최고 속도를 15km/h로 강제 하향 제한.
   - 잘못된 데이터 주입에 대비하여 `NaN` 오류 및 앱 크래시를 방지하는 철저한 방어 코드 설계.
2. **사이버/매트 블랙 테마의 주행 콘솔 UI (`DrivingConsoleUI`) 구현**
   - 기존 모바일(React Native) 규격의 코드를 웹(React DOM + Tailwind CSS) 환경으로 완벽히 이식 및 최적화.
   - 실시간 사용자 상태에 맞춰 속도 슬라이더(Range Input)의 최대값을 동적으로 제어하고 시각적 피드백 제공.
   - 메인 화면(`App.jsx`) 우측 하단 플로팅 액션 버튼(FAB) 도구 모음에 주행 콘솔 토글 연동 완료.
3. **주행 안전 코어 로직 디버깅 (안정성 및 배터리 최적화)**
   - `MapContainer` 내 `useSafeNavigation`의 참조 무결성 오류로 인한 Geolocation(위치 추적) 무한 재실행 버그 해결.
   - `SafeRouteService` 내부의 자바스크립트 `sort()` 원본 배열 훼손(Mutation)으로 인한 데이터 오염 위험 차단.
   - 목적지 재설정 시 기존 위험 구역 알림(`Haptic/TTS`) 캐시가 남아있어 알림이 무음 처리되던 로직 결함 수정.
4. **맞춤형 프로필 편집 기능 (`ProfileEditModal`) 및 UI/UX 시각화 고도화**
   - 닉네임, 아바타(사이버 봇), 나이를 자유롭게 수정하고 전역 상태(`useUserStore`)와 Supabase DB에 즉시 반영하는 편집 모달 구현.
   - 입력된 나이 데이터는 `DrivingConsoleUI`의 '시니어 안심 주행 모드' 활성화 조건으로 실시간 연동.
   - 내 프로필 화면 내 안전 정체성 레이더 차트의 텍스트 잘림 현상을 SVG `ViewBox` 조율을 통해 해결하며, 사이버펑크 미니멀리즘 디자인 톤 유지.
   - 좁은 모바일 해상도에서 업적 배지 글자가 두 줄로 꺾이는 현상(`Wrap`)을 CSS 속성 최적화로 완벽 방지.

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
