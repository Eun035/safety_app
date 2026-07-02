import QRCode from 'qrcode';

const SS_KEY = 'csafe_pending_referral'; // sessionStorage 키 — 가입 직전까지 보관

/**
 * 페이지 진입 시점에 URL에서 추천 코드·UTM 파라미터를 캡처해 sessionStorage에 저장.
 * - /r/CODE 경로 또는 ?ref=CODE 쿼리 모두 지원
 * - 한 세션에 한 번만 저장 (먼저 들어온 추천 코드 우선)
 * - SPA 동작상 App.jsx 최상단 useEffect에서 1회 호출
 */
export function captureReferralFromUrl() {
    if (typeof window === 'undefined') return null;
    if (sessionStorage.getItem(SS_KEY)) return null; // 이미 캡처됨

    const url = new URL(window.location.href);
    const pathMatch = url.pathname.match(/^\/r\/([A-Z0-9]{4,12})/i);
    const code = (pathMatch?.[1] || url.searchParams.get('ref') || '').toUpperCase();
    if (!code) return null;

    const payload = {
        code,
        utm_source:   url.searchParams.get('utm_source')   || 'direct',
        utm_medium:   url.searchParams.get('utm_medium')   || null,
        utm_campaign: url.searchParams.get('utm_campaign') || null,
        landed_at: new Date().toISOString()
    };
    try {
        sessionStorage.setItem(SS_KEY, JSON.stringify(payload));
    } catch (e) { /* private mode 등 */ }
    return payload;
}

/** sessionStorage에 캡처된 추천 정보 조회 (없으면 null). */
export function readPendingReferral() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(SS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

/** 가입·연결 완료 후 캡처 정보를 비운다. */
export function clearPendingReferral() {
    if (typeof window === 'undefined') return;
    try { sessionStorage.removeItem(SS_KEY); } catch (e) { /* noop */ }
}

/**
 * 사용자 ID → 짧은 추천 코드 (6자, 영문 대문자 + 숫자).
 *
 * Task 4에서 Supabase referrals 테이블에 (user_id, code) UNIQUE로 저장되며,
 * 충돌 시 재시도 로직이 추가된다. 1차 구현은 결정론적 base36 6자리 → 시드 100명
 * 규모에선 충돌 거의 0.
 */
export function buildReferralCode(userId) {
    if (!userId) return 'CSAFE0';
    const raw = String(userId).replace(/[^a-zA-Z0-9]/g, '');
    // userId 끝 12자리 → base36 압축. 짧고 가독성 좋게 대문자화.
    const tail = raw.slice(-12).toUpperCase();
    return tail.slice(0, 6) || 'CSAFE0';
}

/**
 * 추천 코드 → 외부 진입 URL.
 * Task 6에서 /r/:code 라우팅이 추가되며 진입 시 환영·시연 모드로 안내.
 * UTM 파라미터는 광고가 아닌 자가 분석용.
 */
export function buildReferralUrl(code) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://c-pm-safety.vercel.app';
    return `${origin}/?ref=${code}&utm_source=instagram&utm_medium=ride_card&utm_campaign=user_share`;

}

/**
 * URL → QR 코드 PNG dataURL.
 * 캡처 카드 우하단에 그대로 삽입된다.
 */
export async function generateQrDataUrl(url, sizePx = 320) {
    try {
        return await QRCode.toDataURL(url, {
            width: sizePx,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' }
        });
    } catch (e) {
        console.warn('[referral] QR generation failed:', e);
        return null;
    }
}
