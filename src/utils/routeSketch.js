// 실제 주행 GPS 경로 [{lat, lng, ts?}] → 종횡비를 보존한 SVG 폴리라인으로 변환.
// 지도처럼 실제 경로의 모양이 유지되도록 중앙 정렬 + 경도 cos(lat) 보정을 적용한다.
// RideSummaryModal(미리보기)과 ShareCard(공유 PNG)가 동일한 스케치를 공유한다.
// ts가 있으면 구간 속도(km/h)도 함께 산출 → "스피드 히트 루트"(속도별 색) 렌더용.

// 두 위경도 사이 거리(m) — Haversine
function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function buildRouteSketch(path, { width = 100, height = 100, padding = 12 } = {}) {
    const pts = Array.isArray(path)
        ? path.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng))
        : [];
    if (pts.length < 2) return null;

    const lats = pts.map(p => p.lat);
    const lngs = pts.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const midLat = (minLat + maxLat) / 2;

    // 위도에 따라 경도 1도의 실제 거리가 줄어드는 것을 보정 (경로 왜곡 방지)
    const kx = Math.cos((midLat * Math.PI) / 180) || 1;

    const spanX = (maxLng - minLng) * kx || 1e-6;
    const spanY = (maxLat - minLat) || 1e-6;

    const innerW = width - 2 * padding;
    const innerH = height - 2 * padding;
    const scale = Math.min(innerW / spanX, innerH / spanY);

    // 실제 그려지는 영역을 중앙 정렬
    const offsetX = padding + (innerW - spanX * scale) / 2;
    const offsetY = padding + (innerH - spanY * scale) / 2;

    const project = (p) => {
        const x = offsetX + (p.lng - minLng) * kx * scale;
        // SVG y축은 아래로 증가하므로 위도를 반전
        const y = offsetY + (maxLat - p.lat) * scale;
        return [x, y];
    };

    const coords = pts.map(project);
    const d = coords
        .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(' ');

    const [sx, sy] = coords[0];
    const [ex, ey] = coords[coords.length - 1];

    // ── 구간 속도(km/h) 산출 (ts가 있을 때만) ────────────────────────────
    // speeds[i] = points[i]에 대응. 노이즈 완화를 위해 3점 이동평균.
    let speeds = null, minSpeed = 0, maxSpeed = 0, maxSpeedIndex = 0;
    const hasTs = pts.every(p => Number.isFinite(p.ts));
    if (hasTs) {
        const raw = new Array(pts.length).fill(0);
        for (let i = 1; i < pts.length; i++) {
            const meters = haversineMeters(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
            const dt = (pts[i].ts - pts[i - 1].ts) / 1000; // 초
            let kmh = dt > 0 ? (meters / dt) * 3.6 : 0;
            if (!Number.isFinite(kmh) || kmh < 0) kmh = 0;
            raw[i] = Math.min(kmh, 60); // 이상치 클램프(PM 현실 상한)
        }
        raw[0] = raw[1] || 0;
        // 이동평균 스무딩
        speeds = raw.map((_, i) => {
            const a = raw[Math.max(0, i - 1)], b = raw[i], c = raw[Math.min(raw.length - 1, i + 1)];
            return (a + b + c) / 3;
        });
        minSpeed = Math.min(...speeds);
        maxSpeed = Math.max(...speeds);
        maxSpeedIndex = speeds.indexOf(maxSpeed);
    }

    return {
        d,
        points: coords,                                    // 캔버스 렌더용 [[x,y], ...]
        speeds,                                            // 구간 속도(km/h) 또는 null
        minSpeed, maxSpeed, maxSpeedIndex,
        start: { x: +sx.toFixed(1), y: +sy.toFixed(1) },
        end: { x: +ex.toFixed(1), y: +ey.toFixed(1) },
        count: pts.length
    };
}
