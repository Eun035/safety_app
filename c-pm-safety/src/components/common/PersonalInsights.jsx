import React, { useMemo } from 'react';
import { X, Layers, MapPin, Clock, Calendar, BarChart3, ChevronRight, Zap, Target, History } from 'lucide-react';

const PersonalInsights = ({ isOpen, onClose, history = [], onOpenShadowImpact }) => {

    // 공통 유틸: ride의 timestamp 추출 (Supabase start_time / localStorage date 둘 다 지원)
    const getRideTs = (r) => {
        const t = new Date(r.start_time || r.date || 0).getTime();
        return Number.isFinite(t) && t > 0 ? t : null;
    };

    // Process Insights from history
    const insights = useMemo(() => {
        const empty = {
            weeklyDist: '0.0',
            lastWeekDist: 0,
            weekVarPct: null,           // null = 비교 불가 (지난주 데이터 0)
            dailyDistances: Array(7).fill(0),
            peakTime: 'N/A',
            topDestinations: [],
            totalRides: 0,
            avgRsr: null                // null = RSR 표본 없음
        };
        if (!history || history.length === 0) return empty;

        const DAY = 86400000;
        const ONE_WEEK = 7 * DAY;
        const now = Date.now();

        // 1. 이번 주 / 지난 주 거리 + 변화율
        let weeklyDist = 0, lastWeekDist = 0;
        history.forEach(r => {
            const ts = getRideTs(r);
            if (!ts) return;
            const age = now - ts;
            const dist = parseFloat(r.distance || 0);
            if (age < ONE_WEEK) weeklyDist += dist;
            else if (age < 2 * ONE_WEEK) lastWeekDist += dist;
        });
        const weekVarPct = lastWeekDist > 0
            ? Math.round(((weeklyDist - lastWeekDist) / lastWeekDist) * 100)
            : null;

        // 2. 최근 7일 일별 거리 막대그래프 (인덱스 0=6일전 ... 6=오늘)
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const dailyDistances = Array(7).fill(0);
        history.forEach(r => {
            const ts = getRideTs(r);
            if (!ts) return;
            const dayDiff = Math.floor((todayMidnight.getTime() - new Date(new Date(ts).setHours(0, 0, 0, 0)).getTime()) / DAY);
            if (dayDiff >= 0 && dayDiff <= 6) {
                dailyDistances[6 - dayDiff] += parseFloat(r.distance || 0);
            }
        });

        // 3. Top Destinations — to_loc 필드가 아직 적재되지 않으므로 항상 빈 결과
        // (별도 작업으로 rides 컬럼 추가 + endRideSession 보강이 필요해 본 변경에서 보류)
        const destMap = {};
        history.forEach(r => {
            const loc = r.to_loc || r.destination;
            if (loc) destMap[loc] = (destMap[loc] || 0) + 1;
        });
        const topDestinations = Object.entries(destMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        // 4. Peak Time — start_time GROUP BY 최빈 시간대 (P1-3)
        const hourCounts = Array(24).fill(0);
        history.forEach(r => {
            const ts = getRideTs(r);
            if (!ts) return;
            hourCounts[new Date(ts).getHours()] += 1;
        });
        let peakHour = -1, peakCount = 0;
        hourCounts.forEach((c, h) => { if (c > peakCount) { peakCount = c; peakHour = h; } });
        const fmt = (h) => `${String(h).padStart(2, '0')}:00`;
        const peakTime = peakHour >= 0
            ? `${fmt(peakHour)} - ${fmt((peakHour + 1) % 24)}`
            : 'N/A';

        // 5. 평균 RSR — Supabase ride_rsr 또는 localStorage rideRsr
        const rsrSamples = history
            .map(r => Number(r.ride_rsr ?? r.rideRsr))
            .filter(v => Number.isFinite(v));
        const avgRsr = rsrSamples.length > 0
            ? Math.round(rsrSamples.reduce((a, b) => a + b, 0) / rsrSamples.length)
            : null;

        return {
            weeklyDist: weeklyDist.toFixed(1),
            lastWeekDist,
            weekVarPct,
            dailyDistances,
            peakTime,
            topDestinations,
            totalRides: history.length,
            avgRsr
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
                            <h3 className="text-[11px] font-black text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Calendar size={12} /> This Week Recap
                            </h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-6xl font-black italic tracking-tighter text-white">{insights.weeklyDist}</span>
                                <span className="text-sm font-bold text-purple-400 uppercase">km</span>
                            </div>
                            {/* 실데이터 주간 변화율 (기존 "12%" 하드코딩 mock 제거) */}
                            {insights.weekVarPct === null ? (
                                <p className="text-sm font-bold text-gray-500">비교할 지난주 데이터가 없습니다.</p>
                            ) : insights.weekVarPct === 0 ? (
                                <p className="text-sm font-bold text-gray-400">지난주와 비슷한 활동량입니다.</p>
                            ) : insights.weekVarPct > 0 ? (
                                <p className="text-sm font-bold text-gray-400">지난주 대비 <span className="text-purple-400">▲ {insights.weekVarPct}%</span> 더 많이 이동했습니다.</p>
                            ) : (
                                <p className="text-sm font-bold text-gray-400">지난주 대비 <span className="text-amber-400">▼ {Math.abs(insights.weekVarPct)}%</span> 적게 이동했습니다.</p>
                            )}

                            {/* 실데이터 7일 일별 거리 막대그래프 (기존 [30,45,25,60,40,80,50] 하드코딩 mock 제거) */}
                            {(() => {
                                const maxDist = Math.max(...insights.dailyDistances, 0.1);
                                const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
                                const todayDow = new Date().getDay();
                                return (
                                    <div className="mt-8">
                                        <div className="flex gap-1 h-32 items-end">
                                            {insights.dailyDistances.map((dist, i) => {
                                                const hPct = (dist / maxDist) * 100;
                                                return (
                                                    <div key={i} className="flex-1 bg-purple-900/20 rounded-t-lg relative group/bar overflow-hidden" title={`${dist.toFixed(1)}km`}>
                                                        <div
                                                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 to-purple-400 transition-all duration-1000"
                                                            style={{ height: `${hPct}%` }}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            {insights.dailyDistances.map((_, i) => {
                                                // i=0(6일전) → i=6(오늘). 라벨은 해당 일자의 요일.
                                                const dow = (todayDow - (6 - i) + 7) % 7;
                                                return (
                                                    <div key={i} className={`flex-1 text-center text-[10px] font-bold ${i === 6 ? 'text-purple-400' : 'text-gray-600'}`}>
                                                        {dayLabels[dow]}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Story Style Card 2: Top Destinations */}
                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-inner">
                        <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
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
                                <div className="text-center py-4">
                                    <p className="text-xs text-gray-500">목적지 텍스트 저장 기능 준비 중</p>
                                    <p className="text-[10px] text-gray-600 mt-1">(Coming soon — rides 컬럼 보강 후 가동)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Story Style Card 3: Time Patterns */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-900/10 p-6 rounded-[2rem] border border-purple-500/10 flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center mb-3">
                                <Clock size={20} className="text-purple-400" />
                            </div>
                            <p className="text-[10px] font-black text-purple-400/60 uppercase tracking-widest mb-1">Peak Time</p>
                            <p className="text-sm font-black text-white italic">{insights.peakTime}</p>
                        </div>
                        {/* Total Effort → AVG SAFETY (평균 RSR%)로 교체. 안전 운전 습관 한눈에. */}
                        <div className="bg-purple-900/10 p-6 rounded-[2rem] border border-purple-500/10 flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center mb-3">
                                <Zap size={20} className="text-purple-400" />
                            </div>
                            <p className="text-[10px] font-black text-purple-400/60 uppercase tracking-widest mb-1">Avg Safety</p>
                            <p className="text-sm font-black text-white italic">
                                {insights.avgRsr !== null ? `${insights.avgRsr}%` : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* View All History → ShadowImpact 시트로 연결 (실데이터 추세/히트맵/경로 시각화) */}
                    <button
                        onClick={() => {
                            if (typeof onOpenShadowImpact === 'function') {
                                onClose?.();
                                onOpenShadowImpact();
                            }
                        }}
                        disabled={typeof onOpenShadowImpact !== 'function'}
                        className="w-full h-14 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl border border-white/10 flex items-center justify-center gap-2 text-sm font-black text-gray-400 uppercase tracking-widest transition-all active:scale-95"
                    >
                        <History size={16} /> View Full Impact
                    </button>

                </div>
            </div>
        </div>
    );
};

export default PersonalInsights;
