import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useRideTracker = (profile) => {
    const [isRiding, setIsRiding] = useState(false);
    const [currentRideId, setCurrentRideId] = useState(null);
    const [rideStartTime, setRideStartTime] = useState(null);

    // Phase 9: Performance Metrics
    const [currentMetrics, setCurrentMetrics] = useState({
        speed: 0,
        stability: 100,
        maxSpeed: 0,
        avgSpeed: 0,
        mileage: 0
    });

    // Simulator: 주행 중 속도 및 안정도 변화 모의
    useEffect(() => {
        let interval;
        if (isRiding) {
            interval = setInterval(() => {
                setCurrentMetrics(prev => {
                    const newSpeed = +(Math.random() * 20).toFixed(1); // 0~20km/h
                    const newStability = Math.max(0, Math.min(100, prev.stability + (Math.random() * 10 - 5)));
                    const additionalPoints = newSpeed > 15 ? 0 : 5; // 안전 속도 유지 시 5포인트

                    return {
                        ...prev,
                        speed: newSpeed,
                        stability: Math.round(newStability),
                        maxSpeed: Math.max(prev.maxSpeed, newSpeed),
                        avgSpeed: +((prev.avgSpeed + newSpeed) / 2).toFixed(1),
                        mileage: prev.mileage + additionalPoints
                    };
                });
            }, 2000);
        } else {
            // 주행 종료 시 스탯 초기화 로직을 분리하여 Race Condition 방지
            setCurrentMetrics(prev => ({ speed: 0, stability: 100, maxSpeed: 0, avgSpeed: 0, mileage: prev.mileage }));
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRiding]);

    const startRide = useCallback(async (lat, lng) => {
        if (!profile?.id) {
            setIsRiding(true);
            setRideStartTime(new Date());
            return;
        }

        try {
            const { data, error } = await supabase
                .from('rides')
                .insert([{
                    user_id: profile.id,
                    start_loc_lat: lat,
                    start_loc_lng: lng,
                    is_safe_ride: true
                }])
                .select()
                .single();

            if (error) throw error;
            setCurrentRideId(data.id);
            setIsRiding(true);
            setRideStartTime(new Date());
        } catch (error) {
            console.error("[C-Safe] 주행 시작 저장 실패:", error.message);
            setIsRiding(true);
        }
    }, [profile]);

    const endRide = useCallback(async (lat, lng, distance = 0) => {
        setIsRiding(false);
        const endTime = new Date();

        if (!currentRideId) return;

        try {
            const { error } = await supabase
                .from('rides')
                .update({
                    end_loc_lat: lat,
                    end_loc_lng: lng,
                    end_time: endTime.toISOString(),
                    distance: distance,
                    avg_speed: currentMetrics.avgSpeed,
                    max_speed: currentMetrics.maxSpeed,
                    stability_score: currentMetrics.stability
                })
                .eq('id', currentRideId);

            // 마일리지 적립 로직 (프로필 업데이트)
            if (currentMetrics.mileage > 0) {
                await supabase.rpc('increment_mileage', {
                    user_id: profile.id,
                    amount: Math.round(currentMetrics.mileage)
                });
            }

            if (error) throw error;
            setCurrentRideId(null);
        } catch (error) {
            console.error("[C-Safe] 주행 정보 업데이트 실패:", error.message);
        }
    }, [currentRideId, currentMetrics, profile]);

    return { isRiding, startRide, endRide, rideStartTime, currentMetrics };
};
