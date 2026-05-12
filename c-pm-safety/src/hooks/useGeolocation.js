import { useState, useEffect } from 'react';

export const useGeolocation = (options = {}) => {
    const [location, setLocation] = useState(null); // { lat, lng }
    const [error, setError] = useState(null);
    const [isTracking, setIsTracking] = useState(false);

    useEffect(() => {
        let watchId;

        if (isTracking) {
            if (!navigator.geolocation) {
                setTimeout(() => setError('Geolocation is not supported by your browser'), 0);
                return;
            }

            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        speed: position.coords.speed !== null ? (position.coords.speed * 3.6).toFixed(1) : 0, // m/s to km/h
                    });
                    setError(null);
                },
                (err) => {
                    setError(err.message);
                    
                    // 권한 거부(Code 1)인 경우에만 트래킹 중단
                    if (err.code === 1) {
                        setIsTracking(false);
                    }
                    
                    console.warn(`[C-Safe] Geolocation Error (Code ${err.code}):`, err.message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000, // 15초로 연장
                    maximumAge: 5000, // 5초 이내의 캐시 데이터는 허용 (빠른 초기 응답)
                    ...options
                }

            );
        }

        return () => {
            if (watchId !== undefined) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isTracking]); // options를 의존성에서 제거하여 무한 루프 방지


    const startTracking = () => setIsTracking(true);
    const stopTracking = () => setIsTracking(false);

    return { location, error, isTracking, startTracking, stopTracking };
};
