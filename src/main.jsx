import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './locales/i18n' // Phase 11: 다국어 적용
import './utils/pwaInstall' // beforeinstallprompt 리스너 조기 등록 (앱 설치 버튼용)
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary'

// PWA Service Worker — 매 방문마다 백그라운드 update 체크만 수행, auto-reload는 안 함.
// 사용자 체감 이슈: 옛 SW가 새 SW로 교체될 때마다 controllerchange → reload가 일어나
//   "스플래시(헬멧 영상) → 언어 선택 잠깐 → 스플래시 재시작" 흐름 단절이 발생함.
// 해결: reload를 트리거하지 않고, 새 코드는 다음 자연스러운 페이지 진입(앱 재시작/탭 새로고침)에서
//   자동 적용되도록 위임. clientsClaim + skipWaiting은 vite.config.js에서 이미 켜져 있어
//   다음 진입 시 곧바로 새 SW가 컨트롤함.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.update());
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
