# C-Safe: PM Safety Integration Platform

## 🚀 프로젝트 개요
C-Safe는 전동 킥보드(PM) 사용자의 안전을 최우선으로 하는 스마트 시티 모빌리티 플랫폼입니다. 실시간 도로 데이터, AI 위험 분석, 그리고 지정 주차 구역(Station) 시스템을 결합하여 최적의 안전 주행 경험을 제공합니다.

## 🛠 최근 업데이트 (2026-05-12)

### 1. 시스템 안정성 및 성능 최적화
- **렌더링 무한 루프 해결**: `MapContainer.jsx`에서 발생하던 Hooks 호출 순서 오류 및 상태 업데이트 무한 루프를 완전히 해결하여 서비스 안정성을 확보했습니다.
- **Geolocation 탄력성 강화**: GPS 신호 지연이나 타임아웃 발생 시에도 트래킹이 중단되지 않고 가상의 보정 데이터를 활용하도록 로직을 고도화했습니다.

### 2. UI/UX 미니멀리즘 및 시인성 개선
- **클린 맵 뷰(Clean Map View)**: 지도 가독성을 방해하던 불필요한 목 데이터(24.5KM)와 상태 배지를 제거하여 지도를 더 넓고 쾌적하게 볼 수 있도록 개선했습니다.
- **메인 액션 바 최적화**: 사용 빈도가 낮은 카메라 버튼을 제거하고, '주행 시작' 버튼을 가로 전체로 확장하여 주행 전 조작의 편의성을 극대화했습니다.
- **아이콘 참조 오류 수정**: 시스템 전체 다운의 원인이었던 `Unlock`, `Leaf`, `X` 아이콘의 누락된 참조를 복구했습니다.

### 3. 지능형 주차 구역(P) 연동 및 목적지 설정
- **P 마커 도입**: 지도상에 PM 전용 주차 구역을 파란색 'P' 배지로 표시하여 직관적으로 식별할 수 있게 했습니다.
- **스마트 목적지 선택**: '주행 시작' 모드에서 지도상의 'P' 마커를 클릭하면 자동으로 해당 위치가 목적지로 설정되는 인터랙션을 추가했습니다.
- **리워드 기반 유도**: 안전 주차 시 제공되는 혜택 정보를 마커 클릭 시 안내하여 올바른 주차 문화를 장려합니다.

### 4. 디지털 트윈 및 시뮬레이터 복구
- **Fallback 데이터 연동**: 주행 중이 아닐 때도 C-Safe 로고 클릭 시 디지털 트윈 시뮬레이터에 접속하여 주행 가상 시나리오를 확인할 수 있도록 기능을 복구했습니다.

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
