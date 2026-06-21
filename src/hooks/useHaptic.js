import { useCallback } from 'react';

// 🎚️ L1~L4 햅틱 패턴 — 청각(외부 스피커)이 풍절음·교통소음에 약해진 만큼
// 진동 패턴으로 위급도를 구분 가능하게 한다. 이어폰 금지 정책의 보완 채널.
//   L1 "주의"   : 짧게 1회      (·)
//   L2 "근접"   : 짧게 2회      (· ·)
//   L3 "진입"   : 짧게-짧게-길게 (· · —)
//   L4 "위반"   : 길게 연속      (— — —)
const HAPTIC_PATTERNS = {
    L1: [80],
    L2: [80, 80, 80],
    L3: [80, 60, 80, 60, 240],
    L4: [240, 100, 240, 100, 240]
};

// iOS PWA는 navigator.vibrate 미지원. Capacitor 네이티브 래핑 후
// @capacitor/haptics 로 자동 업그레이드 가능하도록 추상화 계층 유지.
export const useHaptic = () => {
    const isSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

    const vibrate = useCallback((level = 'L2') => {
        if (!isSupported) return false;
        const pattern = HAPTIC_PATTERNS[level] || HAPTIC_PATTERNS.L2;
        try {
            return navigator.vibrate(pattern);
        } catch (e) {
            console.warn('[useHaptic] vibrate failed:', e);
            return false;
        }
    }, [isSupported]);

    const stop = useCallback(() => {
        if (!isSupported) return;
        try { navigator.vibrate(0); } catch (e) { /* noop */ }
    }, [isSupported]);

    return { vibrate, stop, isSupported };
};
