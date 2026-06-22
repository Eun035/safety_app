import { forwardRef } from 'react';

const ACCENT = '#CCFF00';
const BG_BASE = '#0a0a0a';

const RATIO_PRESETS = {
    story:  { w: 1080, h: 1920, padding: '120px 80px',  titlePx: 104, statPx: 156, miniLabelPx: 28, qrPx: 280, showSubFooter: true  },
    feed:   { w: 1080, h: 1350, padding: '90px 70px',   titlePx: 86,  statPx: 124, miniLabelPx: 26, qrPx: 240, showSubFooter: true  },
    square: { w: 1080, h: 1080, padding: '70px 60px',   titlePx: 70,  statPx: 100, miniLabelPx: 22, qrPx: 200, showSubFooter: false }
};

const computeSafetyScore = (suddenBrakeCount = 0) => {
    return Math.max(60, 100 - Math.round(suddenBrakeCount) * 5);
};

const formatDurationMmss = (timeInMinutes) => {
    const totalMin = Number(timeInMinutes) || 0;
    const mm = Math.floor(totalMin);
    const ss = Math.round((totalMin - mm) * 60);
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

const computeAvgSpeedKmh = (distanceKm, timeInMinutes) => {
    const d = Number(distanceKm) || 0;
    const t = Number(timeInMinutes) || 0;
    if (t <= 0) return 0;
    return Math.round((d / (t / 60)) * 10) / 10;
};

const ShareCard = forwardRef(({
    metrics = {},
    vibeName = 'Neon Rider',
    qrDataUrl,
    referralCode,
    ratio = 'story',
    helmetOn = false,
    routeLabel = '안심 도로'
}, ref) => {
    const preset = RATIO_PRESETS[ratio] || RATIO_PRESETS.story;
    const distance = Number(metrics?.distance ?? 2.4);
    const timeMin = Number(metrics?.time ?? 8.4);
    const suddenBrakeCount = Number(metrics?.suddenBrakeCount ?? 0);

    const durationLabel = formatDurationMmss(timeMin);
    const avgSpeed = computeAvgSpeedKmh(distance, timeMin);
    const safetyScore = computeSafetyScore(suddenBrakeCount);

    const title = `${routeLabel} ${distance.toFixed(1)}km 비행 완료 ⚡`;
    const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

    return (
        <div
            ref={ref}
            style={{
                position: 'fixed',
                left: '-9999px',
                top: 0,
                width: `${preset.w}px`,
                height: `${preset.h}px`,
                pointerEvents: 'none'
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    background: `radial-gradient(circle at 50% 25%, #15171a 0%, ${BG_BASE} 60%, #000 100%)`,
                    color: '#fff',
                    fontFamily: '"JetBrains Mono", "SF Mono", "Pretendard", system-ui, monospace',
                    padding: preset.padding,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage:
                        `linear-gradient(${ACCENT}10 1px, transparent 1px), linear-gradient(90deg, ${ACCENT}10 1px, transparent 1px)`,
                    backgroundSize: '64px 64px',
                    opacity: 0.35,
                    pointerEvents: 'none'
                }} />

                <svg
                    viewBox="0 0 1080 1920"
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.55 }}
                >
                    <defs>
                        <filter id="csafe-glow">
                            <feGaussianBlur stdDeviation="14" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>
                    <path
                        d="M 120 1640 C 280 1460, 220 1240, 480 1140 S 820 880, 720 640 S 540 320, 920 180"
                        fill="none"
                        stroke={ACCENT}
                        strokeWidth="6"
                        strokeLinecap="round"
                        filter="url(#csafe-glow)"
                    />
                    <circle cx="120" cy="1640" r="18" fill={ACCENT} filter="url(#csafe-glow)" />
                    <circle cx="920" cy="180" r="18" fill="#fff" filter="url(#csafe-glow)" />
                </svg>

                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 22px',
                        borderRadius: '999px',
                        background: `${ACCENT}1a`,
                        border: `2px solid ${ACCENT}66`
                    }}>
                        <span style={{
                            display: 'inline-block',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: ACCENT,
                            boxShadow: `0 0 16px ${ACCENT}`
                        }} />
                        <span style={{
                            fontSize: '30px',
                            fontWeight: 900,
                            color: ACCENT,
                            letterSpacing: '6px',
                            textTransform: 'uppercase'
                        }}>C-SAFE · RIDE LOG</span>
                    </div>

                    <h1 style={{
                        fontSize: `${preset.titlePx}px`,
                        fontWeight: 900,
                        lineHeight: 1.08,
                        marginTop: ratio === 'square' ? '36px' : '64px',
                        marginBottom: 0,
                        letterSpacing: '-2px',
                        fontFamily: '"Pretendard", system-ui, sans-serif'
                    }}>
                        {title}
                    </h1>

                    <p style={{
                        fontSize: `${Math.round(preset.titlePx * 0.3)}px`,
                        fontWeight: 700,
                        marginTop: '22px',
                        color: 'rgba(255,255,255,0.55)',
                        letterSpacing: '1px',
                        textTransform: 'uppercase'
                    }}>
                        {vibeName} · {today}
                    </p>

                    {helmetOn && (
                        <div style={{
                            marginTop: '34px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px 24px',
                            borderRadius: '14px',
                            background: '#000',
                            border: `2px solid ${ACCENT}`,
                            boxShadow: `0 0 24px ${ACCENT}55`
                        }}>
                            <span style={{ fontSize: '34px' }}>⛑️</span>
                            <span style={{
                                fontSize: '32px',
                                fontWeight: 900,
                                color: ACCENT,
                                letterSpacing: '6px'
                            }}>SAFE RIDER</span>
                        </div>
                    )}
                </div>

                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <StatRow
                        label="DURATION"
                        value={durationLabel}
                        unit="MM:SS"
                        valuePx={preset.statPx}
                        miniLabelPx={preset.miniLabelPx}
                        accent={ACCENT}
                    />
                    <StatRow
                        label="AVG SPEED"
                        value={String(avgSpeed)}
                        unit="km/h"
                        valuePx={preset.statPx}
                        miniLabelPx={preset.miniLabelPx}
                        accent={ACCENT}
                    />
                    <StatRow
                        label="SAFETY SCORE"
                        value={String(safetyScore)}
                        unit="%"
                        valuePx={preset.statPx}
                        miniLabelPx={preset.miniLabelPx}
                        accent={ACCENT}
                        highlight
                    />
                </div>

                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '40px'
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 900,
                            color: 'rgba(255,255,255,0.55)',
                            letterSpacing: '8px',
                            textTransform: 'uppercase',
                            marginBottom: '14px'
                        }}>
                            com.csafe.pm
                        </div>
                        {preset.showSubFooter && (
                            <div style={{
                                fontSize: ratio === 'square' ? '28px' : '36px',
                                fontWeight: 900,
                                letterSpacing: '-0.5px',
                                lineHeight: 1.2,
                                fontFamily: '"Pretendard", system-ui, sans-serif'
                            }}>
                                QR로 <span style={{ color: ACCENT }}>안전 라이딩</span><br />
                                즉시 시작
                            </div>
                        )}
                        {referralCode && (
                            <div style={{
                                marginTop: '20px',
                                display: 'inline-block',
                                padding: '10px 18px',
                                borderRadius: '10px',
                                background: '#000',
                                border: `1.5px solid ${ACCENT}55`,
                                fontSize: '22px',
                                fontWeight: 800,
                                letterSpacing: '3px',
                                color: ACCENT
                            }}>
                                REF · {referralCode}
                            </div>
                        )}
                    </div>
                    {qrDataUrl && (
                        <div style={{
                            width: `${preset.qrPx}px`,
                            height: `${preset.qrPx}px`,
                            padding: '14px',
                            background: '#fff',
                            borderRadius: '20px',
                            boxShadow: `0 12px 32px ${ACCENT}33`,
                            border: `3px solid ${ACCENT}`
                        }}>
                            <img src={qrDataUrl} alt="QR" style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

const StatRow = ({ label, value, unit, valuePx, miniLabelPx, accent, highlight = false }) => (
    <div style={{
        padding: '32px 36px',
        borderRadius: '28px',
        background: highlight ? `${accent}14` : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${highlight ? `${accent}55` : 'rgba(255,255,255,0.08)'}`,
        boxShadow: highlight ? `inset 0 0 28px ${accent}1a` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '28px'
    }}>
        <div style={{
            fontSize: `${miniLabelPx}px`,
            fontWeight: 900,
            color: highlight ? accent : 'rgba(255,255,255,0.45)',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            fontFamily: '"JetBrains Mono", "SF Mono", monospace'
        }}>
            {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
            <span style={{
                fontSize: `${valuePx}px`,
                fontWeight: 900,
                fontFamily: '"JetBrains Mono", "SF Mono", monospace',
                color: highlight ? accent : '#fff',
                letterSpacing: '-2px',
                lineHeight: 1
            }}>
                {value}
            </span>
            <span style={{
                fontSize: `${Math.round(valuePx * 0.26)}px`,
                fontWeight: 800,
                color: highlight ? accent : 'rgba(255,255,255,0.55)',
                letterSpacing: '2px',
                fontFamily: '"JetBrains Mono", "SF Mono", monospace'
            }}>
                {unit}
            </span>
        </div>
    </div>
);

ShareCard.displayName = 'ShareCard';
export default ShareCard;
