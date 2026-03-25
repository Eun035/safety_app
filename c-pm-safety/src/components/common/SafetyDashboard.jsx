import React, { useState } from 'react';
import { Shield, TrendingUp, Award, Clock, MapPin, ChevronRight, Star, Zap, Activity, Share2, Crown, Target, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ShareCard from './ShareCard';

const SafetyDashboard = ({ isOpen, onClose, profile }) => {
    const { t } = useTranslation();
    const [isShareOpen, setIsShareOpen] = useState(false);

    if (!isOpen) return null;

    // 지원언어 상태 반영 및 데이터 바인딩
    const stats = profile || {
        nickname: "안전운전자",
        dashboard: {
            safetyScore: 92,
            rewardPoints: 2450,
            carbonReduction: "4.2kg",
            safetyRank: "GOLD"
        },
        badges: [
            { id: 1, icon: Shield, name: "안전 마스터", desc: "50km 무사고 주행", color: "text-cyber-cyan", bg: "bg-cyber-cyan/10" },
            { id: 2, icon: Zap, name: "탄소 사냥꾼", desc: "탄소 5kg 절감 달성", color: "text-cyber-green", bg: "bg-cyber-green/10" },
            { id: 3, icon: Heart, name: "매너 라이더", desc: "칭찬 피드백 10회", color: "text-red-400", bg: "bg-red-400/10" },
            { id: 4, icon: Crown, name: "얼리버드", desc: "새벽 주행 5회 완주", color: "text-amber-400", bg: "bg-amber-400/10" }
        ],
        recent_routes: [
            { from_loc: "단국대 정문", to_loc: "죽전역 1번출구", distance_km: 1.2, created_at: new Date().toISOString() },
            { from_loc: "보정동 카페거리", to_loc: "단국대 도서관", distance_km: 2.1, created_at: new Date(Date.now() - 86400000).toISOString() }
        ]
    };

    const dashboard = {
        safetyScore: stats.safety_score || 92,
        rewardPoints: stats.reward_points || 2450,
        carbonReduction: `${stats.carbon_reduction || 4.2}kg`,
        safetyRank: stats.safety_rank || "GOLD",
        level: Math.floor((stats.safety_score || 92) / 10) + 1,
        topPercentage: 5
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Content */}
            <div className="relative bg-cyber-panel w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[3rem] sm:rounded-[2.5rem] overflow-y-auto animate-in slide-in-from-bottom duration-500 shadow-2xl border border-white/10 pb-10 scrollbar-hide">
                
                {/* Visual Header / Level System */}
                <div className="bg-gradient-to-br from-cyber-cyan/30 via-cyber-panel to-cyber-panel p-8 text-white relative border-b border-white/5 overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyber-cyan to-blue-500 p-0.5 shadow-neon-cyan">
                            <div className="w-full h-full rounded-full bg-cyber-panel flex items-center justify-center overflow-hidden">
                                <span className="text-xl font-black italic">{stats.nickname?.[0]}</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-black italic tracking-tighter text-white">{stats.nickname}</h2>
                                <span className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase text-cyber-cyan tracking-widest border border-cyber-cyan/20">LV.{dashboard.level}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Verified Global Safe User</p>
                        </div>
                        <button 
                            onClick={() => setIsShareOpen(true)}
                            className="ml-auto w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-glass active:scale-90 transition-all text-cyber-cyan"
                        >
                            <Share2 size={24} />
                        </button>
                    </div>

                    <div className="flex items-end justify-between relative z-10 mb-6">
                        <div>
                            <p className="text-[9px] font-black text-cyber-cyan uppercase tracking-[0.2em] mb-1">Global Safety Score</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(64,255,220,0.3)]">{dashboard.safetyScore}</span>
                                <span className="text-xl font-bold opacity-50 text-cyber-cyan">PTS</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="bg-cyber-cyan text-black px-4 py-1.5 rounded-full text-[10px] font-black shadow-neon-cyan tracking-widest uppercase flex items-center gap-1.5 mb-2">
                                <Crown size={12} className="fill-black" /> {dashboard.safetyRank}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">상위 {dashboard.topPercentage}% 이내</p>
                        </div>
                    </div>

                    {/* Level Progress */}
                    <div className="relative z-10">
                        <div className="flex justify-between text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">
                            <span>LV.{dashboard.level}</span>
                            <span>{dashboard.safetyScore}/100</span>
                            <span>LV.{dashboard.level + 1}</span>
                        </div>
                        <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-white/10 shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-cyber-cyan to-blue-500 shadow-neon-cyan transition-all duration-1000"
                                style={{ width: `${dashboard.safetyScore}%` }}
                            >
                                <div className="w-full h-full bg-white/10 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges Section - NEW & UNIQUE */}
                <div className="px-8 mt-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center">
                            <Award size={14} className="mr-2 text-cyber-green" /> {t("Activity Badges") || "활동 배지 컬렉션"}
                        </h3>
                        <span className="text-[10px] font-bold text-cyber-green bg-cyber-green/10 px-2 py-0.5 rounded uppercase tracking-widest">4 / 12</span>
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                        {(stats.badges || []).map((badge) => (
                            <div key={badge.id} className="min-w-[120px] flex flex-col items-center p-5 rounded-[2rem] bg-black/40 border border-white/5 relative group transition-all hover:border-cyber-cyan/30">
                                <div className={`w-14 h-14 rounded-full ${badge.bg} flex items-center justify-center mb-3 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border border-white/5`}>
                                    <badge.icon size={28} className={badge.color} />
                                </div>
                                <p className="text-[11px] font-black text-white mb-0.5">{badge.name}</p>
                                <p className="text-[8px] text-gray-500 font-bold text-center leading-tight">{badge.desc}</p>
                            </div>
                        ))}
                        {/* Locked Badges */}
                        {[1, 2].map(i => (
                            <div key={i} className="min-w-[120px] flex flex-col items-center p-5 rounded-[2rem] bg-black/20 border border-dashed border-white/10 opacity-40">
                                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                    <Shield size={24} className="text-gray-600" />
                                </div>
                                <p className="text-[11px] font-black text-gray-600 mb-0.5">잠겨있음</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Self-Verification Data Grid */}
                <div className="px-8 mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-black/40 p-5 rounded-[2rem] border border-white/5">
                        <div className="flex items-center text-gray-500 mb-2">
                            <Target size={16} className="mr-2 text-cyber-cyan" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Safety Reduction</span>
                        </div>
                        <p className="text-2xl font-black text-white italic tracking-tight">-78% <span className="text-[10px] font-normal not-italic text-gray-500">Risk</span></p>
                    </div>
                    <div className="bg-black/40 p-5 rounded-[2rem] border border-white/5">
                        <div className="flex items-center text-gray-500 mb-2">
                            <Zap size={16} className="mr-2 text-cyber-green" />
                            <span className="text-[9px] font-black uppercase tracking-widest">CO2 Reduced</span>
                        </div>
                        <p className="text-2xl font-black text-cyber-green italic tracking-tight">{dashboard.carbonReduction}</p>
                    </div>
                </div>

                {/* Impact Summary Section */}
                <div className="px-8 mt-8">
                    <h3 className="text-[10px] font-black text-gray-500 mb-6 uppercase tracking-widest flex items-center">
                        <Activity size={14} className="mr-2 text-cyber-cyan" /> {t("AI Safety Impact") || "AI 안전 영향력 분석"}
                    </h3>
                    
                    <div className="bg-gradient-to-r from-cyber-panel to-cyber-cyan/10 p-6 rounded-[2.5rem] border border-cyber-cyan/30 relative overflow-hidden group">
                        <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield size={160} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-sm font-bold text-gray-200 leading-relaxed mb-4">
                                <span className="text-cyber-cyan font-black">{stats.nickname}</span>님은 일반 라이더 대비 사고 발생 확률이 <strong className="text-white text-lg bg-cyber-cyan/20 px-1 rounded shadow-neon-cyan">3.5배 더 낮습니다.</strong>
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="bg-cyber-cyan/20 p-2 rounded-xl border border-cyber-cyan/30 text-cyber-cyan">
                                    <TrendingUp size={16} />
                                </div>
                                <p className="text-[10px] font-bold text-gray-400">지난달 대비 안전성 <span className="text-cyber-green">+12.5% 향상</span>됨을 감지했습니다.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Mini List */}
                <div className="px-8 mt-8">
                    <h3 className="text-[10px] font-black text-gray-500 mb-4 uppercase tracking-widest flex items-center">
                        <Clock size={14} className="mr-2" /> {t("Recent History")}
                    </h3>
                    <div className="space-y-3">
                        {(stats.recent_routes || []).slice(0, 2).map((route, i) => (
                            <div key={i} className="flex items-center p-4 bg-black/40 rounded-2xl border border-white/5">
                                <div className="bg-cyber-cyan/10 border border-cyber-cyan/20 p-2 rounded-xl text-cyber-cyan mr-4">
                                    <MapPin size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] font-black text-white tracking-tight">{route.from_loc} → {route.to_loc}</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">{route.distance_km}km • {new Date(route.created_at).toLocaleDateString()}</p>
                                </div>
                                <ChevronRight size={14} className="text-gray-700" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Close */}
                <div className="px-8 mt-8">
                    <button
                        onClick={onClose}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-400 py-5 rounded-[2rem] font-black text-xs shadow-glass active:scale-95 transition-all uppercase tracking-[0.3em] border border-white/5"
                    >
                        RETURN TO VIEWPORT
                    </button>
                </div>
            </div>

            {/* Share Card Modal Injected Here */}
            <ShareCard 
                isOpen={isShareOpen} 
                onClose={() => setIsShareOpen(false)}
                data={{
                    nickname: stats.nickname,
                    safetyScore: dashboard.safetyScore,
                    carbonReduction: dashboard.carbonReduction,
                    safetyRank: "78%", // Risk reduction
                    topPercentage: dashboard.topPercentage
                }}
            />
        </div>
    );
};

export default SafetyDashboard;
