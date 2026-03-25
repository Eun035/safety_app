import { create } from 'zustand';

export const useRideSession = create((set, get) => ({
    isRiding: false,
    startTime: null,
    totalDistance: 0,
    topSpeed: 0,
    suddenBrakeCount: 0,
    isHardwareSyncing: false,
    historyMetrics: {
        avgReactionTime: 1.0, // Default 1.0s
        totalRides: 0
    },

    loadHistory: () => {
        const pastRides = JSON.parse(localStorage.getItem('csafe_ride_history') || '[]');
        if (pastRides.length === 0) return;

        // 임의의 계산 로직: 급정거 횟수가 적을수록 반응 속도가 좋다고 가정 (데모용)
        // 실제로는 센서 데이터 기반으로 저장된 값을 평균내야 함
        const totalSuddenBrakes = pastRides.reduce((acc, ride) => acc + (ride.suddenBrakeCount || 0), 0);
        const avgBrakes = totalSuddenBrakes / pastRides.length;
        
        // 반응 속도 계산 기믹: 기본 1.0s에서 급정거가 적으면 0.1s씩 단축 (최소 0.6s)
        const calculatedReaction = Math.max(0.6, 1.0 - (pastRides.length * 0.05) + (avgBrakes * 0.1));

        set({
            historyMetrics: {
                avgReactionTime: +calculatedReaction.toFixed(1),
                totalRides: pastRides.length
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
            suddenBrakeCount: 0
        });
    },

    updateMetrics: (distanceDelta, currentSpeed, isSuddenBrake) => set((state) => {
        if (!state.isRiding) return state;
        return {
            totalDistance: state.totalDistance + distanceDelta,
            topSpeed: Math.max(state.topSpeed, currentSpeed),
            suddenBrakeCount: state.suddenBrakeCount + (isSuddenBrake ? 1 : 0)
        };
    }),

    endRideSession: async () => {
        const state = get();
        if (!state.isRiding) return null;

        await state.simulateHardwareAction('LOCK'); // 하드웨어 잠금 신호

        const durationMinutes = Math.floor((Date.now() - state.startTime) / 60000) || 1;

        const summary = {
            id: `ride-${Date.now()}`,
            date: new Date().toLocaleDateString(),
            distance: state.totalDistance.toFixed(2),
            time: durationMinutes,
            topSpeed: state.topSpeed.toFixed(1),
            suddenBrakeCount: state.suddenBrakeCount,
            co2Saved: (state.totalDistance * 0.2).toFixed(1) // 임의의 탄소 절감량 계산
        };

        // LocalStorage에 로그 남기기 (이후 DB 저장 로직 이동)
        const pastRides = JSON.parse(localStorage.getItem('csafe_ride_history') || '[]');
        localStorage.setItem('csafe_ride_history', JSON.stringify([summary, ...pastRides]));

        set({ isRiding: false, startTime: null });
        return summary;
    }
}));
