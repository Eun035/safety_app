import { forwardRef } from 'react';
import { Leaf, Zap, Shield, MapPin } from 'lucide-react';

/**
 * 인스타 공유용 라이딩 카드 (오프스크린 렌더링).
 *
 * RideSummaryModal의 handleShare에서 html-to-image로 이 컴포넌트를 캡처해
 * PNG 파일로 변환 후 navigator.share에 전달한다.
 *
 * 비율은 Task 2에서 9:16(스토리) / 4:5(피드) / 1:1(정사각) 3종으로 확장.
 * 1차 구현은 9:16 스토리 비율(1080×1920)만 — 인스타 사용량 70% 차지.
 *
 * Props:
 *   - metrics: { distance, time, co2Saved, topSpeed, suddenBrakeCount }
 *   - vibeName: 라이더 표시명 / Vibe 모드 이름
 *   - qrDataUrl: QR 코드 PNG dataURL (Task 3에서 주입)
 *   - referralCode: 표시용 추천 코드 문자열 (Task 4에서 주입)
 *   - ratio: 'story' | 'feed' | 'square'  (Task 2 확장)
 */
const RATIO_PRESETS = {
    // 인스타 스토리·피드·정사각 — 비율별 내부 여백·헤딩 크기·푸터 압축도 다름
    story:  { w: 1080, h: 1920, label: 'Story',  padding: '120px 80px', headingPx: 96, bigStatPx: 120, miniStatPx: 34, qrPx: 280, gapPx: 32, showSubFooter: true  },
    feed:   { w: 1080, h: 1350, label: 'Feed',   padding: '80px 70px',  headingPx: 78, bigStatPx: 100, miniStatPx: 30, qrPx: 240, gapPx: 26, showSubFooter: true  },
    square: { w: 1080, h: 1080, label: 'Square', padding: '60px 60px',  headingPx: 64, bigStatPx: 84,  miniStatPx: 24, qrPx: 200, gapPx: 20, showSubFooter: false }
};

