import React, { useState, useMemo } from 'react';
import { Shield, Leaf, TrendingUp, Calendar, AlertTriangle, X, Share2, Award, Zap, Activity, Info } from 'lucide-react';

const ESGDashboard = ({ isOpen, onClose, metrics, history = [] }) => {
    const [isShareOpen, setIsShareOpen] = useState(false);

    // Dynamic data from props
    const data = useMemo(() => ({
        carbonSaved: metrics?.carbonSaved || 0,
        safetyScore: metrics?.safetyScore || 0,
        hazardReports: metrics?.hazardReports || 0,
        safetyStreak: metrics?.safetyStreak || 1,
        riskReduction: metrics?.safetyScore ? Math.min(99, metrics.safetyScore - 15) : 75
    }), [metrics]);

    // Calculate trees (1 tree per 2kg CO2 saved as per better engagement)
    const treesCount = (data.carbonSaved / 2).toFixed(1);
    const progressToNextTree = (data.carbonSaved % 2) * 50;

    // Generate Heatmap Data from real history if possible
    const heatmap = useMemo(() => {
        const weeks = 12;
        const days = 7;
        const totalCells = weeks * days;
        const historyDates = new Set(history.map(r => r.date));

        return Array.from({ length: totalCells }).map((_, i) => {
            // Mocking backfill for demo, but checking real history for recent days
            const isRecent = i > totalCells - 14; 
            const hasRide = isRecent ? historyDates.has(new Date(Date.now() - (totalCells - 1 - i) * 86400000).toLocaleDateString()) : Math.random() > 0.4;
            
            return {
                active: hasRide,
                safe: true, 
                level: hasRide ? Math.floor(Math.random() * 3) + 1 : 0
            };
        });
    }, [history]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Container */}
            <div className="relative bg-[#0a0c0f] w-full max-w-lg h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-t-[3rem] sm:rounded-[2.5rem] overflow-y-auto animate-in slide-in-from-bottom duration-500 shadow-[0_0_50px_rgba(0,0,0,1)] border-t border-white/10 scrollbar-hide pb-20">
                
                {/* Neon Header */}
                <div className="sticky top-0 z-20 bg-[#0a0c0f]/80 backdrop-blur-xl px-8 pt-8 pb-4 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-cyber-cyan shadow-neon-cyan animate-pulse"></div>
                            <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">SAFETY CORE</h2>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 tracking-[0.3em] uppercase">ESG Impact Dashboard</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all text-gray-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-8 pt-8 space-y-8">
                    
                    {/* 1. Environmental Impact Section */}
                    <section className="relative group">
                        <div className="flex justify-between items-end mb-6">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Leaf size={14} className="text-cyber-green" /> Environmental Impact
                            </h3>
                            <span className="text-[10px] font-bold text-cyber-green bg-cyber-green/10 px-2 py-0.5 rounded tracking-widest">ESG LEVEL 4</span>
                        </div>

                        <div className="bg-gradient-to-br from-[#12161b] to-black p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden">
                            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyber-green/5 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Carbon Reduced</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black italic text-white tracking-tighter">{data.carbonSaved}</span>
                                        <span className="text-xs font-bold text-cyber-green uppercase">kg</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold mt-2 leading-tight">지구 온난화 방지에<br/>직접 기여함</p>
                                </div>
                                <div className="space-y-1 border-l border-white/5 pl-4">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Trees Planted</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black italic text-cyber-green tracking-tighter">{treesCount}</span>
                                        <span className="text-xs font-bold text-gray-500 uppercase">그루</span>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-cyber-green shadow-neon-green" style={{ width: `${progressToNextTree}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. Safety Streak (GitHub Style Heatmap) */}
                    <section>
                        <div className="flex justify-between items-end mb-6">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={14} className="text-cyber-cyan" /> Safety Streak
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-cyber-cyan italic">{data.safetyStreak} Days Active</span>
                                <div className="p-1 px-2 bg-cyber-cyan/20 border border-cyber-cyan/30 rounded text-[9px] font-black text-cyber-cyan uppercase">Stable</div>
                            </div>
                        </div>

                        <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                            {/* Heatmap Grid */}
                            <div className="flex gap-1.5 overflow-x-auto pb-4 scrollbar-hide">
                                {Array.from({ length: 12 }).map((_, w) => (
                                    <div key={w} className="flex flex-col gap-1.5 shrink-0">
                                        {Array.from({ length: 7 }).map((_, d) => {
                                            const cell = heatmap[w * 7 + d];
                                            return (
                                                <div 
                                                    key={d} 
                                                    className={`w-3.5 h-3.5 rounded-sm transition-all duration-500 ${
                                                        !cell.active ? 'bg-white/5' : 
                                                        !cell.safe ? 'bg-amber-500/50' :
                                                        cell.level === 3 ? 'bg-cyber-cyan shadow-[0_0_8px_rgba(64,255,220,0.4)]' :
                                                        cell.level === 2 ? 'bg-cyber-cyan/60' :
                                                        'bg-cyber-cyan/30'
                                                    }`}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-3 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                <span>Recent 3 Months</span>
                                <div className="flex items-center gap-1">
                                    <span>Danger</span>
                                    <div className="w-2 h-2 bg-amber-500/50 rounded-sm"></div>
                                    <div className="w-2 h-2 bg-cyber-cyan/30 rounded-sm ml-1"></div>
                                    <div className="w-2 h-2 bg-cyber-cyan rounded-sm"></div>
                                    <span>Safe</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. Safety Impact Gauge */}
                    <section>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                            <Shield size={14} className="text-cyber-cyan" /> Collision Risk Reduction
                        </h3>

                        <div className="bg-gradient-to-r from-cyber-panel to-black p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between relative overflow-hidden group">
                           <div className="flex-1">
                               <p className="text-2xl font-black text-white italic tracking-tighter mb-1">
                                   일반 유저 대비 <br/> <span className="text-cyber-cyan text-4xl">{data.riskReduction}%</span> <span className="not-italic">안전함</span>
                               </p>
                               <p className="text-[10px] text-gray-400 font-bold leading-relaxed max-w-[150px]">
                                   C-Safe 가이드 준수율이 높아 사고 확률이 크게 낮습니다.
                               </p>
                           </div>
                           
                           {/* Gauge Visualization */}
                           <div className="relative w-28 h-28 flex items-center justify-center">
                               <svg className="w-full h-full transform -rotate-90">
                                   <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                   <circle 
                                        cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="8" 
                                        strokeDasharray={301} 
                                        strokeDashoffset={301 - (301 * data.riskReduction / 100)}
                                        className="text-cyber-cyan transition-all duration-1000 ease-out" 
                                    />
                               </svg>
                               <Shield size={32} className="absolute text-cyber-cyan drop-shadow-neon-cyan" />
                           </div>
                        </div>
                    </section>

                    {/* 4. Social Contribution Section */}
                    <section>
                        <div className="flex justify-between items-end mb-6">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={14} className="text-cyber-green" /> City Safety Net
                            </h3>
                        </div>

                        <div className="bg-[#12161b] p-6 rounded-[2.5rem] border border-cyber-green/20 relative overflow-hidden">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-cyber-green/10 rounded-2xl flex items-center justify-center border border-cyber-green/30 shrink-0">
                                    <AlertTriangle size={24} className="text-cyber-green shadow-neon-green" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-black text-white mb-1">천안시 안전망 기여</p>
                                    <p className="text-xs font-bold text-gray-400">당신의 주행 데이터가 <span className="text-cyber-green">{data.hazardReports}개</span>의 새로운 위험 포트홀을 발견했습니다!</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Citizen Sentinel System</span>
                                <div className="flex items-center gap-1 text-cyber-green animate-pulse">
                                    <TrendingUp size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">AI Sync: Realtime</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Action Footer */}
                    <div className="pt-4 flex gap-3">
                        <button 
                            className="flex-1 bg-cyber-cyan text-black py-5 rounded-[2rem] font-black text-xs shadow-neon-cyan active:scale-95 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                            onClick={() => setIsShareOpen(true)}
                        >
                            <Share2 size={16} /> Share ESG Impact
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ESGDashboard;
