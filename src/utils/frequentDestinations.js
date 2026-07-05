// 사용자가 실제로 선택한 목적지를 localStorage에 누적하여 "자주 가는 곳"을 산출한다.
// 좌표(소수 4자리 ≈ 11m)로 동일 장소를 묶어 방문 횟수(count)를 센다.
// RideStartScreen이 출발지 기준 ETA를 다시 계산해 표시하므로 여기서는 좌표·횟수만 관리한다.

const KEY = 'csafe_frequent_destinations';
const MAX_STORED = 50;

const coordKey = (lat, lng) => `${Number(lat).toFixed(4)}_${Number(lng).toFixed(4)}`;

const readAll = () => {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
};

/** 목적지 선택 시 호출 — 방문 횟수 누적 (좌표 없으면 무시) */
export function recordDestination(dest) {
    if (!dest || !Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) return;
    try {
        const list = readAll();
        const key = coordKey(dest.lat, dest.lng);
        const now = Date.now();
        const existing = list.find(d => d.key === key);

        if (existing) {
            existing.count = (existing.count || 1) + 1;
            existing.lastUsed = now;
            // 표시명은 최신 선택 기준으로 갱신 (Kakao 결과가 더 정확할 수 있음)
            existing.name = dest.name || existing.name;
            existing.nameKey = dest.nameKey || existing.nameKey;
            existing.emoji = dest.emoji || existing.emoji;
        } else {
            list.push({
                key,
                id: dest.id || `freq-${key}`,
                name: dest.name || '',
                nameKey: dest.nameKey || null,
                emoji: dest.emoji || null,
                lat: dest.lat,
                lng: dest.lng,
                count: 1,
                lastUsed: now
            });
        }

        // 횟수↓·최근순↓으로 정렬 후 상한 유지
        list.sort((a, b) => (b.count - a.count) || (b.lastUsed - a.lastUsed));
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_STORED)));
    } catch {
        /* localStorage 실패 시 조용히 무시 (기능 저하 없음) */
    }
}

/** 자주 가는 목적지 상위 N개 (횟수↓, 최근순↓). 없으면 빈 배열 */
export function getFrequentDestinations(limit = 6) {
    return readAll()
        .filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lng))
        .sort((a, b) => (b.count - a.count) || (b.lastUsed - a.lastUsed))
        .slice(0, limit);
}
