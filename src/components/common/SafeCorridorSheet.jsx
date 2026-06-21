import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle2, MapPin, ChevronRight, Shield, Navigation } from 'lucide-react';
import { calculateDistance } from '../../utils/distance';

// ─── 경로 위험 분석 함수 ──────────────────────────────────────────────────────
/**
 * 직선 경로(origin→destination)를 N등분해 각 분할점에서
 * 위험 구역까지의 거리를 계산, 임계치 이내 위험 구역만 반환
 */
function analyzeRouteHazards(origin, destination, hazards = [], stressZones = [], thresholdM = 600) {
    if (!origin?.lat || !destination?.lat) return [];

    const SAMPLES = 12;
    const samplePoints = Array.from({ length: SAMPLES }, (_, i) => ({
        lat: origin.lat + (destination.lat - origin.lat) * (i / (SAMPLES - 1)),
        lng: origin.lng + (destination.lng - origin.lng) * (i / (SAMPLES - 1)),
    }));

    const totalDist = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);

    // 위험 구역 매핑
    const hazardResults = hazards
        .filter(h => h?.lat && h?.lng)
        .map(h => {
            let closestIdx = 0;
            let minPerp = Infinity;
            samplePoints.forEach((pt, i) => {
                const d = calculateDistance(pt.lat, pt.lng, h.lat, h.lng);
                if (d < minPerp) { minPerp = d; closestIdx = i; }
            });
            const distFromOrigin = Math.round((closestIdx / (SAMPLES - 1)) * totalDist);
            return { ...h, distFromOrigin, perpDist: Math.round(minPerp), category: 'hazard' };
        })
        .filter(h => h.perpDist < thresholdM)
        .sort((a, b) => a.distFromOrigin - b.distFromOrigin);

    // 스트레스 존 매핑
    const stressResults = stressZones
        .map(z => {
            let closestIdx = 0;
            let minPerp = Infinity;
            samplePoints.forEach((pt, i) => {
                const d = calculateDistance(pt.lat, pt.lng, z.lat, z.lng);
                if (d < minPerp) { minPerp = d; closestIdx = i; }
            });
            const distFromOrigin = Math.round((closestIdx / (SAMPLES - 1)) * totalDist);
            return { ...z, distFromOrigin, perpDist: Math.round(minPerp), category: 'stress' };
        })
        .filter(z => z.perpDist < thresholdM)
        .sort((a, b) => a.distFromOrigin - b.distFromOrigin);

    // 병합 후 거리 순 정렬
    return [...hazardResults, ...stressResults].sort((a, b) => a.distFromOrigin - b.distFromOrigin);
}

/** 안전 등급 계산 */
function calcSafetyGrade(hazardCount) {
    if (hazardCount === 0) return { grade: 'A', label: '안전', color: '#22c55e', bg: 'bg-green-500/20', border: 'border-green-500/40' };
    if (hazardCount <= 1) return { grade: 'B', label: '양호', color: '#84cc16', bg: 'bg-lime-500/20', border: 'border-lime-500/40' };
    if (hazardCount <= 2) return { grade: 'C', label: '주의', color: '#f59e0b', bg: 'bg-amber-500/20', border: 'border-amber-500/40' };
    if (hazardCount <= 4) return { grade: 'D', label: '위험', color: '#ef4444', bg: 'bg-red-500/20', border: 'border-red-500/40' };
    return { grade: 'F', label: '고위험', color: '#dc2626', bg: 'bg-red-700/20', border: 'border-red-600/40' };
}

