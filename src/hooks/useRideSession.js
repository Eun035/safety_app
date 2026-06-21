import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import helmetStations from '../data/helmet_stations.json';
import { calculateDistance } from '../utils/distance';

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

    // 🛡️ RSR(Risk Suppression Rate) 계측용 — 위험존 방문 이벤트
    // 각 항목: { zoneId, vEntry, vTarget, vSum, vCount, startedAt, endedAt? }
    zoneEvents: [],
    currentZoneEvent: null,

    fetchRideHistory: async (userId) => {
        if (!userId) return [];
        try {
            const { data, error, status } = await supabase
                .from('rides')
                .select('*')
                .eq('user_id', userId)
                .order('start_time', { ascending: false });
            
            // 403, 406 등 권한 오류 시 에러를 던지지 않고 빈 배열 반환 (게스트 모드 지원)
            if (error || status === 406 || status === 403) {
                console.warn(`[C-Safe] Ride history access restricted (Status: ${status}). Falling back to local.`);
                return [];
            }
            
            set({ rideHistory: data || [] });
            return data || [];
        } catch (error) {
            console.error('[C-Safe] Ride History Fetch 오류 (안전하게 건너뜀):', error);
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
        
        // 이전 기록이 무조건 상태에 남아있도록 설정
        set({ rideHistory: pastRides });

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

        // P1-3: mock(localStorage csafe_hazard_reports 기본값 '3') 제거.
        // 사용자가 captureNearMiss로 발견한 위험점 = near_miss_events 개수로 실데이터화.
        let totalHazardReports = 0;
        if (userId && !String(userId).startsWith('guest_')) {
            try {
                const { count } = await supabase
                    .from('near_miss_events')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId);
                if (typeof count === 'number') totalHazardReports = count;
            } catch { /* fall through to localStorage */ }
        }
        if (totalHazardReports === 0) {
            try {
                const localNm = JSON.parse(localStorage.getItem('csafe_near_miss_events') || '[]');
                totalHazardReports = Array.isArray(localNm) ? localNm.length : 0;
            } catch { /* no-op */ }
        }

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

    simulateHardwareAction: async (actionType) => {
        set({ isHardwareSyncing: true });
        console.log(`[IoT Mock] ${actionType} 명령을 블루투스/MQTT로 킥보드로 전송 중...`);
        // 1.5초 정도의 시뮬레이터 통신 딜레이 모킹
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`[IoT Mock] ${actionType} 명령 완료.`);
        set({ isHardwareSyncing: false });
    },

    // 자동 종료 시 호출될 방어적 메서드 추가 (기존 구조를 유지하며 상태 변경)
    triggerAutoCheckout: async () => {
        const currentState = get();
        if (!currentState.isRiding) return; // 이미 종료되었거나 라이딩 중이 아니면 무시

        // UserStore에서 현재 userId 가져오기
        const { useUserStore } = await import('./useUserStore');
        const userId = useUserStore.getState().user?.id;

        // 안전하게 라이딩 상태 해제 및 필요한 후속 처리 트리거 (결제, 보상 등 정상 종료 흐름 수행)
        await currentState.endRideSession(userId, {
            isLegalPark: true, // Auto checkout은 주차장 10m 이내에서만 발동하므로 합법주차로 간주
            helmetOn: false,
        });

        // 자동 종료 여부 마킹
        set({
            autoCheckedOut: true,
        });
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
            currentPath: [], // 경로 초기화
            zoneEvents: [],
            currentZoneEvent: null
        });
    },

    // 🛡️ 위험존 진입 — V_entry 스냅샷
    enterZone: (zoneId, vEntry, vTarget) => set((state) => {
        if (!state.isRiding || state.currentZoneEvent) return state;
        return {
            currentZoneEvent: {
                zoneId,
                vEntry: Number(vEntry) || 0,
                vTarget: Number(vTarget) || 10,
                vSum: 0,
                vCount: 0,
                startedAt: Date.now()
            }
        };
    }),

    // 위험존 내 속도 샘플 누적 (App.jsx의 위치 갱신마다 호출)
    sampleZoneSpeed: (currentSpeed) => set((state) => {
        if (!state.currentZoneEvent) return state;
        return {
            currentZoneEvent: {
                ...state.currentZoneEvent,
                vSum: state.currentZoneEvent.vSum + (Number(currentSpeed) || 0),
                vCount: state.currentZoneEvent.vCount + 1
            }
        };
    }),

    // 위험존 이탈 — 누적치 commit
    exitZone: () => set((state) => {
        if (!state.currentZoneEvent) return state;
        const ev = state.currentZoneEvent;
        const committed = {
            ...ev,
            endedAt: Date.now(),
            vActualAvg: ev.vCount > 0 ? ev.vSum / ev.vCount : ev.vEntry
        };
        return {
            zoneEvents: [...state.zoneEvents, committed],
            currentZoneEvent: null
        };
    }),

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

    endRideSession: async (userId, {
        isLegalPark = true,
        helmetOn = false,
        destinationText = null,
        helmetPickupStationId = null
    } = {}) => {
        const state = get();
        if (!state.isRiding) return null;

        await state.simulateHardwareAction('LOCK'); // 하드웨어 잠금 신호

        const durationMinutes = Math.floor((Date.now() - state.startTime) / 60000) || 1;
        const finalDistance = Math.floor(state.totalDistance * 100) / 100;

        // 🛡️ 진행 중이던 zone이 있으면 강제 commit (이탈 신호 없이 주행 종료 케이스)
        let finalZoneEvents = state.zoneEvents;
        if (state.currentZoneEvent) {
            const ev = state.currentZoneEvent;
            finalZoneEvents = [...finalZoneEvents, {
                ...ev,
                endedAt: Date.now(),
                vActualAvg: ev.vCount > 0 ? ev.vSum / ev.vCount : ev.vEntry
            }];
        }

        // RSR(%) per-ride 계산: 진입 속도가 target 이하인 케이스는 100% 처리
        const rideRsrValues = finalZoneEvents.map(ev => {
            const denom = ev.vEntry - ev.vTarget;
            if (denom <= 0) return 100;
            return Math.max(0, Math.min(100, (1 - (ev.vActualAvg - ev.vTarget) / denom) * 100));
        });
        const rideRsr = rideRsrValues.length > 0
            ? rideRsrValues.reduce((a, b) => a + b, 0) / rideRsrValues.length
            : null;

        // localStorage 영속화 (Supabase 스키마 추가 없이 즉시 가동)
        try {
            const key = 'csafe_zone_events';
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const tagged = finalZoneEvents.map(ev => ({
                ...ev,
                rideId: `ride-${state.startTime}`,
                recordedAt: new Date().toISOString()
            }));
            localStorage.setItem(key, JSON.stringify([...tagged, ...existing].slice(0, 500)));
        } catch (err) {
            console.warn('[C-Safe] zone events 로컬 저장 실패:', err);
        }

        const isGuest = userId?.toString().startsWith('guest_');

        // P0-3 + 2026-05-29: ride_id를 클라이언트에서 미리 생성. 정상 사용자는 supabase
        // rides 테이블의 PK로 사용되고, 게스트는 localStorage 캐시 id로만 활용. summary에
        // 포함되어 헬멧 반납 시점에 같은 row를 UPDATE할 수 있게 함.
        const rideId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `ride-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        const summary = {
            id: `ride-${Date.now()}`,
            db_ride_id: (userId && !isGuest) ? rideId : null,   // supabase rides.id (헬멧 반납 UPDATE용)
            date: new Date().toLocaleDateString(),
            distance: finalDistance,
            time: durationMinutes,
            topSpeed: state.topSpeed.toFixed(1),
            suddenBrakeCount: state.suddenBrakeCount,
            co2Saved: (state.totalDistance * 0.2).toFixed(1),
            zoneEvents: finalZoneEvents,
            rideRsr: rideRsr !== null ? Math.round(rideRsr) : null
        };

        // 1. Supabase 'rides' 테이블에 저장 (비동기) - 게스트 모드일 경우 스킵
        if (userId && !isGuest) {
            try {
                const isSafe = state.suddenBrakeCount === 0;
                const helmetOnPct = helmetOn ? 100 : 0;

                const ridePayload = {
                    id: rideId,
                    user_id: userId,
                    start_time: new Date(state.startTime).toISOString(),
                    end_time: new Date().toISOString(),
                    distance: finalDistance,
                    is_safe_ride: isSafe,
                    top_speed: Number(state.topSpeed.toFixed(1)),
                    sudden_brake_count: state.suddenBrakeCount,
                    duration_minutes: durationMinutes,
                    ride_rsr: rideRsr !== null ? Math.round(rideRsr * 100) / 100 : null,
                    helmet_on_pct: helmetOnPct,
                    co2_saved_kg: Number((state.totalDistance * 0.2).toFixed(2)),
                    is_legal_park: isLegalPark,
                    to_loc_text: destinationText,
                    helmet_pickup_station_id: helmetPickupStationId
                };

                // P0-3: 모든 insert는 try-catch + enqueue 패턴
                const { enqueue } = await import('../lib/pendingSyncQueue');

                // 1. rides
                try {
                    const { error } = await supabase.from('rides').insert([ridePayload]);
                    if (error) throw error;
                } catch (err) {
                    console.warn('[C-Safe] rides insert 실패, sync 큐에 적재:', err?.message || err);
                    enqueue('rides', ridePayload);
                }

                // 2. ride_paths (path가 있을 때만)
                if (state.currentPath.length > 0) {
                    const pathPayload = { ride_id: rideId, path_data: state.currentPath };
                    try {
                        const { error } = await supabase.from('ride_paths').insert([pathPayload]);
                        if (error) throw error;
                    } catch (err) {
                        console.warn('[C-Safe] ride_paths insert 실패, sync 큐에 적재:', err?.message || err);
                        enqueue('ride_paths', pathPayload);
                    }

                    // 안전 그리드 스코어 업데이트 (RPC) - 실패해도 큐 대상 아님 (별도 분석 파이프)
                    try {
                        const { aggregatePathToGrids } = await import('../utils/safetyScoring');
                        const gridUpdates = aggregatePathToGrids(state.currentPath, isSafe);
                        if (gridUpdates.length > 0) {
                            await supabase.rpc('update_safety_scores', { grids: gridUpdates });
                        }
                    } catch (err) {
                        console.warn('[C-Safe] update_safety_scores RPC 실패:', err?.message || err);
                    }
                }

                // 3. zone_events (RSR SoT)
                if (finalZoneEvents.length > 0) {
                    const zonePayload = finalZoneEvents.map((ev) => {
                        const denom = ev.vEntry - ev.vTarget;
                        const rsr = denom <= 0
                            ? 100
                            : Math.max(0, Math.min(100, (1 - (ev.vActualAvg - ev.vTarget) / denom) * 100));
                        return {
                            ride_id: rideId,
                            user_id: userId,
                            zone_id: ev.zoneId,
                            v_entry: ev.vEntry,
                            v_target: ev.vTarget,
                            v_actual_avg: ev.vActualAvg,
                            v_sum: ev.vSum,
                            v_count: ev.vCount,
                            started_at: new Date(ev.startedAt).toISOString(),
                            ended_at: ev.endedAt ? new Date(ev.endedAt).toISOString() : null,
                            rsr_value: Math.round(rsr * 100) / 100
                        };
                    });
                    try {
                        const { error } = await supabase.from('zone_events').insert(zonePayload);
                        if (error) throw error;
                    } catch (err) {
                        console.warn('[C-Safe] zone_events insert 실패, sync 큐에 적재:', err?.message || err);
                        enqueue('zone_events', zonePayload);
                    }
                }

                // 2. 사용자 프로필 업데이트 (포인트 + 누적 거리)
                // 스테이션 반납 여부 검증
                const lastLocation = state.currentPath.length > 0 ? state.currentPath[state.currentPath.length - 1] : null;
                let stationIncentive = 0;
                
                if (lastLocation) {
                    const isNearStation = helmetStations.some(station => {
                        const d = calculateDistance(lastLocation.lat, lastLocation.lng, station.lat, station.lng);
                        return d <= 20; // 20m 이내 반납 시 인정
                    });
                
                    if (isNearStation) {
                        stationIncentive = 50; // 스테이션 반납 추가 인센티브
                    }
                }

                // 합법 주차(100P) + 스테이션 반납 보상(50P)
                const earnedPoints = (isLegalPark ? 100 : 0) + stationIncentive;

                const { error: profileError } = await supabase.rpc('increment_user_stats', {
                    user_id_in: userId,
                    inc_points: earnedPoints,
                    inc_distance: finalDistance
                });
                
                // 만약 rpc가 없다면 일반 update 시도
                if (profileError) {
                    console.warn('[C-Safe] RPC increment_user_stats 실패, 일반 update 시도');
                    // 현재 점수를 가져와서 더하는 방식 (maybeSingle 사용으로 406 방지)
                    const { data: profile, error: fetchError } = await supabase
                        .from('profiles')
                        .select('points, total_distance')
                        .eq('id', userId)
                        .maybeSingle();

                    if (!fetchError && profile) {
                        await supabase.from('profiles').update({
                            points: (profile.points || 0) + earnedPoints,
                            total_distance: (profile.total_distance || 0) + finalDistance
                        }).eq('id', userId);
                    }
                }
            } catch (err) {
                console.error('[C-Safe] Supabase 연동 오류:', err);
            }

            // 🔗 추천 보상 — 첫 라이딩 완료 시 양방향 +500P (멱등성은 RPC가 보장)
            try {
                const { data: rewardResult, error: rewardError } = await supabase
                    .rpc('grant_referral_reward', { p_invitee_user_id: userId });
                if (!rewardError && rewardResult?.ok) {
                    console.log('[C-Safe] 추천 보상 적립:', rewardResult);
                }
            } catch (err) {
                console.warn('[C-Safe] 추천 보상 RPC 실패 (옵션 기능, 진행 계속):', err?.message || err);
            }
        }

        // LocalStorage fallback/cache
        const pastRides = JSON.parse(localStorage.getItem('csafe_ride_history') || '[]');
        localStorage.setItem('csafe_ride_history', JSON.stringify([summary, ...pastRides]));

        set({ isRiding: false, startTime: null, zoneEvents: [], currentZoneEvent: null });
        return summary;
    }
}));
