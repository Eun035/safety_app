import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './locales/i18n' // Phase 11: 다국어 적용
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary'

// PWA Service Worker 강제 갱신: 매 방문마다 새 빌드 체크 + 실제 UPDATE 시에만 reload
// (첫 SW 설치는 controllerchange도 발생시키는데, 이걸 reload하면 온보딩 흐름이 중단됨)
if ('serviceWorker' in navigator) {
  // 이 listener가 등록되는 시점에 이미 controller가 있었는지 = 이전 방문에서 SW가 설치돼 있던 상태
  const hadControllerOnLoad = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.update());
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    // 첫 SW 설치(이전 controller 없음)는 reload 스킵 — 온보딩 중간 단절 방지
    if (!hadControllerOnLoad) {
      console.log('[C-Safe] SW first-install controllerchange — reload skipped');
      return;
    }
    console.log('[C-Safe] SW update controllerchange — reloading to apply new version');
    refreshing = true;
    window.location.reload();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
