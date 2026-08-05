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

// 점 p에서 선분 a-b까지의 수직 거리 (RDP용)
function perpDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Ramer–Douglas–Peucker — 직선 구간은 하나로 합치고 꺾이는 지점만 남긴다. (유지할 인덱스 반환)
function rdpIndices(pts, eps) {
    const keep = new Array(pts.length).fill(false);
    keep[0] = keep[pts.length - 1] = true;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop();
        let maxD = -1, idx = -1;
        for (let i = a + 1; i < b; i++) {
            const d = perpDist(pts[i], pts[a], pts[b]);
            if (d > maxD) { maxD = d; idx = i; }
        }
        if (maxD > eps && idx > -1) { keep[idx] = true; stack.push([a, idx], [idx, b]); }
    }
    const out = [];
    for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(i);
    return out;
}

// from에서 to 방향으로 dist만큼(단, 변 길이 절반 이내) 이동한 점 — 코너 라운딩용
function towards(from, to, dist) {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const dd = Math.min(dist, len * 0.5);
    return [from[0] + (dx / len) * dd, from[1] + (dy / len) * dd];
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

    // ── 직선 구간 유지 + 코너만 라운딩 ──────────────────────────────────
    // RDP로 직선 구간을 하나로 합쳐 "진짜 꺾이는 지점(vertex)"만 남기고,
    // 각 코너를 짧은 2차 베지어로 둥글게 처리한다. (직선은 직선, 커브는 커브)
    const sizeMin = Math.min(width, height);
    const eps = sizeMin * 0.012;      // 단순화 허용오차
    const r = sizeMin * 0.06;         // 코너 라운딩 반경

    const vIdx = rdpIndices(coords, eps);         // 유지할 정점 인덱스
    const V = vIdx.map(i => coords[i]);           // 정점 좌표
    const sv = speeds ? vIdx.map(i => speeds[i]) : null; // 정점 속도

    // strokes: 각 변(정점→정점)마다 {cmds, speed}. cmds = [['M',x,y],['L',x,y],['Q',cx,cy,x,y]]
    const strokes = [];
    let cursor = V[0];
    for (let i = 0; i < V.length - 1; i++) {
        const a = V[i], b = V[i + 1];
        const isLast = (i + 1) === V.length - 1;
        const straightEnd = isLast ? b : towards(b, a, r); // 다음 코너 앞까지 직선
        const cmds = [['M', cursor[0], cursor[1]], ['L', straightEnd[0], straightEnd[1]]];
        if (!isLast) {
            const tout = towards(b, V[i + 2], r);           // 코너를 돌아 다음 변 시작점
            cmds.push(['Q', b[0], b[1], tout[0], tout[1]]);
            cursor = tout;
        }
        strokes.push({ cmds, speed: sv ? (sv[i] + sv[i + 1]) / 2 : null });
    }

    // 미리보기 SVG용 path 문자열
    let d = '';
    for (const s of strokes) for (const c of s.cmds) {
        if (c[0] === 'M') d += `${d ? ' ' : ''}M ${c[1].toFixed(1)} ${c[2].toFixed(1)}`;
        else if (c[0] === 'L') d += ` L ${c[1].toFixed(1)} ${c[2].toFixed(1)}`;
        else d += ` Q ${c[1].toFixed(1)} ${c[2].toFixed(1)}, ${c[3].toFixed(1)} ${c[4].toFixed(1)}`;
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
        d,                                                 // 직선+코너라운딩 path (미리보기)
        points: coords,                                    // 다운샘플된 [[x,y], ...]
        curve: { strokes },                                // 캔버스 렌더용 변별 stroke(cmds+speed)
        speeds,                                            // 구간 속도(km/h) 또는 null (points와 정렬)
        minSpeed, maxSpeed, maxSpeedIndex,
        start: { x: +sx.toFixed(1), y: +sy.toFixed(1) },
        end: { x: +ex.toFixed(1), y: +ey.toFixed(1) },
        count: pts.length
    };
}
