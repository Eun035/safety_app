// 실제 주행 GPS 경로 [{lat, lng}] → 종횡비를 보존한 SVG 폴리라인으로 변환.
// 지도처럼 실제 경로의 모양이 유지되도록 중앙 정렬 + 경도 cos(lat) 보정을 적용한다.
// RideSummaryModal(미리보기)과 ShareCard(공유 PNG)가 동일한 스케치를 공유한다.

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

    return {
        d,
        start: { x: +sx.toFixed(1), y: +sy.toFixed(1) },
        end: { x: +ex.toFixed(1), y: +ey.toFixed(1) },
        count: pts.length
    };
}
