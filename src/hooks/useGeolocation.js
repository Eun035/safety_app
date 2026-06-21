import { create } from 'zustand';

// 전역 단일 인스턴스 GPS 트래커.
// 여러 컴포넌트에서 호출해도 watchPosition은 1번만 등록되며,
// startTracking/stopTracking은 ref-count 기반으로 안전하게 공유된다.
export const useGeolocation = create((set, get) => ({
    location: null,
    error: null,
    isTracking: false,
    _watchId: null,
    _refCount: 0,

    startTracking: () => {
        const state = get();
        // 이미 트래킹 중이면 ref-count만 증가
        if (state.isTracking && state._watchId !== null) {
            set({ _refCount: state._refCount + 1 });
            return;
        }

        if (!navigator.geolocation) {
            set({ error: 'Geolocation is not supported by your browser' });
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                set({
                    location: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        // m/s → km/h, 숫자형 유지 (이후 비교/연산 안전성)
                        speed: position.coords.speed !== null
                            ? +(position.coords.speed * 3.6).toFixed(1)
                            : 0,
                    },
                    error: null,
                });
            },
            (err) => {
                set({ error: err.message });
                // 권한 거부(Code 1)인 경우에만 트래킹 중단
                if (err.code === 1) {
                    const s = get();
                    if (s._watchId !== null) {
                        navigator.geolocation.clearWatch(s._watchId);
                    }
                    set({ isTracking: false, _watchId: null, _refCount: 0 });
                }
                console.warn(`[C-Safe] Geolocation Error (Code ${err.code}):`, err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 5000,
            }
        );

        set({ _watchId: watchId, isTracking: true, _refCount: 1 });
    },

    stopTracking: () => {
        const state = get();
        const nextCount = Math.max(0, state._refCount - 1);

        if (nextCount === 0 && state._watchId !== null) {
            navigator.geolocation.clearWatch(state._watchId);
            set({ isTracking: false, _watchId: null, _refCount: 0 });
        } else {
            set({ _refCount: nextCount });
        }
    },
}));