const ShareCard = forwardRef(({ metrics = {}, vibeName = 'Neon Rider', qrDataUrl, referralCode, ratio = 'story' }, ref) => {
    const preset = RATIO_PRESETS[ratio] || RATIO_PRESETS.story;
    const distance = metrics?.distance ?? 12.4;
    const time = metrics?.time ?? 42;
    const co2 = metrics?.co2Saved ?? '2.4';
    const topSpeed = metrics?.topSpeed ?? 23;
    const safe = metrics?.suddenBrakeCount === 0;

    return (
        <div
            ref={ref}
            // 화면에 보이지 않게 offscreen 위치 (캡처용)
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
                    background: 'radial-gradient(circle at 30% 20%, #0e2030 0%, #050a10 60%, #000 100%)',
                    color: '#fff',
                    fontFamily: 'Pretendard, system-ui, sans-serif',
                    padding: preset.padding,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* 배경 글로우 */}
                <div style={{
                    position: 'absolute',
                    top: '-200px', right: '-200px',
                    width: '700px', height: '700px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(64,255,220,0.18), transparent 70%)',
                    filter: 'blur(40px)'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-300px', left: '-200px',
                    width: '800px', height: '800px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)',
                    filter: 'blur(40px)'
                }} />

                {/* 헤더 */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '14px 26px',
                        borderRadius: '999px',
                        background: 'rgba(64, 255, 220, 0.12)',
                        border: '2px solid rgba(64, 255, 220, 0.35)'
                    }}>
                        <Shield size={36} color="#40ffdc" strokeWidth={3} />
                        <span style={{
                            fontSize: '34px',
                            fontWeight: 900,
                            color: '#40ffdc',
                            letterSpacing: '4px',
                            textTransform: 'uppercase'
                        }}>C-Safe Ride</span>
                    </div>
                    <h1 style={{
                        fontSize: `${preset.headingPx}px`,
                        fontWeight: 900,
                        lineHeight: 1.05,
                        marginTop: ratio === 'square' ? '32px' : '60px',
                        marginBottom: '0',
                        letterSpacing: '-3px'
                    }}>
                        오늘도<br />
                        <span style={{ color: '#40ffdc' }}>안전하게</span><br />
                        달렸어요.
                    </h1>
                    <p style={{
                        fontSize: `${Math.round(preset.headingPx * 0.34)}px`,
                        fontWeight: 700,
                        marginTop: '24px',
                        color: 'rgba(255,255,255,0.65)',
                        letterSpacing: '-0.5px'
                    }}>
                        {vibeName} · {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* 메인 수치 */}
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: `${preset.gapPx}px` }}>
                    <div style={{
                        display: 'flex',
                        gap: `${preset.gapPx}px`
                    }}>
                        <StatBox label="거리" value={distance} unit="km" accent="#40ffdc" valuePx={preset.bigStatPx} />
                        <StatBox label="시간" value={time} unit="분" accent="#a855f7" valuePx={preset.bigStatPx} />
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: `${Math.round(preset.gapPx * 0.75)}px`
                    }}>
                        <MiniStat icon={<Leaf size={36} color="#38ef7d" />} label="CO₂ 절감" value={`${co2} kg`} color="#38ef7d" valuePx={preset.miniStatPx} />
                        <MiniStat icon={<Zap size={36} color="#fbbf24" />} label="최고 속도" value={`${topSpeed} km/h`} color="#fbbf24" valuePx={preset.miniStatPx} />
                        <MiniStat icon={<Shield size={36} color={safe ? '#40ffdc' : '#f97316'} />} label="안전 운행" value={safe ? '완벽' : '주의'} color={safe ? '#40ffdc' : '#f97316'} valuePx={preset.miniStatPx} />
                    </div>
                </div>

                {/* 푸터: QR + 다운로드 유도 */}
                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '40px'
                }}>
                    <div style={{ flex: 1 }}>
                        {preset.showSubFooter && (
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 800,
                                color: 'rgba(255,255,255,0.55)',
                                letterSpacing: '4px',
                                textTransform: 'uppercase',
                                marginBottom: '12px'
                            }}>
                                <MapPin size={22} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-4px' }} />
                                천안 · 아산 PM 안전 가이드
                            </div>
                        )}
                        <div style={{
                            fontSize: ratio === 'square' ? '30px' : '40px',
                            fontWeight: 900,
                            letterSpacing: '-1px',
                            lineHeight: 1.15
                        }}>
                            QR 찍고<br />
                            <span style={{ color: '#40ffdc' }}>안전 코치</span> 즉시 시작
                        </div>
                        {referralCode && (
                            <div style={{
                                marginTop: '20px',
                                display: 'inline-block',
                                padding: '10px 20px',
                                borderRadius: '14px',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1.5px solid rgba(255,255,255,0.18)',
                                fontSize: '22px',
                                fontWeight: 800,
                                letterSpacing: '2px',
                                color: '#fff'
                            }}>
                                추천코드 {referralCode}
                            </div>
                        )}
                    </div>
                    {qrDataUrl && (
                        <div style={{
                            width: `${preset.qrPx}px`,
                            height: `${preset.qrPx}px`,
                            padding: '16px',
                            background: '#fff',
                            borderRadius: '24px',
                            boxShadow: '0 12px 36px rgba(64,255,220,0.25)'
                        }}>
                            <img src={qrDataUrl} alt="QR" style={{ width: '100%', height: '100%', display: 'block' }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

const StatBox = ({ label, value, unit, accent, valuePx = 120 }) => (
    <div style={{
        flex: 1,
        padding: valuePx >= 100 ? '36px 32px' : '26px 26px',
        borderRadius: '32px',
        background: 'rgba(255,255,255,0.04)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
    }}>
        <div style={{
            fontSize: '22px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            marginBottom: '12px'
        }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{
                fontSize: `${valuePx}px`,
                fontWeight: 900,
                fontStyle: 'italic',
                color: '#fff',
                letterSpacing: '-4px',
                lineHeight: 1
            }}>{value}</span>
            <span style={{ fontSize: '32px', fontWeight: 800, color: accent }}>{unit}</span>
        </div>
    </div>
);

const MiniStat = ({ icon, label, value, color, valuePx = 34 }) => (
    <div style={{
        flex: 1,
        padding: '22px 20px',
        borderRadius: '24px',
        background: 'rgba(255,255,255,0.03)',
        border: '1.5px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
    }}>
        <div>{icon}</div>
        <div>
            <div style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '6px'
            }}>{label}</div>
            <div style={{ fontSize: `${valuePx}px`, fontWeight: 900, color, letterSpacing: '-0.5px' }}>{value}</div>
        </div>
    </div>
);

ShareCard.displayName = 'ShareCard';
export default ShareCard;
