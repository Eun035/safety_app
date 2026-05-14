// path: src/hooks/useSafeNavigation.js

import { useEffect, useState, useRef } from 'react';

export const useSafeNavigation = (warningPoints) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const warnedPoints = useRef(new Set());

  // 하버사인 공식을 이용한 두 좌표 간 거리 계산 (단위: 미터)
  const getDistance = (loc1, loc2) => {
    const R = 6371e3; // 지구 반경 (m)
    const toRad = (value) => (value * Math.PI) / 180;
    
    const phi1 = toRad(loc1.latitude);
    const phi2 = toRad(loc2.latitude);
    const deltaPhi = toRad(loc2.latitude - loc1.latitude);
    const deltaLambda = toRad(loc2.longitude - loc1.longitude);

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  useEffect(() => {
    warnedPoints.current.clear(); // 경로 변경 시 알림 초기화
    let watchId;

    const startTracking = () => {
      // Web Geolocation API 사용
      if (!navigator.geolocation) {
        console.warn("Geolocation is not supported by this browser.");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (loc) => {
          const userPos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCurrentLocation(userPos);

          // 50m 이내 사고 다발 구역 체크 및 알림 트리거
          if (warningPoints && warningPoints.length > 0) {
            warningPoints.forEach((point) => {
              const pointId = `${point.latitude},${point.longitude}`;
              const distance = getDistance(userPos, point);

              if (distance <= 50 && !warnedPoints.current.has(pointId)) {
                warnedPoints.current.add(pointId); // 중복 알림 방지
                
                // Web 햅틱(진동) 경고 송출 (모바일 브라우저 지원 시)
                if (navigator.vibrate) {
                  // 진동 패턴: 200ms 진동, 100ms 대기, 200ms 진동
                  navigator.vibrate([200, 100, 200]);
                }
                
                // Web TTS 음성 경고 송출 (UX Writing 가이드 적용)
                if ('speechSynthesis' in window) {
                  const utterance = new SpeechSynthesisUtterance("전방 50미터 앞, 사고 다발 교차로입니다. 속도를 줄이고 안전 주행하세요.");
                  utterance.lang = 'ko-KR';
                  utterance.rate = 0.9;
                  window.speechSynthesis.speak(utterance);
                }
              }
            });
          }
        },
        (error) => {
          console.error("Location tracking error:", error);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    };

    startTracking();

    return () => {
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [warningPoints]);

  return { currentLocation };
};
