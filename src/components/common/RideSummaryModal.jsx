import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Leaf, Zap, Share2, Gauge, ShieldCheck } from 'lucide-react';
import TargetedAdBanner from './TargetedAdBanner';
import { toast } from '../../hooks/useToast';
import { buildRouteSketch } from '../../utils/routeSketch';
import { renderShareCard, SHARE_THEMES, suggestTheme } from '../../utils/renderShareCard';
import { buildReferralCode, buildReferralUrl } from '../../utils/referral';

const RideSummaryModal = ({ isOpen, onClose, metrics, vibeName = "Neon Rider", capturedPhoto, suddenBrakeCount = 0, userId, helmetOn = false }) => {
    const { t } = useTranslation();

    const [currentTime, setCurrentTime] = useState("");
    const [isSharing, setIsSharing] = useState(false);
    const [shareRatio, setShareRatio] = useState('story'); // story | feed | square
    const [shareTheme, setShareTheme] = useState(() => suggestTheme(metrics?.suddenBrakeCount ?? suddenBrakeCount)); // 주행 성향에 맞춘 기본 테마
    const [shareAsset, setShareAsset] = useState(null); // 미리 렌더해 둔 { file, dataUrl }

    // 사용자 ID 기반 추천 코드 (Task 4에서 Supabase 동기화)
    const referralCode = buildReferralCode(userId);
    const referralUrl = buildReferralUrl(referralCode);

    // ── 실제 주행 이력 기반 파생 데이터 (목업 제거) ─────────────────────
    // 실제 GPS 경로 → 종횡비 보존 스케치 라인 (미리보기 & 공유 카드 공용)
    const ridePath = metrics?.path;
    const routeSketch = useMemo(
        () => buildRouteSketch(ridePath, { width: 120, height: 90, padding: 14 }),
        [ridePath]
    );
    const routeLabel = metrics?.destination || t('rsm_route_fallback');

    const distanceKm = Number(metrics?.distance ?? 0);
    const timeMin = Number(metrics?.time ?? 0);
    const topSpeed = Number(metrics?.topSpeed ?? 0);
    const avgSpeed = timeMin > 0 ? Math.round((distanceKm / (timeMin / 60)) * 10) / 10 : 0;
    const brakes = Number(metrics?.suddenBrakeCount ?? suddenBrakeCount ?? 0);
    const safetyScore = Math.max(60, 100 - Math.round(brakes) * 5);

    // 급정거 횟수 기반 실데이터 vibe (하드코딩 "Chill AF" 대체)
    const vibe = brakes === 0
        ? { label: t('rsm_vibe_chill'), stars: 5 }
        : brakes <= 2
            ? { label: t('rsm_vibe_smooth'), stars: 4 }
            : { label: t('rsm_vibe_easy'), stars: 3 };

    // 선택된 테마의 대표색 — 미리보기 경로에도 반영해 즉각 피드백
    const themeAccent = (SHARE_THEMES.find(x => x.id === shareTheme) || SHARE_THEMES[0]).accent;

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
            setCurrentTime(now.toLocaleString('en-US', options).replace(',', ' •'));
        }
    }, [isOpen]);

    // 공유 카드 이미지를 미리 렌더해 둔다 → 버튼 클릭 시 navigator.share를 지연 없이(사용자 제스처
    // 활성 상태에서) 즉시 호출할 수 있어 모바일 공유 시트가 확실히 뜬다. 비율/테마 변경 시 재생성.
    useEffect(() => {
        if (!isOpen) { setShareAsset(null); return; }
        let cancelled = false;
        (async () => {
            try {
                if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* noop */ } }
                const { dataUrl, blob: canvasBlob } = await renderShareCard({
                    metrics,
                    vibeName,
                    referralCode,
                    shareUrl: referralUrl,
                    ratio: shareRatio,
                    theme: shareTheme,
                    helmetOn,
                    path: ridePath,
                    routeLabel: metrics?.destination || null,
                });
                if (cancelled) return;
                const blob = canvasBlob || await (await fetch(dataUrl)).blob();
                const file = new File([blob], `c-safe-ride-${Date.now()}.png`, { type: 'image/png' });
                if (!cancelled) setShareAsset({ file, dataUrl });
            } catch (e) {
                console.warn('[C-Safe] 공유 카드 사전 렌더 실패:', e?.message || e);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, shareRatio, shareTheme, referralUrl, referralCode, metrics, vibeName, helmetOn, ridePath]);

    if (!isOpen) return null;

    const buildShareText = () => {
        const km = Number(metrics?.distance ?? 2.4).toFixed(1);
        return [t('rsm_share_text', { km }), '', t('rsm_share_hashtags'), referralUrl].join('\n');
    };

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);
        try {
            // 미리 렌더된 카드 사용(없으면 즉석 렌더)
            let asset = shareAsset;
            if (!asset) {
                const { dataUrl, blob: canvasBlob } = await renderShareCard({
                    metrics, vibeName, referralCode, shareUrl: referralUrl,
                    ratio: shareRatio, theme: shareTheme, helmetOn, path: ridePath,
                    routeLabel: metrics?.destination || null,
                });
                const blob = canvasBlob || await (await fetch(dataUrl)).blob();
                asset = { file: new File([blob], `c-safe-ride-${Date.now()}.png`, { type: 'image/png' }), dataUrl };
            }

            const shareText = buildShareText();

            // 1) 파일 공유 우선 — 클립보드보다 먼저 호출해야 사용자 제스처가 소모되지 않아 시트가 뜬다.
            if (navigator.canShare && navigator.canShare({ files: [asset.file] })) {
                try {
                    await navigator.share({ title: 'C-Safe Ride', text: shareText, files: [asset.file] });
                    // 공유 성공 후 캡션 복사(인스타 붙여넣기용) — best effort
                    try { await navigator.clipboard?.writeText(shareText); } catch { /* noop */ }
                    toast(t('rsm_caption_copied'), 'success');
                    return;
                } catch (e) {
                    if (e?.name === 'AbortError') return; // 사용자 취소
                    console.warn('files share failed, falling back:', e);
                }
            }

            // 2) 폴백 — 캡션 복사 + 카드 PNG 다운로드
            let copied = false;
            try { await navigator.clipboard?.writeText(shareText); copied = true; } catch { /* noop */ }
            const link = document.createElement('a');
            link.href = asset.dataUrl;
            link.download = `c-safe-ride-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast(copied ? t('rsm_caption_copied') : t('rsm_saved_toast'), 'success');
        } catch (error) {
            console.error('공유 실패:', error);
            toast(t('rsm_share_fail'), 'error');
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in font-pretendard">
            <div className="bg-[#0b0e11] w-full max-w-sm sm:max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5 shrink-0 bg-[#0a0c0f]">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-[#151921] rounded-full flex items-center justify-center border border-white/5 active:scale-95 transition-transform"
                    >
                        <ChevronLeft size={20} className="text-cyber-cyan" />
                    </button>
                    <div className="text-center">
                        <h2 className="text-[12px] font-black uppercase tracking-widest text-white/90">RIDE SUMMARY</h2>
                        <p className="text-[10px] font-bold text-cyber-cyan mt-1">{currentTime || 'Oct 24 • 5:14 PM'}</p>
                    </div>
                    {/* 우측 자리 맞춤용 spacer — 기존 '더보기' 버튼은 동작이 없어 제거 (제목 중앙 정렬 유지) */}
                    <div className="w-10 h-10" aria-hidden="true" />
                </div>

                <div className="flex-1 px-6 pt-6 pb-8 overflow-y-auto hide-scrollbar">
                    {/* Map Card — 실제 주행 GPS 경로 스케치 */}
                    <div className="bg-[#12161b] rounded-[32px] w-full aspect-[4/3] relative overflow-hidden border border-white/5 mb-4 p-4 shadow-lg flex items-center justify-center">
                        {/* 배경 그리드 (트렌디한 데이터 감성) */}
                        <div
                            className="absolute inset-0 opacity-[0.15]"
                            style={{
                                backgroundImage:
                                    'linear-gradient(#40ffdc22 1px, transparent 1px), linear-gradient(90deg, #40ffdc22 1px, transparent 1px)',
                                backgroundSize: '22px 22px'
                            }}
                        />
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid meet">
                            <defs>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            {routeSketch ? (
                                <>
                                    <path d={routeSketch.d} fill="none" stroke={themeAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
                                    <circle cx={routeSketch.start.x} cy={routeSketch.start.y} r="3.5" fill="#a855f7" filter="url(#glow)" />
                                    <circle cx={routeSketch.end.x} cy={routeSketch.end.y} r="3.5" fill={themeAccent} filter="url(#glow)" />
                                </>
                            ) : (
                                // 경로 데이터가 없을 때(아주 짧은 주행)만 사용하는 폴백 스케치
                                <path d="M 20,70 C 45,70 45,25 70,25 S 95,10 100,18" fill="none" stroke={themeAccent} strokeOpacity="0.4" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" filter="url(#glow)" />
                            )}
                        </svg>

                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
                            <div className="bg-[#1a1f26]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse shrink-0"></div>
                                <span className="text-[10px] font-bold text-white tracking-widest uppercase truncate">{routeLabel}</span>
                            </div>
                            <span className="text-[9px] font-bold text-white/40 tracking-wider shrink-0">
                                {routeSketch ? t('rsm_route_points', { n: routeSketch.count }) : t('rsm_route_empty')}
                            </span>
                        </div>
                    </div>

                    {/* Primary Stats */}
                    <div className="flex gap-4 mb-8">
                        <div className="flex-1 bg-[#12161b] rounded-3xl p-5 border border-white/5 shadow-lg flex flex-col items-center justify-center">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">TOTAL DISTANCE</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black italic tracking-tighter text-white">{distanceKm.toFixed(1)}</span>
                                <span className="text-xs font-bold text-cyber-cyan">km</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-[#12161b] rounded-3xl p-5 border border-white/5 shadow-lg flex flex-col items-center justify-center">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">RIDING TIME</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black italic tracking-tighter text-white">{timeMin}</span>
                                <span className="text-xs font-bold text-cyber-cyan">mins</span>
                            </div>
                        </div>
                    </div>

                    {/* ✨ Chill Stats */}
                    <div className="mb-8">
                        <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                            <span className="text-cyber-cyan text-lg leading-none">✨</span> Chill Stats
                        </h3>
                        <div className="flex flex-col gap-3">
                            <div className="bg-[#12161b] rounded-[24px] p-4 flex items-center gap-4 relative overflow-hidden border border-white/5">
                                <Leaf className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 text-cyber-green/5 stroke-[0.5]" />
                                <div className="w-10 h-10 bg-cyber-green/20 rounded-full flex items-center justify-center shadow-neon-green shrink-0 z-10">
                                    <Leaf size={20} className="text-cyber-green" />
                                </div>
                                <div className="fill-white z-10">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5">CO2 Saved</p>
                                    <p className="font-black italic text-lg text-white">{metrics?.co2Saved ?? '0.0'} kg <span className="text-xs font-bold not-italic text-cyber-green ml-1 tracking-tight">Green Living</span></p>
                                </div>
                            </div>

                            <div className="bg-[#12161b] rounded-[24px] p-4 flex items-center gap-4 relative overflow-hidden border border-white/5">
                                <Zap className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 text-purple-500/5 stroke-[0.5]" />
                                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] shrink-0 z-10">
                                    <Zap size={20} className="text-purple-400" />
                                </div>
                                <div className="fill-white z-10">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5">Vibe Score</p>
                                    <p className="font-black italic text-lg text-white tracking-tighter">{vibe.label} <span className="text-[10px] not-italic text-cyber-cyan ml-1 tracking-widest">{'★'.repeat(vibe.stars)}{'☆'.repeat(5 - vibe.stars)}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ride Highlights — 실제 주행 지표 기반 (목업 사진 제거) */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-white">{t('rsm_highlights')}</h3>
                        </div>
                        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x">
                            {/* 사용자가 실제로 찍은 순간(있을 때만) */}
                            {capturedPhoto && (
                                <div className="w-32 h-32 shrink-0 rounded-[28px] overflow-hidden relative snap-center shadow-lg bg-[#1a1f26]">
                                    <img src={capturedPhoto} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                        <span className="text-[8px] font-black text-white uppercase tracking-widest">{t('rsm_hl_photo')}</span>
                                    </div>
                                </div>
                            )}

                            {/* 최고 속도 */}
                            <div className="w-32 h-32 shrink-0 rounded-[28px] snap-center shadow-lg bg-gradient-to-br from-[#1a1f26] to-[#12161b] border border-cyber-cyan/20 p-4 flex flex-col justify-between relative overflow-hidden">
                                <Gauge className="absolute -right-3 -bottom-3 w-20 h-20 text-cyber-cyan/5 stroke-[0.5]" />
                                <Gauge size={20} className="text-cyber-cyan z-10" />
                                <div className="z-10">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-0.5">{t('rsm_hl_topspeed')}</p>
                                    <p className="font-black italic text-xl text-white tracking-tighter">{topSpeed.toFixed(1)}<span className="text-[10px] not-italic text-cyber-cyan ml-1">km/h</span></p>
                                </div>
                            </div>

                            {/* 평균 속도 */}
                            <div className="w-32 h-32 shrink-0 rounded-[28px] snap-center shadow-lg bg-gradient-to-br from-[#1a1f26] to-[#12161b] border border-purple-500/20 p-4 flex flex-col justify-between relative overflow-hidden">
                                <Zap className="absolute -right-3 -bottom-3 w-20 h-20 text-purple-500/5 stroke-[0.5]" />
                                <Zap size={20} className="text-purple-400 z-10" />
                                <div className="z-10">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-0.5">{t('rsm_hl_avgspeed')}</p>
                                    <p className="font-black italic text-xl text-white tracking-tighter">{avgSpeed.toFixed(1)}<span className="text-[10px] not-italic text-purple-300 ml-1">km/h</span></p>
                                </div>
                            </div>

                            {/* 안전 점수 */}
                            <div className="w-32 h-32 shrink-0 rounded-[28px] snap-center shadow-lg bg-gradient-to-br from-[#1a1f26] to-[#12161b] border border-cyber-green/20 p-4 flex flex-col justify-between relative overflow-hidden">
                                <ShieldCheck className="absolute -right-3 -bottom-3 w-20 h-20 text-cyber-green/5 stroke-[0.5]" />
                                <ShieldCheck size={20} className="text-cyber-green z-10" />
                                <div className="z-10">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-0.5">{t('rsm_hl_safety')}</p>
                                    <p className="font-black italic text-xl text-white tracking-tighter">{safetyScore}<span className="text-[10px] not-italic text-cyber-green ml-1">%</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Targeted Context-aware Ad */}
                    <TargetedAdBanner suddenBrakeCount={suddenBrakeCount} />

                    {/* 🎨 스타일(바이브) 선택 — 카드 테마 */}
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-3 mb-2">{t('rsm_style')}</p>
                    <div className="flex gap-2 mb-3">
                        {SHARE_THEMES.map(opt => {
                            const active = shareTheme === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setShareTheme(opt.id)}
                                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-wider transition active:scale-95 flex items-center justify-center gap-1.5 border ${
                                        active ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}
                                    style={active ? { borderColor: opt.accent, color: opt.accent } : undefined}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: opt.accent, boxShadow: active ? `0 0 8px ${opt.accent}` : 'none' }} />
                                    {t(`rsm_theme_${opt.id}`)}
                                </button>
                            );
                        })}
                    </div>

                    {/* 비율 선택 chip — 인스타 스토리·피드·정사각 */}
                    <div className="flex gap-2 mt-2 mb-3">
                        {[
                            { id: 'story',  label: t('rsm_ratio_story') },
                            { id: 'feed',   label: t('rsm_ratio_feed')  },
                            { id: 'square', label: t('rsm_ratio_square') }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setShareRatio(opt.id)}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-wider transition active:scale-95 ${
                                    shareRatio === opt.id
                                        ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40'
                                        : 'bg-white/5 text-gray-400 border border-white/10'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Share Button — 크게 배치 */}
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="w-full h-[68px] bg-gradient-to-r from-cyber-cyan to-purple-500 rounded-[22px] flex items-center justify-center gap-2.5 font-black text-black text-[17px] shadow-lg shadow-cyber-cyan/30 active:scale-95 transition-transform mt-2 disabled:opacity-60"
                    >
                        <Share2 size={22} className="text-black" strokeWidth={2.5} />
                        {isSharing ? t('rsm_generating') : 'Share to Instagram'}
                    </button>

                    <p className="text-center text-[7px] font-black text-white/20 uppercase tracking-[0.2em] mt-8 mb-2">
                        GENERATED BY CHILLRIDE LABS
                    </p>
                </div>
            </div>
        </div >
    );
};

export default RideSummaryModal;
