import { useState, useEffect, useRef } from 'react';
import { calculateDistance } from '../utils/distance';
import { supabase } from '../lib/supabaseClient';
// 🔧 [GPS FIX - C1] 기존: 자체 watchPosition으로 GPS 중복 생성
// 변경: useGeolocation Zustand 스토어를 구독하여 단일 GPS 라이프사이클 사용
// 효과: GPS 워처 중복 제거 → 배터리 절약, race condition 해소
import { useGeolocation } from './useGeolocation';

export const useHazardWarning = (locations = []) => {
    const [activeHazard, setActiveHazard] = useState(null);
    const [error, setError] = useState(null);

    // ✅ 공유 GPS 스토어에서 위치 구독 (두 번째 watchPosition 제거됨)
    const { location } = useGeolocation();

    // 이전에 경고한 사고 구역의 ID나 식별자를 저장하여 반복 재생 방지
    const warnedHazards = useRef(new Set());

    // [성능 개선] 마지막으로 거리 연산을 수행한 좌표 저장 (과부하 방지용)
    const lastSearchedPos = useRef(null);

    const HAZARD_RADIUS_METERS = 50;
    const THROTTLE_DISTANCE_METERS = 10; // 최소 10m를 이동해야만 재탐색 수행

    const triggerVoiceWarning = (text) => {
        if ('speechSynthesis' in window) {
            // 진행 중인 다른 안내 멘트가 있다면 즉각 취소하고 경고 발령
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 1.1;
            utterance.pitch = 1.2;

            window.speechSynthesis.speak(utterance);
        } else {
            console.warn('[C-Safe] Speech Synthesis API not supported.');
        }
    };

    useEffect(() => {
        if (!location?.lat || !location?.lng) return;

        const currentPos = { lat: location.lat, lng: location.lng };

        // [성능 개선] 쓰로틀링 로직: 마지막 탐색 위치로부터 10m 이내면 O(N) 거리 탐색 생략
        if (lastSearchedPos.current) {
            const distFromLastSearch = calculateDistance(
                currentPos.lat, currentPos.lng,
                lastSearchedPos.current.lat, lastSearchedPos.current.lng
            );
            if (distFromLastSearch < THROTTLE_DISTANCE_METERS) {
                return; // 연산 무시 (메인 스레드 블로킹 및 프레임 드랍 방지)
            }
        }

        // 탐색 기준 위치 업데이트
        lastSearchedPos.current = currentPos;

        // 2. 서버 에러 시 기존 방식(로컬 연산)으로 안전장치 가동
        const fallbackLocalSearch = () => {
            const hazards = locations.filter(loc =>
                loc.type === 'accident' || loc.type === 'SLOPE' || loc.type === '도로파손'
            );

            let foundHazard = null;
            for (const hazard of hazards) {
                const dist = calculateDistance(
                    currentPos.lat, currentPos.lng,
                    hazard.lat, hazard.lng
                );
                if (dist <= HAZARD_RADIUS_METERS) {
                    foundHazard = hazard;
                    break;
                }
            }

            if (foundHazard) {
                const hazardId = foundHazard.id || `${foundHazard.lat},${foundHazard.lng}`;
                if (!warnedHazards.current.has(hazardId)) {
                    setActiveHazard({
                        ...foundHazard,
                        distance: Math.round(calculateDistance(currentPos.lat, currentPos.lng, foundHazard.lat, foundHazard.lng))
                    });
                    warnedHazards.current.add(hazardId);

                    let warningText = '🚨 위험 구역입니다. 브레이크를 잡아주세요.';
                    if (foundHazard.detourGuide || foundHazard.safetyTip) {
                        warningText = `🚨 위험 구역입니다. 브레이크를 잡아주세요. ${foundHazard.detourGuide || foundHazard.safetyTip}`;
                    }
                    triggerVoiceWarning(warningText);
                }
            } else {
                setActiveHazard(null);
            }
        };

        // 1. PostGIS 기반 초고속 서버 탐색 (RPC)
        const fetchNearbyHazards = async () => {
            try {
                const { data, error: rpcError } = await supabase.rpc('get_nearby_hazards', {
                    user_lat: currentPos.lat,
                    user_lng: currentPos.lng,
                    radius_meters: HAZARD_RADIUS_METERS
                });

                if (rpcError) {
                    console.warn('[C-Safe] PostGIS RPC 호출 실패, 로컬 연산으로 폴백합니다.', rpcError);
                    fallbackLocalSearch();
                    return;
                }

                if (data && data.length > 0) {
                    const foundHazard = data[0]; // 가장 가까운 위험 구역
                    const hazardId = foundHazard.id || `${foundHazard.lat},${foundHazard.lng}`;

                    if (!warnedHazards.current.has(hazardId)) {
                        setActiveHazard({
                            ...foundHazard,
                            distance: Math.round(calculateDistance(currentPos.lat, currentPos.lng, foundHazard.lat, foundHazard.lng))
                        });
                        warnedHazards.current.add(hazardId);

                        let warningText = '🚨 위험 구역입니다. 브레이크를 잡아주세요.';
                        if (foundHazard.safety_tip || foundHazard.description) {
                            warningText = `🚨 위험 구역입니다. 브레이크를 잡아주세요. ${foundHazard.safety_tip || foundHazard.description}`;
                        }
                        triggerVoiceWarning(warningText);
                    }
                } else {
                    setActiveHazard(null);
                }
            } catch (err) {
                console.error('[C-Safe] PostGIS 알림 실패:', err);
                fallbackLocalSearch();
            }
        };

        fetchNearbyHazards();
    // location 좌표 변경 시 + locations 목록 변경 시 재실행
    }, [location?.lat, location?.lng, locations]);

    // userLocation은 공유 스토어의 location을 그대로 노출 (하위 호환성 유지)
    return { userLocation: location, activeHazard, error };
};
