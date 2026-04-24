import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export const useRideSession = create((set, get) => ({
    isRiding: false,
    startTime: null,
    totalDistance: 0,
    topSpeed: 0,
    suddenBrakeCount: 0,
    isHardwareSyncing: false,
    historyMetrics: {
        avgReactionTime: 1.0,
        totalRides: 0,
        safetyStreak: 0,
        hazardReports: 0
    },
    rideHistory: [],
    currentPath: [], // 실시간 주행 경로 [{lat, lng, ts}]

    fetchRideHistory: async (userId) => {
        if (!userId) return;
        try {
            const { data, error } = await supabase
                .from('rides')
                .select('*')
                .eq('user_id', userId)
                .order('start_time', { ascending: false });
            
            if (error) throw error;
            set({ rideHistory: data || [] });
            return data;
        } catch (error) {
            console.error('[C-Safe] Ride History Fetch 실패:', error);
            return [];
        }
    },

    loadHistory: async (userId) => {
        let pastRides = [];
        
        if (userId) {
            pastRides = await get().fetchRideHistory(userId);
        }

        // Fallback to LocalStorage if Supabase returned nothing or wasn't available
        if (pastRides.length === 0) {
            pastRides = JSON.parse(localStorage.getItem('csafe_ride_history') || '[]');
        }
        if (pastRides.length === 0) return;

        // Calculate Safety Streak
        const dates = [...new Set(pastRides.map(ride => ride.date))].sort((a, b) => new Date(b) - new Date(a));
        let streak = 0;
        let today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < dates.length; i++) {
            const rideDate = new Date(dates[i]);
            rideDate.setHours(0, 0, 0, 0);
            
            // Check if it's today or consecutive day
            const diffDays = Math.floor((today - rideDate) / (1000 * 60 * 60 * 24));
            if (diffDays === streak || diffDays === streak + 1) {
                streak++;
            } else {
                break;
            }
        }

        const totalHazardReports = parseInt(localStorage.getItem('csafe_hazard_reports') || '3');

        // 임의의 계산 로직: 급정거 횟수가 적을수록 반응 속도가 좋다고 가정 (데모용)
        const totalSuddenBrakes = pastRides.reduce((acc, ride) => acc + (ride.suddenBrakeCount || 0), 0);
        const avgBrakes = totalSuddenBrakes / pastRides.length;
        
        const calculatedReaction = Math.max(0.6, 1.0 - (pastRides.length * 0.05) + (avgBrakes * 0.1));

        set({
            historyMetrics: {
                avgReactionTime: +calculatedReaction.toFixed(1),
                totalRides: pastRides.length,
                safetyStreak: streak || 1,
                hazardReports: totalHazardReports
            }
        });
    },

    // 비동기 하드웨어 제어(잠금/해제) 모킹 유틸리티
    simulateHardwareAction: async (actionType) => {
        set({ isHardwareSyncing: true });
        console.log(`[IoT Mock] ${actionType} 명령을 블루투스/MQTT로 킥보드로 전송 중...`);
        // 1.5초 정도의 시뮬레이터 통신 딜레이 모킹
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`[IoT Mock] ${actionType} 명령 완료.`);
        set({ isHardwareSyncing: false });
    },

    startRide: async () => {
        const state = get();
        await state.simulateHardwareAction('UNLOCK'); // 하드웨어 해제 신호

        set({
            isRiding: true,
            startTime: Date.now(),
            totalDistance: 0,
            topSpeed: 0,
            suddenBrakeCount: 0,
            currentPath: [] // 경로 초기화
        });
    },

    updateMetrics: (distanceDelta, currentSpeed, isSuddenBrake, location) => set((state) => {
        if (!state.isRiding) return state;
        
        const newPath = [...state.currentPath];
        if (location?.lat && location?.lng) {
            newPath.push({ 
                lat: location.lat, 
                lng: location.lng, 
                ts: Date.now() 
            });
        }

        return {
            totalDistance: state.totalDistance + distanceDelta,
            topSpeed: Math.max(state.topSpeed, currentSpeed),
            suddenBrakeCount: state.suddenBrakeCount + (isSuddenBrake ? 1 : 0),
            currentPath: newPath
        };
    }),

    endRideSession: async (userId) => {
        const state = get();
        if (!state.isRiding) return null;

        await state.simulateHardwareAction('LOCK'); // 하드웨어 잠금 신호

        const durationMinutes = Math.floor((Date.now() - state.startTime) / 60000) || 1;
        const finalDistance = Math.floor(state.totalDistance * 100) / 100;

        const summary = {
            id: `ride-${Date.now()}`,
            date: new Date().toLocaleDateString(),
            distance: finalDistance,
            time: durationMinutes,
            topSpeed: state.topSpeed.toFixed(1),
            suddenBrakeCount: state.suddenBrakeCount,
            co2Saved: (state.totalDistance * 0.2).toFixed(1)
        };

        // 1. Supabase 'rides' 테이블에 저장 (비동기) - 게스트 모드일 경우 스킵
        const isGuest = userId?.toString().startsWith('guest_');
        if (userId && !isGuest) {
            try {
                const isSafe = state.suddenBrakeCount === 0;

                // ride_logs 또는 rides 테이블 확인 필요. phase8 스키마 기준 'rides' 사용.
                const { data: rideData, error: rideError } = await supabase
                    .from('rides')
                    .insert([{
                        user_id: userId,
                        start_time: new Date(state.startTime).toISOString(),
                        end_time: new Date().toISOString(),
                        distance: finalDistance,
                        is_safe_ride: isSafe
                    }])
                    .select()
                    .single();
                
                if (rideError) {
                    console.error('[C-Safe] Ride Log 저장 실패:', rideError);
                } else if (rideData && state.currentPath.length > 0) {
                    // 1-1. 상세 경로 저장 (ride_paths)
                    await supabase.from('ride_paths').insert([{
                        ride_id: rideData.id,
                        path_data: state.currentPath
                    }]);

                    // 1-2. 안전 그리드 스코어 업데이트 (RPC 호출)
                    const { aggregatePathToGrids } = await import('../utils/safetyScoring');
                    const gridUpdates = aggregatePathToGrids(state.currentPath, isSafe);
                    
                    if (gridUpdates.length > 0) {
                        await supabase.rpc('update_safety_scores', { grids: gridUpdates });
                    }
                }

                // 2. 사용자 프로필 업데이트 (포인트 + 누적 거리)
                // 기본 보상 100P + 거리 기반 가중치 (데모용)
                const earnedPoints = 100; 
                
                const { error: profileError } = await supabase.rpc('increment_user_stats', {
                    user_id_in: userId,
                    inc_points: earnedPoints,
                    inc_distance: finalDistance
                });
                
                // 만약 rpc가 없다면 일반 update 시도
                if (profileError) {
                    console.warn('[C-Safe] RPC increment_user_stats 실패, 일반 update 시도');
                    // 현재 점수를 가져와서 더하는 방식 (동시성 이슈 가능성 있으나 데모용으로 허용)
                    const { data: profile } = await supabase.from('profiles').select('points, total_distance').eq('id', userId).single();
                    if (profile) {
                        await supabase.from('profiles').update({
                            points: (profile.points || 0) + earnedPoints,
                            total_distance: (profile.total_distance || 0) + finalDistance
                        }).eq('id', userId);
                    }
                }
            } catch (err) {
                console.error('[C-Safe] Supabase 연동 오류:', err);
            }
        }

        // LocalStorage fallback/cache
        const pastRides = JSON.parse(localStorage.getItem('csafe_ride_history') || '[]');
        localStorage.setItem('csafe_ride_history', JSON.stringify([summary, ...pastRides]));

        set({ isRiding: false, startTime: null });
        return summary;
    }
}));
