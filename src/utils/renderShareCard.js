// 공유 카드를 Canvas 2D로 직접 렌더한다.
// html-to-image(SVG foreignObject) 방식이 일부 모바일 브라우저/WebView에서 빈(검은) 이미지를
// 만드는 문제가 있어, 모든 환경에서 확실히 동작하는 캔버스 직접 렌더로 대체했다.
import i18n from '../locales/i18n';
import { buildRouteSketch } from './routeSketch';

const ACCENT = '#CCFF00';

const PRESETS = {
    story:  { w: 1080, h: 1920, pad: 90, titlePx: 96, subPx: 30, statPx: 118, statH: 150, miniPx: 30, qr: 260 },
    feed:   { w: 1080, h: 1350, pad: 80, titlePx: 82, subPx: 28, statPx: 104, statH: 132, miniPx: 27, qr: 230 },
    square: { w: 1080, h: 1080, pad: 66, titlePx: 66, subPx: 24, statPx: 88,  statH: 112, miniPx: 23, qr: 200 },
};

const SANS = '"Pretendard", system-ui, -apple-system, "Malgun Gothic", sans-serif';
const MONO = '"JetBrains Mono", "SF Mono", ui-monospace, monospace';

function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

function loadImage(src) {
    return new Promise((resolve) => {
        if (!src) { resolve(null); return; }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function wrapLines(ctx, text, maxWidth, maxLines = 3) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = w;
            if (lines.length === maxLines - 1) break;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
}

const fmtDuration = (min) => {
    const t = Number(min) || 0;
    const mm = Math.floor(t);
    const ss = Math.round((t - mm) * 60);
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

/**
 * 공유 카드 PNG 생성 (Canvas 직접 렌더).
 * @returns {Promise<{dataUrl:string, blob:Blob|null}>}
 */
export async function renderShareCard({
    metrics = {},
    vibeName = 'Neon Rider',
    qrDataUrl = null,
    referralCode = null,
    ratio = 'story',
    helmetOn = false,
    path = null,
    routeLabel = null,
} = {}) {
    const P = PRESETS[ratio] || PRESETS.story;
    const canvas = document.createElement('canvas');
    canvas.width = P.w;
    canvas.height = P.h;
    const ctx = canvas.getContext('2d');

    const distance = Number(metrics?.distance ?? 0);
    const timeMin = Number(metrics?.time ?? 0);
    const brakes = Number(metrics?.suddenBrakeCount ?? 0);
    const avgSpeed = timeMin > 0 ? Math.round((distance / (timeMin / 60)) * 10) / 10 : 0;
    const safetyScore = Math.max(60, 100 - Math.round(brakes) * 5);
    const rLabel = routeLabel || i18n.t('sc_route_label');

    // ── 배경 (라디얼 그라디언트) ─────────────────────────────
    const g = ctx.createRadialGradient(P.w / 2, P.h * 0.25, 0, P.w / 2, P.h * 0.25, P.h * 0.85);
    g.addColorStop(0, '#15171a');
    g.addColorStop(0.6, '#0a0a0a');
    g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, P.w, P.h);

    // ── 그리드 ───────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = 'rgba(204,255,0,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= P.w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, P.h); ctx.stroke(); }
    for (let y = 0; y <= P.h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(P.w, y); ctx.stroke(); }
    ctx.restore();

    // ── 실제 주행 경로 라인 (네온) ───────────────────────────
    const sketch = buildRouteSketch(path, { width: P.w, height: P.h, padding: 160 });
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 9;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = 28;
    if (sketch && sketch.points && sketch.points.length > 1) {
        ctx.beginPath();
        sketch.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();
        // 시작(보라)·끝(네온) 점
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#a855f7';
        ctx.beginPath(); ctx.arc(sketch.start.x, sketch.start.y, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ACCENT;
        ctx.beginPath(); ctx.arc(sketch.end.x, sketch.end.y, 18, 0, Math.PI * 2); ctx.fill();
    } else {
        // 경로 데이터 없음 → 장식용 곡선
        ctx.setLineDash([12, 14]);
        ctx.beginPath();
        ctx.moveTo(P.w * 0.12, P.h * 0.82);
        ctx.bezierCurveTo(P.w * 0.35, P.h * 0.7, P.w * 0.3, P.h * 0.45, P.w * 0.6, P.h * 0.42);
        ctx.bezierCurveTo(P.w * 0.85, P.h * 0.4, P.w * 0.8, P.h * 0.18, P.w * 0.88, P.h * 0.12);
        ctx.stroke();
    }
    ctx.restore();

    let y = P.pad;

    // ── 상단 배지: C-SAFE · RIDE LOG ─────────────────────────
    ctx.font = `900 30px ${MONO}`;
    const badgeText = 'C-SAFE · RIDE LOG';
    const badgeTextW = ctx.measureText(badgeText).width;
    const badgeW = badgeTextW + 84;
    const badgeH = 60;
    ctx.fillStyle = 'rgba(204,255,0,0.10)';
    roundRect(ctx, P.pad, y, badgeW, badgeH, 30); ctx.fill();
    ctx.strokeStyle = 'rgba(204,255,0,0.4)'; ctx.lineWidth = 2;
    roundRect(ctx, P.pad, y, badgeW, badgeH, 30); ctx.stroke();
    ctx.fillStyle = ACCENT;
    ctx.beginPath(); ctx.arc(P.pad + 32, y + badgeH / 2, 8, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, P.pad + 52, y + badgeH / 2 + 1);
    y += badgeH + (ratio === 'square' ? 34 : 56);

    // ── 타이틀 ───────────────────────────────────────────────
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `900 ${P.titlePx}px ${SANS}`;
    const title = i18n.t('sc_title', { route: rLabel, km: distance.toFixed(1) });
    const titleLines = wrapLines(ctx, title, P.w - P.pad * 2, ratio === 'square' ? 2 : 3);
    const lineH = P.titlePx * 1.1;
    titleLines.forEach((ln, i) => ctx.fillText(ln, P.pad, y + i * lineH));
    y += titleLines.length * lineH + 22;

    // ── 서브타이틀: vibe · 날짜 ──────────────────────────────
    const today = new Date().toLocaleDateString(i18n.language || 'en', { month: 'long', day: 'numeric' });
    ctx.font = `700 ${P.subPx}px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`${vibeName} · ${today}`, P.pad, y);
    y += P.subPx + 24;

    // ── 헬멧 배지 ────────────────────────────────────────────
    if (helmetOn) {
        ctx.font = `900 32px ${SANS}`;
        const ht = 'SAFE RIDER';
        const htW = ctx.measureText(ht).width;
        const hbW = htW + 110;
        const hbH = 64;
        ctx.fillStyle = '#000';
        roundRect(ctx, P.pad, y, hbW, hbH, 14); ctx.fill();
        ctx.strokeStyle = ACCENT; ctx.lineWidth = 2;
        roundRect(ctx, P.pad, y, hbW, hbH, 14); ctx.stroke();
        ctx.textBaseline = 'middle';
        ctx.fillText('⛑️', P.pad + 24, y + hbH / 2);
        ctx.fillStyle = ACCENT;
        ctx.fillText(ht, P.pad + 78, y + hbH / 2 + 1);
        ctx.textBaseline = 'top';
        y += hbH + 20;
    }

    // ── 푸터 영역 좌표 (하단 고정) ───────────────────────────
    const qrImg = await loadImage(qrDataUrl);
    const footerH = P.qr;
    const footerY = P.h - P.pad - footerH;

    // ── 스탯 3행 (푸터 위에 배치) ────────────────────────────
    const gap = 24;
    const statsBlockH = P.statH * 3 + gap * 2;
    let sy = footerY - 44 - statsBlockH;
    // 헤더와 겹치면 아래로 밀지 않고 헤더 끝 바로 아래로 (안전장치)
    if (sy < y + 20) sy = y + 20;

    const drawStat = (label, value, unit, highlight) => {
        const x = P.pad;
        const w = P.w - P.pad * 2;
        ctx.fillStyle = highlight ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.03)';
        roundRect(ctx, x, sy, w, P.statH, 28); ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = highlight ? 'rgba(204,255,0,0.33)' : 'rgba(255,255,255,0.08)';
        roundRect(ctx, x, sy, w, P.statH, 28); ctx.stroke();

        const midY = sy + P.statH / 2;
        ctx.textBaseline = 'middle';
        // label (좌)
        ctx.textAlign = 'left';
        ctx.font = `900 ${P.miniPx}px ${MONO}`;
        ctx.fillStyle = highlight ? ACCENT : 'rgba(255,255,255,0.45)';
        ctx.fillText(label, x + 36, midY);
        // value + unit (우)
        const rightX = x + w - 36;
        ctx.textAlign = 'right';
        ctx.font = `800 ${Math.round(P.statPx * 0.26)}px ${MONO}`;
        ctx.fillStyle = highlight ? ACCENT : 'rgba(255,255,255,0.55)';
        const unitW = ctx.measureText(unit).width;
        ctx.fillText(unit, rightX, midY);
        ctx.font = `900 ${P.statPx}px ${MONO}`;
        ctx.fillStyle = highlight ? ACCENT : '#ffffff';
        ctx.fillText(value, rightX - unitW - 16, midY);
        ctx.textBaseline = 'top';

        sy += P.statH + gap;
    };

    drawStat('DURATION', fmtDuration(timeMin), 'MM:SS', false);
    drawStat('AVG SPEED', String(avgSpeed), 'km/h', false);
    drawStat('SAFETY SCORE', String(safetyScore), '%', true);

    // ── 푸터: 좌측 텍스트 + REF, 우측 QR ─────────────────────
    // QR (우측)
    if (qrImg) {
        const qx = P.w - P.pad - P.qr;
        const qy = footerY;
        ctx.fillStyle = '#fff';
        roundRect(ctx, qx, qy, P.qr, P.qr, 20); ctx.fill();
        ctx.strokeStyle = ACCENT; ctx.lineWidth = 3;
        roundRect(ctx, qx, qy, P.qr, P.qr, 20); ctx.stroke();
        const inner = P.qr - 28;
        ctx.drawImage(qrImg, qx + 14, qy + 14, inner, inner);
    }

    // 좌측 텍스트
    const lx = P.pad;
    let ly = footerY + 4;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `900 24px ${MONO}`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('com.csafe.pm', lx, ly);
    ly += 44;

    if (ratio !== 'square') {
        ctx.font = `900 ${ratio === 'story' ? 36 : 32}px ${SANS}`;
        const pre = i18n.t('sc_qr_pre');
        const ride = i18n.t('sc_qr_ride');
        // pre + ride(강조) 한 줄
        ctx.fillStyle = '#ffffff';
        ctx.fillText(pre, lx, ly);
        const preW = ctx.measureText(pre).width;
        ctx.fillStyle = ACCENT;
        ctx.fillText(ride, lx + preW, ly);
        ly += (ratio === 'story' ? 46 : 40);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(i18n.t('sc_start_now'), lx, ly);
        ly += (ratio === 'story' ? 56 : 48);
    }

    if (referralCode) {
        ctx.font = `800 22px ${MONO}`;
        const refText = `REF · ${referralCode}`;
        const rW = ctx.measureText(refText).width;
        ctx.fillStyle = '#000';
        roundRect(ctx, lx, ly, rW + 36, 46, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(204,255,0,0.35)'; ctx.lineWidth = 1.5;
        roundRect(ctx, lx, ly, rW + 36, 46, 10); ctx.stroke();
        ctx.fillStyle = ACCENT;
        ctx.textBaseline = 'middle';
        ctx.fillText(refText, lx + 18, ly + 24);
        ctx.textBaseline = 'top';
    }

    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise((resolve) => {
        if (canvas.toBlob) canvas.toBlob(resolve, 'image/png');
        else resolve(null);
    });
    return { dataUrl, blob };
}
