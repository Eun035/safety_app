import React, { useMemo } from 'react';
import { X, Layers, MapPin, Clock, Calendar, BarChart3, ChevronRight, Zap, Target, History } from 'lucide-react';

const PersonalInsights = ({ isOpen, onClose, history = [] }) => {
    
    // Process Insights from history
    const insights = useMemo(() => {
        if (!history || history.length === 0) return {
            weeklyDist: 0,
            peakTime: 'N/A',
            topDestinations: [],
            totalRides: 0
        };

        // 1. Weekly Distance (Last 7 days)
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const weeklyRides = history.filter(r => (now - new Date(r.date).getTime()) < ONE_WEEK);
        const weeklyDist = weeklyRides.reduce((acc, r) => acc + parseFloat(r.distance || 0), 0);

        // 2. Top Destinations (Frequency of to_loc)
        const destMap = {};
        history.forEach(r => {
            const loc = r.to_loc || r.destination || 'Unknown';
            destMap[loc] = (destMap[loc] || 0) + 1;
        });
        const topDestinations = Object.entries(destMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        // 3. Peak Time (Assuming history has timestamp or just mock based on total rides)
        // For demo, we'll return a common slot
        const peakTime = "08:00 - 09:00 AM";

        return {
            weeklyDist: weeklyDist.toFixed(1),
            peakTime,
            topDestinations,
            totalRides: history.length
        };
    }, [history]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />
            
            <div className="relative bg-[#0d0a14] w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[3rem] sm:rounded-[2.5rem] overflow-y-auto animate-in slide-in-from-bottom-32 duration-500 shadow-2xl border-t border-purple-500/20 scrollbar-hide pb-20">
                
                {/* Purple Neon Header */}
                <div className="sticky top-0 z-20 bg-[#0d0a14]/80 backdrop-blur-xl px-8 pt-8 pb-4 border-b border-purple-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                            <Layers size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Personal Log</h2>
                            <p className="text-[9px] font-bold text-purple-400/60 tracking-[0.3em] uppercase">Mobility Insights</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-6 py-8 space-y-6">
                    
                    {/* Story Style Card 1: Weekly Progress */}
                    <div className="bg-gradient-to-br from-[#1a1525] to-[#0d0a14] p-8 rounded-[2.5rem] border border-purple-500/10 relative overflow-hidden group shadow-lg">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-[60px] group-hover:bg-purple-600/20 transition-all duration-700"></div>
                        
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Calendar size={12} /> This Week Recap
                            </h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-6xl font-black italic tracking-tighter text-white">{insights.weeklyDist}</span>
                                <span className="text-sm font-bold text-purple-400 uppercase">km</span>
                            </div>
                            <p className="text-xs font-bold text-gray-400">지난주 대비 <span className="text-purple-400">12%</span> 더 많이 이동했습니다.</p>
                            
                            <div className="mt-8 flex gap-1 h-32 items-end">
                                {[30, 45, 25, 60, 40, 80, 50].map((h, i) => (
                                    <div key={i} className="flex-1 bg-purple-900/20 rounded-t-lg relative group/bar overflow-hidden">
                                        <div 
                                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 to-purple-400 transition-all duration-1000"
                                            style={{ height: `${h}%` }}
                                        >
                                            <div className="w-full h-full bg-white/10 animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Story Style Card 2: Top Destinations */}
                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-inner">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Target size={12} /> Top Destinations
                        </h3>
                        
                        <div className="space-y-4">
                            {insights.topDestinations.length > 0 ? insights.topDestinations.map((dest, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 font-black text-xs">
                                            {i + 1}
                                        </div>
                                        <span className="font-bold text-gray-200">{dest.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">{dest.count} Rides</span>
                                        <ChevronRight size={14} className="text-gray-600 group-hover:text-purple-400" />
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-xs text-gray-500 py-4">주행 기록을 쌓아 분석을 확인하세요!</p>
                            )}
                        </div>
                    </div>

                    {/* Story Style Card 3: Time Patterns */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-900/10 p-6 rounded-[2rem] border border-purple-500/10 flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center mb-3">
                                <Clock size={20} className="text-purple-400" />
                            </div>
                            <p className="text-[9px] font-black text-purple-400/60 uppercase tracking-widest mb-1">Peak Time</p>
                            <p className="text-sm font-black text-white italic">{insights.peakTime}</p>
                        </div>
                        <div className="bg-purple-900/10 p-6 rounded-[2rem] border border-purple-500/10 flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center mb-3">
                                <Zap size={20} className="text-purple-400" />
                            </div>
                            <p className="text-[9px] font-black text-purple-400/60 uppercase tracking-widest mb-1">Total Effort</p>
                            <p className="text-sm font-black text-white italic">{insights.totalRides} Sessions</p>
                        </div>
                    </div>

                    {/* View All History Button */}
                    <button className="w-full h-14 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 flex items-center justify-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest transition-all active:scale-95">
                        <History size={16} /> View All History
                    </button>

                </div>
            </div>
        </div>
    );
};

export default PersonalInsights;
