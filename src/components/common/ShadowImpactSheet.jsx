import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Map as MapIcon, Zap, Shield, Cloud, TrendingUp, ChevronRight, AlertTriangle, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * ShadowImpactSheet
 * ─────────────────────────────────────────────────────────────────────────
 * 4순위 업그레이드: 실제 주행 기록 + 아차사고 데이터 시각화
 *
 * Props:
 *   isOpen            — 시트 열림 여부
 *   onClose           — 닫기 콜백
 *   userName          — 사용자 닉네임
 *   rideHistory       — useRideSession의 rideHistory 배열
 *   getLocalNearMisses — useNearMissEngine의 로컬 아차사고 반환 함수
 */

/** ride_paths GPS 좌표 → SVG 경로 변환 (정규화) */
function buildSvgPath(path, width = 400, height = 200, padding = 20) {
    if (!path || path.length < 2) return null;
    const lats = path.map(p => p.lat);
    const lngs = path.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    const points = path.map(p => {
        const x = padding + ((p.lng - minLng) / lngRange) * (width - 2 * padding);
        // SVG y축 반전 (위도 높을수록 위쪽)
        const y = height - padding - ((p.lat - minLat) / latRange) * (height - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${points.join(' L ')}`;
}

/** 아차사고 이벤트 좌표 → SVG 위치 (buildSvgPath와 동일 정규화) */
function nearMissToSvgPos(event, path, width = 400, height = 200, padding = 20) {
    if (!path || path.length < 2) return null;
    const lats = path.map(p => p.lat);
    const lngs = path.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    if (!event.lat || !event.lng) return null;
    const x = padding + ((event.lng - minLng) / lngRange) * (width - 2 * padding);
    const y = height - padding - ((event.lat - minLat) / latRange) * (height - 2 * padding);
    return { x: x.toFixed(1), y: y.toFixed(1) };
}

const ShadowImpactSheet = ({ isOpen, onClose, userName = 'J', rideHistory = [], getLocalNearMisses, metrics }) => {
    const { t } = useTranslation();

    // 로컬 아차사고 데이터 — 전체(히트맵용) + 최근 10건(리스트용)
    const allNearMisses = useMemo(() => {
        if (typeof getLocalNearMisses === 'function') {
            return getLocalNearMisses();
        }
        return [];
    }, [getLocalNearMisses, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
    const nearMisses = useMemo(() => allNearMisses.slice(0, 10), [allNearMisses]);

    // 최근 주행 (최대 5건)
    const recentRides = useMemo(() =>
        Array.isArray(rideHistory) ? rideHistory.slice(0, 5) : [],
        [rideHistory]
    );

    // 가장 최근 주행의 경로 (ride_paths 또는 path)
    const latestRidePath = useMemo(() => {
        const ride = recentRides[0];
        if (!ride) return null;
        return ride.ride_paths || ride.path || null;
    }, [recentRides]);

    // 통계 계산
    const stats = useMemo(() => {
        const totalDist = recentRides.reduce((s, r) => s + (parseFloat(r.distance) || 0), 0);
        const totalTime = recentRides.reduce((s, r) => s + (parseInt(r.time) || 0), 0);
        const avgSpeed = recentRides.length > 0
            ? (recentRides.reduce((s, r) => s + (parseFloat(r.top_speed || r.topSpeed) || 0), 0) / recentRides.length)
            : 0;
        const co2 = totalDist * 0.2;
        return {
            rideCount: recentRides.length,
            totalDist: totalDist.toFixed(1),
            totalTime,
            avgSpeed: avgSpeed.toFixed(1),
            co2Saved: co2.toFixed(1),
            nearMissCount: nearMisses.length,
        };
    }, [recentRides, nearMisses]);

    // P2 (2026-05-29): 환경/안전 임팩트 — ESG 흡수 후 핵심 4개 지표만 노출
    const environment = useMemo(() => {
        const carbonSaved = Number(metrics?.carbonSaved) || 0;
        const safetyScore = Number(metrics?.safetyScore) || 0;
        const safetyStreak = Number(metrics?.safetyStreak) || 0;
        const trees = Math.round((carbonSaved / 2) * 10) / 10;   // 2kg CO₂ ≈ 1그루 (engagement)
        return {
            carbonSaved: carbonSaved.toFixed(1),
            trees: trees.toFixed(1),
            safetyScore: Math.round(safetyScore),
            safetyStreak
        };
    }, [metrics]);

    // P1-2: 최근 14일 RSR 추이 (일별 평균) — Supabase ride_rsr 또는 localStorage rideRsr
    const rsrTrend = useMemo(() => {
        const days = 14;
        const now = Date.now();
        const DAY = 86400000;
        const buckets = {};
        (Array.isArray(rideHistory) ? rideHistory : []).forEach(r => {
            const ts = new Date(r.start_time || r.date || 0).getTime();
            if (!ts || now - ts > days * DAY) return;
            const dateKey = new Date(ts).toISOString().slice(0, 10);
            const rsrRaw = r.ride_rsr ?? r.rideRsr;
            const rsr = Number(rsrRaw);
            if (Number.isFinite(rsr)) {
                if (!buckets[dateKey]) buckets[dateKey] = [];
                buckets[dateKey].push(rsr);
            }
        });
        const series = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now - i * DAY);
            const key = d.toISOString().slice(0, 10);
            const vals = buckets[key] || [];
            series.push({
                day: key.slice(5),
                avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
                count: vals.length
            });
        }
        return series;
    }, [rideHistory]);

    const rsrSummary = useMemo(() => {
        const valid = rsrTrend.filter(p => p.avg !== null);
        if (valid.length === 0) return { current: null, delta: null };
        const current = valid[valid.length - 1].avg;
        const prev = valid.length > 1 ? valid[valid.length - 2].avg : null;
        return { current, delta: prev !== null ? current - prev : null, samples: valid.length };
    }, [rsrTrend]);

    // P1-2: 시간대 아차사고 히트맵 (요일 × 시간) — occurred_at 기반
    const heatmap = useMemo(() => {
        const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
        allNearMisses.forEach(nm => {
            const ts = nm?.occurred_at;
            if (!ts) return;
            const d = new Date(ts);
            if (Number.isNaN(d.getTime())) return;
            const dayIdx = d.getDay();      // 0=일
            const hourIdx = d.getHours();
            matrix[dayIdx][hourIdx] += 1;
        });
        let max = 0;
        matrix.forEach(row => row.forEach(v => { if (v > max) max = v; }));
        return { matrix, max, total: allNearMisses.length };
    }, [allNearMisses]);

    // SVG 경로 (최근 주행)
    const svgPath = useMemo(() => buildSvgPath(latestRidePath), [latestRidePath]);

    // 아차사고 SVG 위치들
    const nearMissSvgPositions = useMemo(() => {
        if (!latestRidePath) return [];
        return nearMisses
            .map(nm => nearMissToSvgPos(nm, latestRidePath))
            .filter(Boolean);
    }, [nearMisses, latestRidePath]);

    const hasRealData = recentRides.length > 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div key="modal-root" className="fixed inset-0 z-[2500] pointer-events-none flex flex-col justify-end items-center px-0 sm:px-4">
                    <motion.div key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                    />
                    <motion.div
                        key="sheet"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="pointer-events-auto relative w-full max-w-md bg-[#0a0c0f] rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] border-t border-cyber-cyan/30 overflow-hidden flex flex-col max-h-[92vh]"
                    >
                            {/* Drag Handle */}
                            <div
                                onClick={onClose}
                                className="w-full pt-4 pb-2 flex justify-center cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                            >
                                <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-60 pointer-events-none" />
                            </div>

                            {/* Header */}
                            <div className="sticky top-0 z-20 bg-[#0a0c0f]/80 backdrop-blur-xl px-8 pb-4 pt-2 flex flex-col">
                                <h2 className="text-[22px] font-black italic tracking-tighter text-white uppercase leading-none">
                                    SHADOW IMPACT
                                </h2>
                                <p className="text-[10px] font-bold text-cyber-cyan tracking-wider uppercase mt-1.5">
                                    {t("shadow_impact_title")}
                                </p>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-8 scrollbar-hide">

                            {/* ── Card 1: 실 데이터 요약 통계 ── */}
                            <section className="bg-gradient-to-br from-[#12161b] to-black p-4 rounded-[2rem] border border-white/5 shadow-xl">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Activity size={10} className="text-cyber-cyan" /> 최근 주행 통계
                                    {hasRealData && (
                                        <span className="ml-auto text-[8px] font-bold text-cyber-cyan bg-cyber-cyan/10 px-1.5 py-0.5 rounded-full">
                                            LIVE DATA
                                        </span>
                                    )}
                                </p>

                                {hasRealData ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: '주행 횟수', value: `${stats.rideCount}회`, color: '#40ffdc' },
                                            { label: '총 거리', value: `${stats.totalDist}km`, color: '#a855f7' },
                                            { label: 'CO₂ 절감', value: `${stats.co2Saved}kg`, color: '#22c55e' },
                                            { label: '총 시간', value: `${stats.totalTime}분`, color: '#3b82f6' },
                                            { label: '평균 최고속', value: `${stats.avgSpeed}km/h`, color: '#f59e0b' },
                                            { label: '아차사고', value: `${stats.nearMissCount}건`, color: stats.nearMissCount > 0 ? '#ef4444' : '#6b7280' },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                                                <p className="text-[9px] text-gray-500 font-bold mb-0.5">{label}</p>
                                                <p className="text-sm font-black" style={{ color }}>{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-2xl mb-2">🛴</p>
                                        <p className="text-xs font-bold text-gray-500">첫 주행을 완료하면</p>
                                        <p className="text-xs text-gray-600">여기에 실제 데이터가 표시됩니다</p>
                                    </div>
                                )}
                            </section>

                            {/* ── Card NEW-C (2026-05-29): 환경/안전 임팩트 (ESG 흡수) ── */}
                            <section className="bg-gradient-to-br from-cyber-green/10 to-black p-4 rounded-[2rem] border border-cyber-green/20 shadow-xl">
                                <p className="text-[9px] font-black text-cyber-green/70 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    🌿 환경 · 안전 임팩트
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'CO₂ 절감', value: `${environment.carbonSaved}kg`, color: '#22c55e' },
                                        { label: '🌳 나무 식재 환산', value: `${environment.trees}그루`, color: '#22c55e' },
                                        { label: '안전 점수', value: `${environment.safetyScore}%`, color: '#40ffdc' },
                                        { label: '🔥 안전 스트릭', value: `${environment.safetyStreak}일`, color: '#f59e0b' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                                            <p className="text-[9px] text-gray-500 font-bold mb-0.5">{label}</p>
                                            <p className="text-sm font-black" style={{ color }}>{value}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] text-gray-600 mt-2 text-center leading-tight">
                                    누적 주행 거리 · 안전 행동 데이터 기반. 2kg CO₂ ≈ 1그루
                                </p>
                            </section>

                            {/* ── Card NEW-A (P1-2): RSR 14일 추이 ── */}
                            <section className="bg-gradient-to-br from-[#12161b] to-black p-4 rounded-[2rem] border border-white/5 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <Shield size={10} className="text-cyber-cyan" /> 위험구역 통제율(RSR) · 14일
                                    </p>
                                    {rsrSummary.current !== null && (
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-black text-cyber-cyan leading-none">{rsrSummary.current}%</span>
                                            {rsrSummary.delta !== null && (
                                                <span className={`text-[10px] font-bold ${rsrSummary.delta >= 0 ? 'text-cyber-green' : 'text-red-400'}`}>
                                                    {rsrSummary.delta >= 0 ? '▲' : '▼'}{Math.abs(rsrSummary.delta)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {rsrSummary.current === null ? (
                                    <div className="text-center py-4">
                                        <p className="text-[10px] text-gray-500">위험구역을 지나면 여기에 추이가 표시됩니다</p>
                                    </div>
                                ) : (
                                    (() => {
                                        const W = 320, H = 80, PAD = 10;
                                        const n = rsrTrend.length;
                                        const xs = rsrTrend.map((_, i) => PAD + (i / Math.max(1, n - 1)) * (W - 2 * PAD));
                                        const ys = rsrTrend.map(p => p.avg !== null ? H - PAD - (p.avg / 100) * (H - 2 * PAD) : null);
                                        let d = '';
                                        for (let i = 0; i < n; i++) {
                                            if (ys[i] === null) continue;
                                            const cmd = (d === '' || ys[i - 1] === null) ? 'M' : 'L';
                                            d += `${cmd} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)} `;
                                        }
                                        return (
                                            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
                                                <line x1={PAD} y1={H - PAD - 0.5 * (H - 2 * PAD)} x2={W - PAD} y2={H - PAD - 0.5 * (H - 2 * PAD)} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                                                {d && <path d={d} fill="none" stroke="#40ffdc" strokeWidth="2" strokeLinecap="round" />}
                                                {rsrTrend.map((p, i) => p.avg !== null && (
                                                    <circle key={i} cx={xs[i]} cy={ys[i]} r="2.5" fill="#40ffdc" />
                                                ))}
                                            </svg>
                                        );
                                    })()
                                )}
                                <div className="flex justify-between mt-1 text-[8px] text-gray-600 px-2">
                                    <span>{rsrTrend[0]?.day}</span>
                                    <span>오늘</span>
                                </div>
                            </section>

                            {/* ── Card 2: 경로 맵 (실 데이터 or 목업) ── */}
                            <section className="relative group">
                                <div className="flex justify-between items-end mb-2">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <MapIcon size={14} className="text-cyber-cyan" />
                                        {hasRealData && svgPath ? '실제 경로' : t("shadow_map_title")}
                                    </h3>
                                    <span className="text-[10px] font-bold text-cyber-cyan bg-cyber-cyan/10 px-2 py-0.5 rounded tracking-widest">
                                        {hasRealData && svgPath ? 'GPS TRACK' : 'LIVE AI SYNC'}
                                    </span>
                                </div>

                                <div className="bg-gradient-to-br from-[#12161b] to-black p-4 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden">
                                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyber-cyan/5 rounded-full blur-3xl pointer-events-none" />

                                    <div className="h-32 rounded-2xl bg-[#080a0f] border border-white/5 relative overflow-hidden mb-4 shadow-inner">
                                        {/* Grid */}
                                        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10">
                                            {[...Array(36)].map((_, i) => (
                                                <div key={i} className="border-[0.5px] border-white/50" />
                                            ))}
                                        </div>

                                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                                            {svgPath ? (
                                                /* 실제 GPS 경로 */
                                                <>
                                                    <motion.path
                                                        d={svgPath}
                                                        fill="none"
                                                        stroke="#40ffdc"
                                                        strokeWidth="4"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        initial={{ pathLength: 0 }}
                                                        animate={{ pathLength: 1 }}
                                                        transition={{ duration: 2.5, ease: 'easeOut' }}
                                                        className="drop-shadow-[0_0_8px_rgba(64,255,220,0.8)]"
                                                    />
                                                    {/* 아차사고 위치 빨간 점 */}
                                                    {nearMissSvgPositions.map((pos, i) => (
                                                        <motion.circle
                                                            key={i}
                                                            cx={pos.x}
                                                            cy={pos.y}
                                                            r="6"
                                                            fill="rgba(239,68,68,0.8)"
                                                            stroke="#ef4444"
                                                            strokeWidth="1.5"
                                                            initial={{ scale: 0, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={{ delay: 2 + i * 0.1 }}
                                                            className="drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]"
                                                        />
                                                    ))}
                                                </>
                                            ) : (
                                                /* 목업 경로 (데이터 없을 때) */
                                                <motion.path
                                                    d="M 50 150 L 120 120 L 180 160 L 260 100 L 320 130"
                                                    fill="none"
                                                    stroke="#40ffdc"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                                    className="drop-shadow-[0_0_8px_rgba(64,255,220,0.8)]"
                                                />
                                            )}
                                            {/* 시작/종료 점 */}
                                            <circle cx="50" cy="150" r="4" fill="#40ffdc" />
                                            <circle cx="320" cy="130" r="4" fill="#40ffdc" />
                                        </svg>

                                        {/* 아차사고 범례 */}
                                        {nearMissSvgPositions.length > 0 && (
                                            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full">
                                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                                <span className="text-[8px] font-bold text-red-400">아차사고</span>
                                            </div>
                                        )}

                                        {/* Fog effect */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/40 via-transparent to-purple-900/30 blur-2xl pointer-events-none" />
                                    </div>

                                    {/* 기여 인사이트 */}
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-start gap-3 backdrop-blur-md">
                                        <div className="w-10 h-10 bg-cyber-cyan/10 rounded-xl flex items-center justify-center border border-cyber-cyan/30 shrink-0">
                                            <TrendingUp size={18} className="text-cyber-cyan shadow-neon-cyan" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-white mb-1">{userName}님의 데이터 기여</p>
                                            <p className="text-[10px] font-bold text-gray-400">
                                                신부동 위험 알고리즘{' '}
                                                <span className="text-cyber-cyan">
                                                    {stats.rideCount > 0 ? `${(stats.rideCount * 0.02).toFixed(2)}% 기여!` : '0.02% 기여!'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* ── Card NEW-B (P1-2): 시간대 아차사고 히트맵 (요일 × 시간) ── */}
                            <section className="bg-gradient-to-br from-[#12161b] to-black p-4 rounded-[2rem] border border-white/5 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <AlertTriangle size={10} className="text-red-400" /> 시간대 위험 패턴
                                    </p>
                                    <span className="text-[8px] font-bold text-gray-500">총 {heatmap.total}건</span>
                                </div>
                                {heatmap.total === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-[10px] text-gray-500">아차사고가 누적되면 요일·시간대 패턴이 표시됩니다</p>
                                    </div>
                                ) : (
                                    (() => {
                                        const CELL = 11, GAP = 1.5;
                                        const LABEL_W = 18;
                                        const W = LABEL_W + 24 * (CELL + GAP);
                                        const H = 7 * (CELL + GAP) + 12;
                                        const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
                                        return (
                                            <>
                                                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
                                                    {heatmap.matrix.map((row, ri) => (
                                                        <g key={ri}>
                                                            <text x="0" y={ri * (CELL + GAP) + CELL - 1} fontSize="7" fill="#6b7280" fontWeight="700">
                                                                {dayLabels[ri]}
                                                            </text>
                                                            {row.map((v, ci) => {
                                                                const intensity = heatmap.max > 0 ? v / heatmap.max : 0;
                                                                const fill = v === 0
                                                                    ? 'rgba(255,255,255,0.04)'
                                                                    : `rgba(239,68,68,${0.2 + intensity * 0.7})`;
                                                                return (
                                                                    <rect
                                                                        key={ci}
                                                                        x={LABEL_W + ci * (CELL + GAP)}
                                                                        y={ri * (CELL + GAP)}
                                                                        width={CELL}
                                                                        height={CELL}
                                                                        rx="1.5"
                                                                        fill={fill}
                                                                    >
                                                                        <title>{`${dayLabels[ri]} ${ci}시: ${v}건`}</title>
                                                                    </rect>
                                                                );
                                                            })}
                                                        </g>
                                                    ))}
                                                    {/* 하단 시간 축 (0/6/12/18/23 만 표시) */}
                                                    {[0, 6, 12, 18, 23].map(h => (
                                                        <text
                                                            key={h}
                                                            x={LABEL_W + h * (CELL + GAP)}
                                                            y={7 * (CELL + GAP) + 8}
                                                            fontSize="6"
                                                            fill="#6b7280"
                                                            fontWeight="700"
                                                        >
                                                            {h}시
                                                        </text>
                                                    ))}
                                                </svg>
                                                {/* 범례 */}
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <span className="text-[7px] text-gray-600">적음</span>
                                                    {[0.2, 0.4, 0.6, 0.8, 1.0].map(a => (
                                                        <div key={a} className="w-2 h-2 rounded-sm" style={{ backgroundColor: `rgba(239,68,68,${a})` }} />
                                                    ))}
                                                    <span className="text-[7px] text-gray-600">많음</span>
                                                </div>
                                            </>
                                        );
                                    })()
                                )}
                            </section>

                            {/* ── Card 3: 아차사고 이벤트 리스트 ── */}
                            {nearMisses.length > 0 && (
                                <section className="relative group">
                                    <div className="flex justify-between items-end mb-2">
                                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <AlertTriangle size={14} className="text-red-400" /> 아차사고 이력
                                        </h3>
                                        <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded tracking-widest">
                                            {nearMisses.length}건
                                        </span>
                                    </div>

                                    <div className="bg-gradient-to-br from-[#12161b] to-black p-4 rounded-[2rem] border border-red-500/10 shadow-xl space-y-2">
                                        {nearMisses.map((nm, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                                                <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                                                    <AlertTriangle size={12} className="text-red-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-white truncate">
                                                        {nm.nearby_hazard_type || '급제동'} · {nm.speed_kmh || 0}km/h
                                                    </p>
                                                    <p className="text-[8px] text-gray-600">
                                                        {nm.occurred_at ? new Date(nm.occurred_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                        {nm.weather_risk && ' · 🌧우천'}
                                                        {nm.in_stress_zone && ' · 👥스트레스존'}
                                                    </p>
                                                </div>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${nm.helmet_on ? 'text-green-400 bg-green-400/10' : 'text-gray-600 bg-white/5'}`}>
                                                    {nm.helmet_on ? '🪖헬멧' : '미착용'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Card 4: 최근 주행 히스토리 ── */}
                            {recentRides.length > 0 && (
                                <section className="relative group">
                                    <div className="flex justify-between items-end mb-2">
                                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <Zap size={14} className="text-purple-400" /> 최근 주행 기록
                                        </h3>
                                        <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded tracking-widest italic">
                                            {recentRides.length}회
                                        </span>
                                    </div>

                                    <div className="bg-gradient-to-br from-[#12161b] to-black p-4 rounded-[2rem] border border-white/5 shadow-xl space-y-2">
                                        {recentRides.map((ride, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5">
                                                <div className="w-7 h-7 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0 border border-purple-500/30">
                                                    <span className="text-[10px] font-black text-purple-400">#{i + 1}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-white">
                                                        {parseFloat(ride.distance || 0).toFixed(1)}km · {ride.time || 0}분
                                                    </p>
                                                    <p className="text-[8px] text-gray-600">
                                                        최고 {ride.top_speed || ride.topSpeed || 0}km/h
                                                        · CO₂ {((parseFloat(ride.distance || 0)) * 0.2).toFixed(1)}kg 절감
                                                    </p>
                                                </div>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                                    (ride.sudden_brake_count || ride.suddenBrakeCount || 0) === 0
                                                        ? 'text-green-400 bg-green-400/10'
                                                        : 'text-orange-400 bg-orange-400/10'
                                                }`}>
                                                    {(ride.sudden_brake_count || ride.suddenBrakeCount || 0) === 0 ? '✓ 클린' : `⚡${ride.sudden_brake_count || ride.suddenBrakeCount}회`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* 데이터 없을 때 - 3D Replay 기존 목업 유지 */}
                            {!hasRealData && (
                                <section className="relative group">
                                    <div className="flex justify-between items-end mb-2">
                                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <Zap size={14} className="text-purple-400" /> {t("vibe_replay_title")}
                                        </h3>
                                        <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded tracking-widest italic">3D VISION</span>
                                    </div>

                                    <div className="bg-gradient-to-br from-[#12161b] to-black p-4 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden">
                                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

                                        <div className="bg-black/40 rounded-3xl h-36 relative border border-white/5 overflow-hidden flex flex-col items-center justify-center mb-4">
                                            <svg className="absolute inset-0 w-full h-full opacity-30">
                                                <path d="M -20 180 Q 100 150 200 100 T 420 20" fill="none" stroke="white" strokeWidth="1" strokeDasharray="5,5" />
                                            </svg>
                                            <motion.div
                                                animate={{ y: [0, -5, 0], scale: [1, 1.05, 1] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                                className="relative z-20"
                                            >
                                                <div className="w-16 h-16 bg-white/5 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                                    <Shield size={32} className="text-white drop-shadow-lg" />
                                                </div>
                                                <motion.div
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 50 }}
                                                    transition={{ delay: 1 }}
                                                    className="absolute top-0 right-[-60px] whitespace-nowrap bg-cyber-green/20 border border-cyber-green/40 px-3 py-1 rounded-lg shadow-neon-green"
                                                >
                                                    <span className="text-[10px] font-black text-cyber-green uppercase tracking-tighter">{t("helmet_verified")}</span>
                                                </motion.div>
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: -80 }}
                                                    transition={{ delay: 2 }}
                                                    className="absolute bottom-4 left-[-60px] whitespace-nowrap bg-purple-500/20 border border-purple-500/40 px-3 py-1 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                                >
                                                    <span className="text-[10px] font-black text-purple-300 uppercase tracking-tighter">{t("esg_secured")}</span>
                                                </motion.div>
                                            </motion.div>
                                        </div>

                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-500">첫 주행 후 실제 3D 경로 리플레이가 표시됩니다</p>
                                        </div>
                                    </div>
                                </section>
                            )}

                            </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ShadowImpactSheet;
