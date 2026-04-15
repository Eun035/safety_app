import React from 'react';
import { Share2, Download, X, Shield, Zap, TrendingUp, Award } from 'lucide-react';
import { toast } from '../../hooks/useToast';

const ShareCard = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const { nickname, safetyScore, carbonReduction, safetyRank, topPercentage } = data;

    const handleActualShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'C-Safe 안전 리포트',
                    text: `${nickname}님의 안전 점수는 ${safetyScore}점이며, 상위 ${topPercentage || 5}%의 안전 라이더입니다!`,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share failed', err);
            }
        } else {
            toast('📸 공유 기능을 지원하지 않는 브라우저입니다. 화면을 캐프쳐하여 공유해 주세요!', 'warning');
        }
    };

    return (
        <div className="fixed inset-0 z-[7000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="relative w-full max-w-sm bg-cyber-panel rounded-[2.5rem] overflow-hidden border border-cyber-cyan/30 shadow-[0_0_50px_rgba(64,255,220,0.2)]">
                
                {/* Shareable Card Area (What the user might screenshot) */}
                <div id="share-card-content" className="p-8 bg-gradient-to-br from-cyber-panel via-cyber-panel to-cyber-cyan/10 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-cyan/5 rounded-full blur-3xl"></div>
                    
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-cyber-cyan p-2 rounded-xl shadow-neon-cyan">
                            <Shield size={20} className="text-black" />
                        </div>
                        <div>
                            <h3 className="text-white font-black italic tracking-tighter text-lg leading-none">C-SAFE</h3>
                            <p className="text-[8px] text-cyber-cyan font-black uppercase tracking-[0.2em] mt-1">Safety Impact Report</p>
                        </div>
                        <div className="ml-auto bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[9px] font-black text-gray-400">
                            2026.03.24
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyber-cyan to-blue-500 mx-auto mb-4 p-0.5 shadow-[0_0_20px_rgba(64,255,220,0.3)]">
                            <div className="w-full h-full rounded-full bg-cyber-panel flex items-center justify-center overflow-hidden">
                                <span className="text-2xl font-black text-white italic">{nickname?.[0]}</span>
                            </div>
                        </div>
                        <h4 className="text-2xl font-black text-white italic tracking-tight mb-1">{nickname}</h4>
                        <div className="inline-flex items-center bg-cyber-cyan/20 text-cyber-cyan px-4 py-1 rounded-full text-[10px] font-black tracking-widest border border-cyber-cyan/30">
                            TOP {topPercentage || 5}% RIDER
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Safety Score</p>
                            <p className="text-2xl font-black text-white italic">{safetyScore}<span className="text-[10px] ml-0.5 opacity-50">PTS</span></p>
                        </div>
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Impact</p>
                            <p className="text-2xl font-black text-cyber-green italic">-{safetyRank || '78%'} <span className="text-[10px] ml-0.5 opacity-50">RISK</span></p>
                        </div>
                    </div>

                    {/* Achievement Message */}
                    <div className="bg-cyber-cyan/10 border border-cyber-cyan/20 p-5 rounded-[1.5rem] mb-6 relative overflow-hidden">
                        <Award className="absolute -right-4 -bottom-4 text-cyber-cyan opacity-10" size={80} />
                        <p className="text-xs text-gray-200 font-bold leading-relaxed relative z-10">
                            "<span className="text-cyber-cyan font-black">{nickname}</span>님은 C-Safe를 통해 지구를 위해 <span className="text-cyber-cyan font-black">{carbonReduction}</span>의 탄소를 절감하고, 일반 유저보다 3.5배 더 안전하게 주행하고 있습니다."
                        </p>
                    </div>

                    <p className="text-[8px] text-gray-600 text-center font-bold tracking-widest uppercase mb-2">Verified by C-Safe AI Engine</p>
                </div>

                {/* Actions */}
                <div className="p-6 bg-black/40 border-t border-white/5 flex gap-3">
                    <button 
                        onClick={handleActualShare}
                        className="flex-1 bg-cyber-cyan text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-neon-cyan active:scale-95 transition-all"
                    >
                        <Share2 size={18} /> 커뮤니티 공유
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-14 h-14 bg-white/5 text-gray-400 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareCard;
