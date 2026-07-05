// 공유 카드를 Canvas 2D로 직접 렌더한다.
// html-to-image(SVG foreignObject) 방식이 일부 모바일 브라우저/WebView에서 빈(검은) 이미지를
// 만드는 문제가 있어, 모든 환경에서 확실히 동작하는 캔버스 직접 렌더로 대체했다.
// 여러 테마(바이브)를 지원하여 취향에 맞는 카드를 생성할 수 있다.
import i18n from '../locales/i18n';
import { buildRouteSketch } from './routeSketch';

// ── 테마(바이브) 팔레트 ─────────────────────────────────────────────
// 레이아웃은 공통, 색·글로우만 테마별로 달라진다.
const THEMES = {
    neon: {
        bg: ['#15171a', '#0a0a0a', '#000000'],
        accent: '#CCFF00', accent2: '#a855f7', onAccent: '#000000',
        text: '#ffffff', textDim: 'rgba(255,255,255,0.55)', textFaint: 'rgba(255,255,255,0.45)',
        grid: 'rgba(204,255,0,0.05)',
        panel: 'rgba(255,255,255,0.03)', panelHi: 'rgba(204,255,0,0.08)',
        border: 'rgba(255,255,255,0.08)', borderHi: 'rgba(204,255,0,0.33)',
        glow: true, light: false,
    },
    aurora: {
        bg: ['#0c1424', '#0a0f1c', '#04070e'],
        accent: '#38e1ff', accent2: '#a78bfa', onAccent: '#00121a',
        text: '#ffffff', textDim: 'rgba(255,255,255,0.55)', textFaint: 'rgba(255,255,255,0.45)',
        grid: 'rgba(56,225,255,0.05)',
        panel: 'rgba(255,255,255,0.03)', panelHi: 'rgba(56,225,255,0.08)',
        border: 'rgba(255,255,255,0.08)', borderHi: 'rgba(56,225,255,0.33)',
        glow: true, light: false,
    },
    sunset: {
        bg: ['#2b1526', '#1c0e18', '#0a0406'],
        accent: '#ff8a5b', accent2: '#ff5d8f', onAccent: '#2a0d12',
        text: '#ffffff', textDim: 'rgba(255,255,255,0.6)', textFaint: 'rgba(255,255,255,0.5)',
        grid: 'rgba(255,138,91,0.05)',
        panel: 'rgba(255,255,255,0.04)', panelHi: 'rgba(255,138,91,0.10)',
        border: 'rgba(255,255,255,0.09)', borderHi: 'rgba(255,138,91,0.35)',
        glow: true, light: false,
    },
    mono: {
        bg: ['#f6f4ec', '#efece2', '#e6e2d6'],
        accent: '#111111', accent2: '#8a8a8a', onAccent: '#f6f4ec',
        text: '#111111', textDim: 'rgba(0,0,0,0.5)', textFaint: 'rgba(0,0,0,0.42)',
        grid: 'rgba(0,0,0,0.05)',
        panel: 'rgba(0,0,0,0.025)', panelHi: 'rgba(0,0,0,0.05)',
        border: 'rgba(0,0,0,0.1)', borderHi: 'rgba(0,0,0,0.28)',
        glow: false, light: true,
    },
};

// 모달의 테마 선택 칩에서 사용 (id + 대표 색)
export const SHARE_THEMES = [
    { id: 'neon', accent: '#CCFF00' },
    { id: 'aurora', accent: '#38e1ff' },
    { id: 'sunset', accent: '#ff8a5b' },
    { id: 'mono', accent: '#cfcabd' },
];

