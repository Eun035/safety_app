import { useState, useEffect, useRef } from 'react';
import { calculateDistance } from '../utils/distance';

export const useHazardWarning = (locations = []) => {
    const [userLocation, setUserLocation] = useState(null);
    const [activeHazard, setActiveHazard] = useState(null);
    const [error, setError] = useState(null);

    // 이전에 경고한 사고 구역의 ID나 식별자를 저장하여 반복 재생 방지
    const warnedHazards = useRef(new Set());

    // 쿨타임 (예: 같은 구역이라도 3분 지났으면 다시 울리게 할지 등, 현재는 1회만 울림)
    const HAZARD_RADIUS_METERS = 50;

    const triggerVoiceWarning = (text) => {
        if ('speechSynthesis' in window) {
            // 진행 중인 다른 안내 멘트가 있다면 즉각 취소하고 경고 발령
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 1.1; // 긴급함을 위해 살짝 빠르게
            utterance.pitch = 1.2; // 톤을 약간 높임

            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Speech Synthesis API not supported.");
        }
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            setTimeout(() => setError('Geolocation API is not supported by your browser.'), 0);
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const currentPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setUserLocation(currentPos);

                // 사고 구역(또는 위험 구역) 데이터 필터링. (기존 데이터 구조상 type='accident' 혹은 위험 지역을 포괄)
                const hazards = locations.filter(loc =>
                    loc.type === 'accident' ||
                    loc.type === 'SLOPE' ||
                    loc.type === '도로파손' // 확장성을 위해 여러 위험 타입 포함 가능
                );

                let foundHazard = null;

                for (const hazard of hazards) {
                    const dist = calculateDistance(
                        currentPos.lat, currentPos.lng,
                        hazard.lat, hazard.lng
                    );

                    if (dist <= HAZARD_RADIUS_METERS) {
                        foundHazard = hazard;
                        break; // 가장 가까운 혹은 먼저 발견된 1개만 처리
                    }
                }

                if (foundHazard) {
                    // 고유 식별자로 id 사용, 없으면 좌표 결합
                    const hazardId = foundHazard.id || `${foundHazard.lat},${foundHazard.lng}`;

                    if (!warnedHazards.current.has(hazardId)) {
                        // 새 위험 구역 진입!
                        setActiveHazard({
                            ...foundHazard,
                            distance: Math.round(calculateDistance(currentPos.lat, currentPos.lng, foundHazard.lat, foundHazard.lng))
                        });

                        warnedHazards.current.add(hazardId);

                        // TTS 음성 안내 실행
                        let warningText = "🚨 위험 구역입니다. 브레이크를 잡아주세요.";
                        if (foundHazard.detourGuide) {
                            warningText = `🚨 위험 구역입니다. 브레이크를 잡아주세요. ${foundHazard.detourGuide}`;
                        }
                        triggerVoiceWarning(warningText);
                    }
                } else {
                    // 반경 50m 이내에 아무것도 없으면 알림 해제
                    setActiveHazard(null);
                }
            },
            (err) => {
                console.error('Geolocation watch error:', err);
                setError(err.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 5000
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [locations]);



    return { userLocation, activeHazard, error };
};
