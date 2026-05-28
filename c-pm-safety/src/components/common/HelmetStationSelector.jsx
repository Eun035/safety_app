import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Store, ShieldCheck, Clock, ChevronRight } from 'lucide-react';
import { calculateDistance } from '../../utils/distance';
import helmetStationsData from '../../data/helmet_stations.json';

/**
 * HelmetStationSelector
 * ─────────────────────────────────────────────────────────────────
 * 목적지 설정 직후 사용자에게 근처 헬멧 거점을 보여주고 선택하게 한다.
 *
 * Props:
 *   isOpen              — 시트 열림 여부
 *   onClose             — 닫기 콜백 (시트 외부 backdrop 클릭 시 = 선택안함과 동일 처리)
 *   onSelect(station)   — 사용자가 거점을 선택했을 때 호출. station 객체 전달
 *   onSkip              — 사용자가 "선택안함" 버튼 클릭. onClose보다 명시적 의도
 *   destinationLat      — 목적지 위도
 *   destinationLng      — 목적지 경도
 *   maxRadiusMeters     — 표시할 최대 반경 (기본 800m). 그 이내가 없으면 가장 가까운 5개 표시
 */
const HelmetStationSelector = ({
    isOpen,
    onClose,
    onSelect,
    onSkip,
    destinationLat,
    destinationLng,
    maxRadiusMeters = 800
}) => {
    // 목적지 기준 거리 계산 + 가까운 순 정렬
    const stations = useMemo(() => {
        if (destinationLat == null || destinationLng == null) return [];
        const withDistance = helmetStationsData.map(s => ({
            ...s,
            distanceM: Math.round(calculateDistance(destinationLat, destinationLng, s.lat, s.lng) * 1000)
        })).sort((a, b) => a.distanceM - b.distanceM);

        // 반경 내가 있으면 그것만, 없으면 가장 가까운 5개 (사용자에게 항상 옵션 제공)
        const inRange = withDistance.filter(s => s.distanceM <= maxRadiusMeters);
        return inRange.length > 0 ? inRange.slice(0, 8) : withDistance.slice(0, 5);
    }, [destinationLat, destinationLng, maxRadiusMeters]);

    const inRangeCount = stations.filter(s => s.distanceM <= maxRadiusMeters).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="helmet-station-root"
                    className="fixed inset-0 z-[2400] pointer-events-none flex flex-col justify-end items-center px-0 sm:px-4"
                >
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                    />
                    <motion.div
                        key="sheet"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="pointer-events-auto relative w-full max-w-md bg-[#0a0c0f] rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] border-t border-cyber-cyan/30 overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        {/* Drag Handle */}
                        <div
                            onClick={onClose}
                            className="w-full pt-4 pb-2 flex justify-center cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-60 pointer-events-none" />
                        </div>

                        {/* Header */}
                        <div className="px-8 pb-4 pt-2 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-[20px] font-black italic tracking-tighter text-white uppercase leading-none">
                                    Helmet Pickup
                                </h2>
                                <p className="text-[10px] font-bold text-cyber-cyan tracking-wider uppercase mt-1.5">
                                    {inRangeCount > 0
                                        ? `목적지 반경 ${maxRadiusMeters}m 이내 ${inRangeCount}곳`
                                        : `반경 ${maxRadiusMeters}m 내 거점 없음 — 가까운 ${stations.length}곳`}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-500 hover:text-white transition-colors"
                                aria-label="닫기"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Station List */}
                        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2 scrollbar-hide">
                            {stations.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-xs text-gray-500">
                                        목적지 좌표가 없어 거점을 표시할 수 없습니다.
                                    </p>
                                </div>
                            ) : (
                                stations.map(station => {
                                    const isStation = station.type === 'STATION';
                                    return (
                                        <button
                                            key={station.id}
                                            onClick={() => onSelect?.(station)}
                                            className="w-full text-left bg-gradient-to-br from-[#12161b] to-black p-4 rounded-2xl border border-white/5 hover:border-cyber-cyan/40 active:scale-[0.99] transition-all shadow-lg group"
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* 아이콘 */}
                                                <div
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                                        isStation
                                                            ? 'bg-cyber-cyan/15 border-cyber-cyan/40 text-cyber-cyan'
                                                            : 'bg-amber-400/10 border-amber-400/40 text-amber-400'
                                                    }`}
                                                >
                                                    {isStation ? <ShieldCheck size={18} /> : <Store size={18} />}
                                                </div>

                                                {/* 내용 */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <p className="text-sm font-black text-white tracking-tight truncate">
                                                            {station.name}
                                                        </p>
                                                        <span
                                                            className={`text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none border ${
                                                                isStation
                                                                    ? 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan/30'
                                                                    : 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                                                            }`}
                                                        >
                                                            {isStation ? 'STATION' : 'STORE'}
                                                        </span>
                                                    </div>

                                                    <p className="text-[10px] text-gray-500 truncate mb-1.5">
                                                        {station.address}
                                                    </p>

                                                    <div className="flex items-center gap-3 text-[10px] font-bold">
                                                        <span className="flex items-center gap-1 text-cyber-cyan">
                                                            <MapPin size={10} />
                                                            {station.distanceM < 1000
                                                                ? `${station.distanceM}m`
                                                                : `${(station.distanceM / 1000).toFixed(1)}km`}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-gray-500">
                                                            <Clock size={10} />
                                                            {station.hours}
                                                        </span>
                                                        <span className="text-gray-500">
                                                            🪖 {station.helmetCount}
                                                        </span>
                                                    </div>

                                                    {/* 제휴 브랜드 */}
                                                    {Array.isArray(station.brandPartners) && station.brandPartners.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {station.brandPartners.slice(0, 4).map(b => (
                                                                <span
                                                                    key={b}
                                                                    className="text-[8px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded-full border border-white/5"
                                                                >
                                                                    {b}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <ChevronRight size={16} className="text-gray-600 group-hover:text-cyber-cyan transition-colors mt-1 shrink-0" />
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* 선택안함 버튼 */}
                        <div className="p-5 pt-3 border-t border-white/5 bg-black/40">
                            <button
                                onClick={() => (onSkip ? onSkip() : onClose?.())}
                                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 border border-white/10 transition-all"
                            >
                                선택안함 (헬멧 지참)
                            </button>
                            <p className="text-[10px] text-gray-600 text-center mt-2">
                                이미 헬멧이 있다면 다음 단계로 진행하세요
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default HelmetStationSelector;
