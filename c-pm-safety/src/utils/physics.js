/**
 * PM 정지 거리 및 위험도 계산 유틸리티
 * c-safe-digital-twin-lite 프로젝트의 물리 엔진 이식
 */

const GRAVITY = 9.81; // 중력가속도 (m/s^2)
const BRAKE_EFFICIENCY = 0.65; // 제동 효율

export const SURFACES = {
    dry: { label: "Dry Asphalt", mu: 0.7 },
    wet: { label: "Wet Asphalt", mu: 0.45 },
    tile: { label: "Sidewalk Tile", mu: 0.35 },
    paint: { label: "Road Paint", mu: 0.25 },
    ice: { label: "Ice", mu: 0.12 },
};

/**
 * 정지 거리 및 위험도 계산
 * @param {number} speed 속도 (km/h)
 * @param {number} incline 경사도 (도)
 * @param {number} reactionTime 반응 시간 (초)
 * @param {string} surfaceKey 노면 상태 키
 */
export const calculateStopDistance = (speed, incline = 0, reactionTime = 1.0, surfaceKey = 'dry') => {
    // 1. 속도 변환 (km/h -> m/s)
    const v = speed / 3.6;
    
    // 2. 경사도 변환 (degree -> radian)
    const theta = incline * (Math.PI / 180);
    
    // 3. 마찰계수
    const mu = SURFACES[surfaceKey]?.mu || 0.7;
    
    // 4. 분모 계산 (μ + sinθ)
    const denominator = mu + Math.sin(theta);
    
    // 5. 공주거리 (반응 시간 동안 이동한 거리)
    const reactionDist = v * reactionTime;
    
    // 6. 제동거리 (브레이크 작동 후 이동한 거리)
    let brakingDist = Infinity;
    if (denominator > 0) {
        brakingDist = (v * v) / (2 * GRAVITY * denominator) / BRAKE_EFFICIENCY;
    }
    
    // 7. 총 정지 거리
    const totalDist = reactionDist + brakingDist;

    // 8. 위험도 판별
    let riskLevel = 'safe';
    if (totalDist > 8 || totalDist === Infinity) {
        riskLevel = 'danger';
    } else if (totalDist > 5) {
        riskLevel = 'warning';
    }

    return {
        reactionDist,
        brakingDist,
        totalDist,
        riskLevel,
        mu,
        denominator
    };
};
