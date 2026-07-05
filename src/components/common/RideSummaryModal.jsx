import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Leaf, Zap, Share2, Gauge, ShieldCheck } from 'lucide-react';
import { toPng } from 'html-to-image';
import TargetedAdBanner from './TargetedAdBanner';
import { toast } from '../../hooks/useToast';
import ShareCard from './ShareCard';
import { buildRouteSketch } from '../../utils/routeSketch';
import { buildReferralCode, buildReferralUrl, generateQrDataUrl } from '../../utils/referral';

const RideSummaryModal = ({ isOpen, onClose, metrics, vibeName = "Neon Rider", capturedPhoto, suddenBrakeCount = 0, userId, helmetOn = false }) => {
    const { t } = useTranslation();

    const [currentTime, setCurrentTime] = useState("");
    const [isSharing, setIsSharing] = useState(false);
    const [shareRatio, setShareRatio] = useState('story'); // story | feed | square
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const shareCardRef = useRef(null);

    // 사용자 ID 기반 추천 코드 (Task 4에서 Supabase 동기화)
    const referralCode = buildReferralCode(userId);

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

    // 모달 열릴 때 QR dataURL 1회 생성
    useEffect(() => {
        if (!isOpen) return;
        let canceled = false;
        const url = buildReferralUrl(referralCode);
        generateQrDataUrl(url, 320).then(dataUrl => {
            if (!canceled) setQrDataUrl(dataUrl);
        });
        return () => { canceled = true; };
    }, [isOpen, referralCode]);

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
            setCurrentTime(now.toLocaleString('en-US', options).replace(',', ' •'));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleShare = async () => {
        if (!shareCardRef.current || isSharing) return;
        setIsSharing(true);
        try {
            // 1) 오프스크린 ShareCard DOM → PNG 캡처
            const dataUrl = await toPng(shareCardRef.current, {
                pixelRatio: 1,           // ShareCard 내부에 이미 1080px 기준 큰 크기 사용
                cacheBust: true,
                backgroundColor: '#000'
            });

            // 2) dataURL → Blob → File (navigator.share file 지원 위해)
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `c-safe-ride-${Date.now()}.png`, { type: 'image/png' });

            // 3) Web Share Level 2 (파일 공유) 지원 시 → 인스타·카톡 직통
            const shareText = t('rsm_share_text', { km: Number(metrics?.distance ?? 2.4).toFixed(1) });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: 'C-Safe Ride',
                        text: shareText,
                        files: [file]
                    });
                    return;
                } catch (e) {
                    if (e?.name === 'AbortError') return; // 사용자 취소
                    console.warn('files share failed, falling back:', e);
                }
            }

            // 4) 폴백 — 카드 PNG 다운로드 + 텍스트 클립보드
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `c-safe-ride-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareText);
            }
            toast(t('rsm_saved_toast'), 'success');
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
                                    <path d={routeSketch.d} fill="none" stroke="#40ffdc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
                                    <circle cx={routeSketch.start.x} cy={routeSketch.start.y} r="3.5" fill="#a855f7" filter="url(#glow)" />
                                    <circle cx={routeSketch.end.x} cy={routeSketch.end.y} r="3.5" fill="#40ffdc" filter="url(#glow)" />
                                </>
                            ) : (
                                // 경로 데이터가 없을 때(아주 짧은 주행)만 사용하는 폴백 스케치
                                <path d="M 20,70 C 45,70 45,25 70,25 S 95,10 100,18" fill="none" stroke="#40ffdc55" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" filter="url(#glow)" />
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

                    {/* Share Button */}
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="w-full h-14 bg-gradient-to-r from-cyber-cyan to-purple-500 rounded-2xl flex items-center justify-center gap-2 font-black text-black shadow-lg shadow-cyber-cyan/20 active:scale-95 transition-transform mt-2 disabled:opacity-60"
                    >
                        <Share2 size={18} className="text-black" />
                        {isSharing ? t('rsm_generating') : 'Share to Instagram'}
                    </button>

                    {/* 🖼️ 오프스크린 공유 카드 (캡처 전용, 화면에 보이지 않음) */}
                    <ShareCard
                        ref={shareCardRef}
                        metrics={metrics}
                        vibeName={vibeName}
                        ratio={shareRatio}
                        qrDataUrl={qrDataUrl}
                        referralCode={referralCode}
                        helmetOn={helmetOn}
                        path={ridePath}
                        routeLabel={metrics?.destination || null}
                    />

                    <p className="text-center text-[7px] font-black text-white/20 uppercase tracking-[0.2em] mt-8 mb-2">
                        GENERATED BY CHILLRIDE LABS
                    </p>
                </div>
            </div>
        </div >
    );
};

export default RideSummaryModal;
