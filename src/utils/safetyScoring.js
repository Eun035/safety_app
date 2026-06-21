/**
 * Safety Scoring Utilities for C-Safe
 */

// 격자 크기 설정 (약 50m 단위)
// 위도 1도는 약 111km, 0.0005도는 약 55m
const GRID_PRECISION = 0.0005;

/**
 * GPS 좌표를 기반으로 격자 ID를 생성합니다.
 * @param {number} lat 위도
 * @param {number} lng 경도
 * @returns {string} 격자 ID (예: "36.8330_127.1790")
 */
export const getGridId = (lat, lng) => {
    const fixedLat = (Math.round(lat / GRID_PRECISION) * GRID_PRECISION).toFixed(4);
    const fixedLng = (Math.round(lng / GRID_PRECISION) * GRID_PRECISION).toFixed(4);
    return `${fixedLat}_${fixedLng}`;
};

/**
 * 격자 ID로부터 중심 좌표를 추출합니다.
 */
export const getGridCenter = (gridId) => {
    const [lat, lng] = gridId.split('_').map(Number);
    return { lat, lng };
};

/**
 * 주행 데이터를 바탕으로 고유한 그리드 목록을 추출합니다.
 * @param {Array} path [{lat, lng}, ...]
 * @param {boolean} isSafe 
 * @returns {Array} [{id, lat, lng, is_safe}]
 */
export const aggregatePathToGrids = (path, isSafe) => {
    const grids = new Map();
    
    path.forEach(point => {
        const id = getGridId(point.lat, point.lng);
        if (!grids.has(id)) {
            const { lat, lng } = getGridCenter(id);
            grids.set(id, { id, lat, lng, is_safe: isSafe });
        }
    });

    return Array.from(grids.values());
};
