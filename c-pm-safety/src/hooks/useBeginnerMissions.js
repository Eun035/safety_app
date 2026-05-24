import { useState, useCallback, useEffect } from 'react';

/**
 * useBeginnerMissions
 * ─────────────────────────────────────────────────────────────────────────
 * C-SAFE 초보자 미션 시스템 (게임화 → 장기 재방문 유도)
 *
 * 미션 구조:
 *   - 하드코딩된 5개 미션 (추후 DB 연동 가능)
 *   - 진행도 및 완료 상태를 localStorage에 영속화
 *   - 완료 시 onReward(missionId, points) 콜백 제공
 *
 * 스트릭 미션 (미션 2, 4):
 *   - 연속 완료 여부 추적 (날짜 기반)
 */

const MISSIONS_KEY = 'csafe_beginner_missions';

const MISSION_DEFINITIONS = [
    {
        id: 'first_ride',
        title: '첫 안전 주행 완료',
        description: '첫 번째 주행을 완료하세요',
        icon: '🛴',
        points: 200,
        goal: 1,          // 목표 횟수
        unit: '회',
        isStreak: false,
        accentColor: '#40ffdc',   // cyber-cyan
    },
    {
        id: 'helmet_streak_3',
        title: '헬멧 인증 3회 연속',
        description: '연속으로 3회 헬멧을 인증하며 주행하세요',
        icon: '🪖',
        points: 300,
        goal: 3,
        unit: '회',
        isStreak: true,
        accentColor: '#a855f7',   // purple
    },
    {
        id: 'smooth_5km',
        title: '급제동 없이 5km 주행',
        description: '급제동 없이 5km를 안전하게 주행하세요',
        icon: '🌊',
        points: 500,
        goal: 5,
        unit: 'km',
        isStreak: false,
        accentColor: '#3b82f6',   // blue
    },
    {
        id: 'weekly_streak_7',
        title: '7일 연속 주행',
        description: '7일 연속으로 주행을 완료하세요',
        icon: '🔥',
        points: 1000,
        goal: 7,
        unit: '일',
        isStreak: true,
        accentColor: '#f59e0b',   // amber
    },
    {
        id: 'report_hazard_1',
        title: '위험 구역 신고 1회',
        description: '위험 구역을 한 번 신고하세요',
        icon: '⚠️',
        points: 150,
        goal: 1,
        unit: '회',
        isStreak: false,
        accentColor: '#ef4444',   // red
    },
];

/**
 * 저장된 미션 상태 로드 (없으면 초기값 생성)
 */
function loadMissionsFromStorage() {
    try {
        const stored = localStorage.getItem(MISSIONS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // definitions와 병합 (신규 미션 추가 대응)
            return MISSION_DEFINITIONS.map(def => {
                const saved = parsed.find(m => m.id === def.id);
                return saved ? { ...def, ...saved } : { ...def, progress: 0, completed: false, completedAt: null };
            });
        }
    } catch { /* fall through */ }
    return MISSION_DEFINITIONS.map(def => ({
        ...def,
        progress: 0,
        completed: false,
        completedAt: null,
    }));
}

function saveMissionsToStorage(missions) {
    try {
        // 저장 시 definitions 제외, 상태만 저장
        const toSave = missions.map(({ id, progress, completed, completedAt }) => ({
            id, progress, completed, completedAt,
        }));
        localStorage.setItem(MISSIONS_KEY, JSON.stringify(toSave));
    } catch { /* ignore */ }
}

export const useBeginnerMissions = ({ onReward } = {}) => {
    const [missions, setMissions] = useState(loadMissionsFromStorage);

    // 상태 변경 시 자동 저장
    useEffect(() => {
        saveMissionsToStorage(missions);
    }, [missions]);

    /**
     * progressMission — 특정 미션 진행도 증가
     * @param {string} missionId - 미션 ID
     * @param {number} amount    - 증가량 (기본 1)
     */
    const progressMission = useCallback((missionId, amount = 1) => {
        setMissions(prev => prev.map(m => {
            if (m.id !== missionId || m.completed) return m;

            const newProgress = Math.min(m.progress + amount, m.goal);
            const justCompleted = newProgress >= m.goal;

            if (justCompleted && onReward) {
                // 비동기로 호출해 setState 내부에서 side-effect 방지
                setTimeout(() => onReward(missionId, m.points), 0);
            }

            return {
                ...m,
                progress: newProgress,
                completed: justCompleted,
                completedAt: justCompleted ? new Date().toISOString() : m.completedAt,
            };
        }));
    }, [onReward]);

    /**
     * resetMission — 특정 미션 리셋 (개발/테스트용)
     */
    const resetMission = useCallback((missionId) => {
        setMissions(prev => prev.map(m =>
            m.id === missionId ? { ...m, progress: 0, completed: false, completedAt: null } : m
        ));
    }, []);

    /**
     * resetAllMissions — 전체 리셋
     */
    const resetAllMissions = useCallback(() => {
        const fresh = MISSION_DEFINITIONS.map(def => ({
            ...def, progress: 0, completed: false, completedAt: null,
        }));
        setMissions(fresh);
    }, []);

    const completedCount = missions.filter(m => m.completed).length;
    const totalPoints = missions
        .filter(m => m.completed)
        .reduce((sum, m) => sum + m.points, 0);

    return {
        missions,
        progressMission,
        resetMission,
        resetAllMissions,
        completedCount,
        totalPoints,
    };
};
