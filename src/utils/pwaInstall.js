// PWA 설치(홈 화면에 추가) 헬퍼.
// beforeinstallprompt 이벤트는 앱 로드 초기에 한 번 발생하므로, 이 모듈을 main.jsx에서
// import(부수효과)하여 리스너를 즉시 등록하고 이벤트를 보관한다.
let deferredPrompt = null;
let installed = false;

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();          // 브라우저 기본 미니 인포바 방지 → 우리가 원할 때 prompt()
        deferredPrompt = e;
    });
    window.addEventListener('appinstalled', () => {
        installed = true;
        deferredPrompt = null;
    });
}

/** 설치 프롬프트를 바로 띄울 수 있는 상태인지 */
export const canInstallApp = () => !!deferredPrompt;

/** 이미 PWA(스탠드얼론)로 실행 중인지 */
export const isStandalone = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

/**
 * 앱 설치 프롬프트 실행.
 * @returns {Promise<'accepted'|'dismissed'|'installed'|'unavailable'>}
 */
export async function promptAppInstall() {
    if (installed || isStandalone()) return 'installed';
    if (!deferredPrompt) return 'unavailable';   // iOS Safari 등 미지원 → 호출부에서 안내
    try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        return outcome; // 'accepted' | 'dismissed'
    } catch {
        deferredPrompt = null;
        return 'unavailable';
    }
}