/** 위험 유형 → 아이콘/레이블 */
function hazardMeta(item) {
    if (item.category === 'stress') return { icon: '👥', label: item.name || '보행자 보호구역', color: '#f59e0b' };
    const type = item.type?.toLowerCase() || '';
    if (type.includes('slope') || type.includes('경사')) return { icon: '⛰️', label: '급경사', color: '#ef4444' };
    if (type.includes('accident') || type.includes('사고')) return { icon: '⚠️', label: '사고 다발', color: '#ef4444' };
    if (type.includes('ice') || type.includes('결빙')) return { icon: '🧊', label: '결빙 위험', color: '#38bdf8' };
    if (type.includes('wet') || type.includes('침수')) return { icon: '💧', label: '침수 위험', color: '#60a5fa' };
    if (type.includes('tile') || type.includes('파손')) return { icon: '🚧', label: '도로 파손', color: '#f97316' };
    return { icon: '⚠️', label: item.type || '위험 구역', color: '#ef4444' };
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

const SafeCorridorSheet = ({
    isOpen,
    onClose,
    routeOrigin,
    routeDestination,
    locations = [],
    stressZones = [],
    onNavigate,
}) => {
    const routeHazards = useMemo(
        () => analyzeRouteHazards(routeOrigin, routeDestination, locations, stressZones),
        [routeOrigin, routeDestination, locations, stressZones]
    );

    const grade = useMemo(() => calcSafetyGrade(routeHazards.length), [routeHazards]);

    const totalDist = useMemo(() => {
        if (!routeOrigin?.lat || !routeDestination?.lat) return 0;
        return Math.round(calculateDistance(
            routeOrigin.lat, routeOrigin.lng,
            routeDestination.lat, routeDestination.lng
        ));
    }, [routeOrigin, routeDestination]);

    const estMinutes = Math.max(1, Math.round((totalDist / 1000) / 12 * 60)); // 12km/h 기준

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="corridor-root"
                    className="fixed inset-0 z-[2600] pointer-events-none flex flex-col justify-end items-center px-0 sm:px-4"
                >
                    {/* 배경 */}
                    <motion.div
                        key="corridor-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto"
                    />

                    {/* 시트 */}
                    <motion.div
                        key="corridor-sheet"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="pointer-events-auto relative w-full max-w-md bg-[#0a0c0f] rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.9)] border-t border-cyber-cyan/30 flex flex-col max-h-[88vh]"
                    >
                        {/* 드래그 핸들 */}
                        <div onClick={onClose} className="w-full pt-4 pb-2 flex justify-center cursor-pointer hover:bg-white/5 transition-colors">
                            <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-60 pointer-events-none" />
                        </div>

                        {/* 헤더 */}
                        <div className="px-6 pb-3 flex items-start justify-between">
                            <div>
                                <h2 className="text-[20px] font-black italic tracking-tighter text-white uppercase">
                                    SAFE CORRIDOR
                                </h2>
                                <p className="text-[9px] font-bold text-cyber-cyan tracking-wider uppercase mt-0.5">
                                    경로 안전 분석
                                </p>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors mt-1">
                                <X size={18} />
                            </button>
                        </div>

                        {/* 스크롤 영역 */}
                        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3 scrollbar-hide">

                            {/* ── 경로 요약 카드 ── */}
                            <div className="bg-gradient-to-br from-[#12161b] to-black p-4 rounded-[1.8rem] border border-white/5 shadow-xl">
                                {/* 출발 → 목적지 */}
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-2.5 h-2.5 bg-cyber-cyan rounded-full shadow-[0_0_8px_rgba(64,255,220,0.8)]" />
                                        <div className="w-[1px] h-8 bg-gradient-to-b from-cyber-cyan/60 to-white/10" />
                                        <MapPin size={12} className="text-red-400" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="bg-white/5 rounded-xl px-3 py-2">
                                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">출발지</p>
                                            <p className="text-[11px] font-black text-white truncate">
                                                {routeOrigin?.name || '현재 위치'}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl px-3 py-2">
                                            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">목적지</p>
                                            <p className="text-[11px] font-black text-white truncate">
                                                {routeDestination?.name || `${routeDestination?.lat?.toFixed(4)}, ${routeDestination?.lng?.toFixed(4)}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 거리/시간/안전등급 */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                                        <p className="text-[8px] text-gray-500 font-bold mb-0.5">거리</p>
                                        <p className="text-sm font-black text-white">
                                            {totalDist >= 1000 ? `${(totalDist / 1000).toFixed(1)}km` : `${totalDist}m`}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                                        <p className="text-[8px] text-gray-500 font-bold mb-0.5">예상 시간</p>
                                        <p className="text-sm font-black text-cyber-cyan">{estMinutes}분</p>
                                    </div>
                                    <div className={`${grade.bg} border ${grade.border} rounded-xl p-2.5 text-center`}>
                                        <p className="text-[8px] text-gray-400 font-bold mb-0.5">안전 등급</p>
                                        <p className="text-lg font-black" style={{ color: grade.color }}>{grade.grade}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ── 안전 요약 배너 ── */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className={`flex items-center gap-3 ${grade.bg} border ${grade.border} rounded-2xl px-4 py-3`}
                            >
                                {routeHazards.length === 0 ? (
                                    <CheckCircle2 size={20} className="text-green-400 shrink-0" />
                                ) : (
                                    <AlertTriangle size={20} style={{ color: grade.color }} className="shrink-0" />
                                )}
                                <div>
                                    <p className="text-[11px] font-black text-white">
                                        {routeHazards.length === 0
                                            ? '경로에 위험 구역이 없습니다'
                                            : `경로 내 위험 구역 ${routeHazards.length}개 감지됨`}
                                    </p>
                                    <p className="text-[9px] text-gray-400 mt-0.5">
                                        {routeHazards.length === 0
                                            ? '안전한 경로입니다. 안전 운행하세요!'
                                            : '아래 목록을 확인하고 주의 운행하세요'}
                                    </p>
                                </div>
                            </motion.div>

                            {/* ── 위험 구역 목록 ── */}
                            {routeHazards.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest px-1 flex items-center gap-1.5">
                                        <AlertTriangle size={8} className="text-amber-400" /> 경로 위험 구역
                                    </p>
                                    {routeHazards.map((h, i) => {
                                        const meta = hazardMeta(h);
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 + i * 0.06 }}
                                                className="flex items-center gap-3 bg-gradient-to-br from-[#12161b] to-black rounded-2xl px-4 py-3 border border-white/5"
                                            >
                                                {/* 거리 마커 */}
                                                <div className="flex flex-col items-center gap-0.5 shrink-0 w-10">
                                                    <span className="text-lg">{meta.icon}</span>
                                                    <span className="text-[8px] font-black text-gray-500">
                                                        {h.distFromOrigin >= 1000
                                                            ? `${(h.distFromOrigin / 1000).toFixed(1)}km`
                                                            : `${h.distFromOrigin}m`}
                                                    </span>
                                                </div>

                                                {/* 구분선 */}
                                                <div className="w-[1px] h-8 bg-white/10 shrink-0" />

                                                {/* 내용 */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black text-white truncate">{meta.label}</p>
                                                    <p className="text-[9px] text-gray-500">
                                                        경로로부터 약 {h.perpDist}m
                                                        {h.category === 'stress' && ` · 반경 ${h.radius}m`}
                                                    </p>
                                                </div>

                                                {/* 위험 레벨 색 */}
                                                <div
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}80` }}
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ── 안전 팁 ── */}
                            <div className="bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-2xl px-4 py-3">
                                <p className="text-[9px] font-black text-cyber-cyan uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <Shield size={9} /> 안전 주행 팁
                                </p>
                                <ul className="space-y-1">
                                    {[
                                        '위험 구역 진입 전 미리 감속하세요',
                                        '보행자 보호구역은 서행 운행이 필수입니다',
                                        '음성 안내를 활성화하면 화면 주시 없이 안전 알림을 받을 수 있습니다',
                                    ].map((tip, i) => (
                                        <li key={i} className="text-[9px] text-gray-400 flex items-start gap-1.5">
                                            <span className="text-cyber-cyan mt-0.5 shrink-0">·</span> {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                        </div>

                        {/* ── 하단 버튼 영역 ── */}
                        <div className="p-5 pt-3 border-t border-white/5 flex gap-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3.5 rounded-2xl bg-white/5 text-gray-400 font-bold text-[11px] border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                            >
                                닫기
                            </button>
                            <button
                                onClick={onNavigate}
                                className="flex-[2] py-3.5 rounded-2xl bg-cyber-cyan text-black font-black text-[11px] uppercase tracking-wider shadow-neon-cyan hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Navigation size={14} />
                                외부 앱으로 길 안내
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SafeCorridorSheet;
