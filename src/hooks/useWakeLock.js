import { useEffect, useRef } from 'react';
import { usePageVisibility } from './usePageVisibility';

// Screen Wake Lock: 라이딩처럼 활성 사용 중인 화면이 절전 모드로 꺼지지 않게 유지한다.
// 브라우저는 탭이 백그라운드로 가면 wake lock을 자동 해제하므로, 다시 visible이 되면
// active=true인 동안 자동 재획득한다. 미지원 브라우저(특히 일부 iOS WebView)에선 no-op.
export const useWakeLock = (active) => {
    const sentinelRef = useRef(null);
    const isVisible = usePageVisibility();

    useEffect(() => {
        const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

        const release = async () => {
            const sentinel = sentinelRef.current;
            if (!sentinel) return;
            sentinelRef.current = null;
            try {
                await sentinel.release();
            } catch {
                /* 이미 해제됐을 수 있음 — 무시 */
            }
        };

        if (!active || !isVisible) {
            release();
            return;
        }

        if (!supported) return;

        let cancelled = false;
        const acquire = async () => {
            try {
                const sentinel = await navigator.wakeLock.request('screen');
                if (cancelled) {
                    sentinel.release().catch(() => {});
                    return;
                }
                sentinelRef.current = sentinel;
                sentinel.addEventListener('release', () => {
                    if (sentinelRef.current === sentinel) sentinelRef.current = null;
                });
            } catch (err) {
                console.warn('[C-Safe] Wake Lock 요청 실패:', err?.name || err);
            }
        };
        acquire();

        return () => {
            cancelled = true;
            release();
        };
    }, [active, isVisible]);
};
