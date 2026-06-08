import { useEffect, useRef } from 'react';
import { useGeolocation } from './useGeolocation';
import { useRideSession } from './useRideSession';
import { calculateDistance } from '../utils/distance';
import { sendAutoCheckoutNotification } from '../utils/notification';
import usePMParkingData from './usePMParkingData';

export const useAutoCheckout = () => {
    const { location, speed } = useGeolocation();
    const { isRiding, triggerAutoCheckout } = useRideSession();
    const parkingData = usePMParkingData();
    const timeoutRef = useRef(null);

    useEffect(() => {
        // 라이딩 중이 아니거나 위치/속도 정보가 없으면 타이머 클리어
        if (!isRiding || !location || speed === undefined) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            return;
        }

        // 가장 가까운 파킹존 중심점과의 거리 찾기
        let minDistance = Infinity;
        if (Array.isArray(parkingData)) {
            parkingData.forEach((p) => {
                const d = calculateDistance(location.lat, location.lng, p.lat, p.lng);
                if (d < minDistance) {
                    minDistance = d;
                }
            });
        }

        // 조건: 반경 10m 이내이고 속도가 0
        const isParkedInZone = minDistance < 10 && speed === 0;

        if (isParkedInZone) {
            // 이미 타이머가 돌고 있지 않다면 시작
            if (!timeoutRef.current) {
                timeoutRef.current = setTimeout(() => {
                    // 10초 유지되었으므로 자동 종료 트리거
                    triggerAutoCheckout();
                    sendAutoCheckoutNotification();
                    timeoutRef.current = null;
                }, 10000); // 10초 대기
            }
        } else {
            // 조건이 깨지면 타이머 클리어
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        }

        // 컴포넌트 언마운트 시 정리
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [isRiding, location, speed, triggerAutoCheckout, parkingData]);
};
