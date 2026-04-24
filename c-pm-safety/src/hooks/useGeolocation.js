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
                    // 모바일에서 HTTPS가 아니면 권한 에러(code: 1) 발생
                    setError(err.message);
                    setIsTracking(false);
                    console.error("Geolocation Error:", err);
                },
                {
                    enableHighAccuracy: true, // GPS 정확도 최대
                    timeout: 10000,
                    maximumAge: 0, // 캐시된 위치정보 사용안함
                    ...options
                }
            );
        }

        return () => {
            if (watchId !== undefined) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isTracking, options]);

    const startTracking = () => setIsTracking(true);
    const stopTracking = () => setIsTracking(false);

    return { location, error, isTracking, startTracking, stopTracking };
};
