/**
 * 두 지점 간의 거리를 미터 단위로 계산합니다 (Haversine 공식)
 * @param {number} lat1 시작점 위도
 * @param {number} lon1 시작점 경도
 * @param {number} lat2 도착점 위도
 * @param {number} lon2 도착점 경도
 * @returns {number} 거리 (미터)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

    const R = 6371e3; // 지구의 반지름 (미터)
    const φ1 = lat1 * Math.PI / 180; // φ, λ 인 라디안 단위
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터로 반환
};
