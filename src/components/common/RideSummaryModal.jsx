import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, MoreHorizontal, Leaf, Zap, Share2, Play } from 'lucide-react';
import { toPng } from 'html-to-image';
import TargetedAdBanner from './TargetedAdBanner';
import { toast } from '../../hooks/useToast';
import ShareCard from './ShareCard';
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
                    <button className="w-10 h-10 bg-[#151921] rounded-full flex items-center justify-center border border-white/5 active:scale-95 transition-transform">
                        <MoreHorizontal size={20} className="text-cyber-cyan" />
                    </button>
                </div>

                <div className="flex-1 px-6 pt-6 pb-8 overflow-y-auto hide-scrollbar">
                    {/* Map Card */}
                    <div className="bg-[#12161b] rounded-[32px] w-full aspect-[4/3] relative overflow-hidden border border-white/5 mb-4 p-4 shadow-lg flex items-center justify-center">
                        {/* Glowing Route Graph Simulation */}
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <path d="M 20,80 C 40,80 40,30 60,30 S 80,10 80,20" fill="transparent" stroke="#40ffdc" strokeWidth="1.5" filter="url(#glow)" />
                            <circle cx="20" cy="80" r="3" fill="#a855f7" />
                            <circle cx="80" cy="20" r="3" fill="#40ffdc" />
                        </svg>

                        <div className="absolute bottom-4 left-4 bg-[#1a1f26]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse"></div>
                            <span className="text-[10px] font-bold text-white tracking-widest uppercase">Sunset Boulevard</span>
                        </div>
                    </div>

                    {/* Primary Stats */}
                    <div className="flex gap-4 mb-8">
                        <div className="flex-1 bg-[#12161b] rounded-3xl p-5 border border-white/5 shadow-lg flex flex-col items-center justify-center">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">TOTAL DISTANCE</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black italic tracking-tighter text-white">{metrics?.distance || '12.4'}</span>
                                <span className="text-xs font-bold text-cyber-cyan">km</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-[#12161b] rounded-3xl p-5 border border-white/5 shadow-lg flex flex-col items-center justify-center">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">RIDING TIME</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black italic tracking-tighter text-white">{metrics?.time || 42}</span>
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
                                    <p className="font-black italic text-lg text-white">{metrics?.co2Saved || '2.4'} kg <span className="text-xs font-bold not-italic text-cyber-green ml-1 tracking-tight">Green Living</span></p>
                                </div>
                            </div>

                            <div className="bg-[#12161b] rounded-[24px] p-4 flex items-center gap-4 relative overflow-hidden border border-white/5">
                                <Zap className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 text-purple-500/5 stroke-[0.5]" />
                                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] shrink-0 z-10">
                                    <Zap size={20} className="text-purple-400" />
                                </div>
                                <div className="fill-white z-10">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5">Vibe Score</p>
                                    <p className="font-black italic text-lg text-white tracking-tighter">Chill AF <span className="text-[10px] not-italic text-cyber-cyan ml-1 tracking-widest">★★★★★</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ride Memories */}
                    <div className="mb-8">


                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-white">Ride Memories</h3>
                            <span className="text-[10px] font-bold text-cyber-cyan tracking-widest uppercase">4 Photos</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x">
                            {[
                                capturedPhoto || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=200&h=200',
                                'https://images.unsplash.com/photo-1593950315186-76a92975b60c?auto=format&fit=crop&q=80&w=200&h=200',
                                'https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&q=80&w=200&h=200',
                                'https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?auto=format&fit=crop&q=80&w=200&h=200'
                            ].map((src, i) => (
                                <div key={i} className="w-32 h-32 shrink-0 rounded-[28px] overflow-hidden relative snap-center shadow-lg bg-[#1a1f26]">
                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                    {i === 2 && (
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[1px]">
                                            <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center bg-black/40">
                                                <Play size={12} className="text-white fill-white ml-0.5" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
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