// 주행 성향(급정거 횟수)에 맞춘 기본 테마 추천
export const suggestTheme = (suddenBrakeCount = 0) => {
    const b = Number(suddenBrakeCount) || 0;
    if (b === 0) return 'aurora';   // 안정적 = 차분한 오로라
    if (b <= 2) return 'neon';      // 스무스 = 네온
    return 'sunset';                // 다이내믹 = 선셋
};

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
    referralCode = null,
    shareUrl = null,
    ratio = 'story',
    theme = 'neon',
    helmetOn = false,
    path = null,
    routeLabel = null,
} = {}) {
    const P = PRESETS[ratio] || PRESETS.story;
    const T = THEMES[theme] || THEMES.neon;
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
    g.addColorStop(0, T.bg[0]);
    g.addColorStop(0.6, T.bg[1]);
    g.addColorStop(1, T.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, P.w, P.h);

    // ── 그리드 ───────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = T.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= P.w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, P.h); ctx.stroke(); }
    for (let y = 0; y <= P.h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(P.w, y); ctx.stroke(); }
    ctx.restore();

    // ── 실제 주행 경로 라인 ──────────────────────────────────
    const sketch = buildRouteSketch(path, { width: P.w, height: P.h, padding: 160 });
    ctx.save();
    ctx.globalAlpha = T.light ? 0.9 : 0.5;
    ctx.strokeStyle = T.accent;
    ctx.lineWidth = 9;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (T.glow) { ctx.shadowColor = T.accent; ctx.shadowBlur = 28; }
    if (sketch && sketch.points && sketch.points.length > 1) {
        ctx.beginPath();
        sketch.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();
        if (T.glow) ctx.shadowBlur = 24;
        ctx.globalAlpha = 1;
        ctx.fillStyle = T.accent2;
        ctx.beginPath(); ctx.arc(sketch.start.x, sketch.start.y, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = T.accent;
        ctx.beginPath(); ctx.arc(sketch.end.x, sketch.end.y, 18, 0, Math.PI * 2); ctx.fill();
    } else {
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
    const badgeW = ctx.measureText(badgeText).width + 84;
    const badgeH = 60;
    ctx.fillStyle = T.panelHi;
    roundRect(ctx, P.pad, y, badgeW, badgeH, 30); ctx.fill();
    ctx.strokeStyle = T.borderHi; ctx.lineWidth = 2;
    roundRect(ctx, P.pad, y, badgeW, badgeH, 30); ctx.stroke();
    ctx.fillStyle = T.accent;
    ctx.beginPath(); ctx.arc(P.pad + 32, y + badgeH / 2, 8, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, P.pad + 52, y + badgeH / 2 + 1);
    y += badgeH + (ratio === 'square' ? 34 : 56);

    // ── 타이틀 ───────────────────────────────────────────────
    ctx.fillStyle = T.text;
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
    ctx.fillStyle = T.textDim;
    ctx.fillText(`${vibeName} · ${today}`, P.pad, y);
    y += P.subPx + 24;

    // ── 헬멧 배지 ────────────────────────────────────────────
    if (helmetOn) {
        ctx.font = `900 32px ${SANS}`;
        const ht = 'SAFE RIDER';
        const hbW = ctx.measureText(ht).width + 110;
        const hbH = 64;
        ctx.fillStyle = T.accent;
        roundRect(ctx, P.pad, y, hbW, hbH, 14); ctx.fill();
        ctx.textBaseline = 'middle';
        ctx.fillStyle = T.onAccent;
        ctx.fillText('⛑️', P.pad + 24, y + hbH / 2);
        ctx.fillText(ht, P.pad + 78, y + hbH / 2 + 1);
        ctx.textBaseline = 'top';
        y += hbH + 20;
    }

    // ── 푸터 영역 좌표 (하단 고정) ───────────────────────────
    const footerH = P.qr;
    const footerY = P.h - P.pad - footerH;

    // ── 스탯 3행 (푸터 위에 배치) ────────────────────────────
    const gap = 24;
    const statsBlockH = P.statH * 3 + gap * 2;
    let sy = footerY - 44 - statsBlockH;
    if (sy < y + 20) sy = y + 20;

    const drawStat = (label, value, unit, highlight) => {
        const x = P.pad;
        const w = P.w - P.pad * 2;
        ctx.fillStyle = highlight ? T.panelHi : T.panel;
        roundRect(ctx, x, sy, w, P.statH, 28); ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = highlight ? T.borderHi : T.border;
        roundRect(ctx, x, sy, w, P.statH, 28); ctx.stroke();

        const midY = sy + P.statH / 2;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.font = `900 ${P.miniPx}px ${MONO}`;
        ctx.fillStyle = highlight ? T.accent : T.textFaint;
        ctx.fillText(label, x + 36, midY);

        const rightX = x + w - 36;
        ctx.textAlign = 'right';
        ctx.font = `800 ${Math.round(P.statPx * 0.26)}px ${MONO}`;
        ctx.fillStyle = highlight ? T.accent : T.textDim;
        const unitW = ctx.measureText(unit).width;
        ctx.fillText(unit, rightX, midY);
        ctx.font = `900 ${P.statPx}px ${MONO}`;
        ctx.fillStyle = highlight ? T.accent : T.text;
        ctx.fillText(value, rightX - unitW - 16, midY);
        ctx.textBaseline = 'top';

        sy += P.statH + gap;
    };

    drawStat('DURATION', fmtDuration(timeMin), 'MM:SS', false);
    drawStat('AVG SPEED', String(avgSpeed), 'km/h', false);
    drawStat('SAFETY SCORE', String(safetyScore), '%', true);

    // ── 푸터: 앱 다운로드 CTA (QR 제거, 전체 폭 사용) ────────
    const lx = P.pad;
    let ly = footerY + 8;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // 큰 다운로드 CTA
    ctx.font = `900 ${ratio === 'square' ? 42 : 52}px ${SANS}`;
    ctx.fillStyle = T.accent;
    const cta = i18n.t('sc_dl_cta');
    const ctaLines = wrapLines(ctx, cta, P.w - P.pad * 2, 2);
    const ctaLH = ratio === 'square' ? 52 : 64;
    ctaLines.forEach((ln, i) => ctx.fillText(ln, lx, ly + i * ctaLH));
    ly += ctaLines.length * ctaLH + 16;

    // 다운로드 주소 (host)
    let host = 'com.csafe.pm';
    if (shareUrl) { try { host = new URL(shareUrl).host; } catch { /* noop */ } }
    ctx.font = `800 28px ${MONO}`;
    ctx.fillStyle = T.textDim;
    ctx.fillText(host, lx, ly);
    ly += 46;

    // REF 코드 칩
    if (referralCode) {
        ctx.font = `800 24px ${MONO}`;
        const refText = `REF · ${referralCode}`;
        const rW = ctx.measureText(refText).width;
        ctx.fillStyle = T.accent;
        roundRect(ctx, lx, ly, rW + 40, 50, 12); ctx.fill();
        ctx.fillStyle = T.onAccent;
        ctx.textBaseline = 'middle';
        ctx.fillText(refText, lx + 20, ly + 26);
        ctx.textBaseline = 'top';
    }

    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise((resolve) => {
        if (canvas.toBlob) canvas.toBlob(resolve, 'image/png');
        else resolve(null);
    });
    return { dataUrl, blob };
}
