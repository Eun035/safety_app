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

export function buildRouteSketch(path, { width = 100, height = 100, padding = 12, maxPoints = 64 } = {}) {
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

    let coords = pts.map(project);

    // ── 구간 속도(km/h) 산출 (ts가 있을 때만) ────────────────────────────
    let speedsFull = null;
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
        speedsFull = raw.map((_, i) => {   // 3점 이동평균 스무딩
            const a = raw[Math.max(0, i - 1)], b = raw[i], c = raw[Math.min(raw.length - 1, i + 1)];
            return (a + b + c) / 3;
        });
    }

    // ── GPS 노이즈 완화: 점을 균일하게 다운샘플(심플·chill한 곡선) ──────────
    let speeds = speedsFull;
    if (coords.length > maxPoints) {
        const last = coords.length - 1;
        const step = last / (maxPoints - 1);
        const sc = [], ss = speedsFull ? [] : null;
        for (let k = 0; k < maxPoints; k++) {
            const idx = k === maxPoints - 1 ? last : Math.round(k * step);
            sc.push(coords[idx]);
            if (ss) ss.push(speedsFull[idx]);
        }
        coords = sc;
        speeds = ss;
    }

    // ── Catmull-Rom → 3차 베지어 스무딩 (부드러운 S자 곡선) ────────────────
    const T = 1 / 6; // 텐션(표준). 낮을수록 직선에 가깝고, 높을수록 더 흐름.
    const segs = [];
    for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i - 1] || coords[i];
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const p3 = coords[i + 2] || coords[i + 1];
        const c1 = [p1[0] + (p2[0] - p0[0]) * T, p1[1] + (p2[1] - p0[1]) * T];
        const c2 = [p2[0] - (p3[0] - p1[0]) * T, p2[1] - (p3[1] - p1[1]) * T];
        segs.push({ c1, c2, p: p2 });
    }
    // 부드러운 SVG path (미리보기 SVG용) + 캔버스 렌더용 curve
    let d = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
    for (const s of segs) {
        d += ` C ${s.c1[0].toFixed(1)} ${s.c1[1].toFixed(1)}, ${s.c2[0].toFixed(1)} ${s.c2[1].toFixed(1)}, ${s.p[0].toFixed(1)} ${s.p[1].toFixed(1)}`;
    }

    let minSpeed = 0, maxSpeed = 0, maxSpeedIndex = 0;
    if (speeds) {
        minSpeed = Math.min(...speeds);
        maxSpeed = Math.max(...speeds);
        maxSpeedIndex = speeds.indexOf(maxSpeed);
    }

    const [sx, sy] = coords[0];
    const [ex, ey] = coords[coords.length - 1];

    return {
        d,                                                 // 부드러운 베지어 path (미리보기)
        points: coords,                                    // 다운샘플된 [[x,y], ...]
        curve: { segs },                                   // 캔버스 렌더용 베지어 세그먼트
        speeds,                                            // 구간 속도(km/h) 또는 null (points와 정렬)
        minSpeed, maxSpeed, maxSpeedIndex,
        start: { x: +sx.toFixed(1), y: +sy.toFixed(1) },
        end: { x: +ex.toFixed(1), y: +ey.toFixed(1) },
        count: pts.length
    };
}
