import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, ShieldCheck, Store, MapPin, Award } from 'lucide-react';
import { calculateDistance } from '../../utils/distance';
import helmetStationsData from '../../data/helmet_stations.json';

/**
 * HelmetReturnSheet
 * ─────────────────────────────────────────────────────────────────
 * 주행 종료(합법 주차) 후 사용자에게 헬멧 반납 인증을 요청한다.
 * 시작 시 선택한 거점이 있으면 그것을 우선 표시하고, 없으면 종료 위치
 * 반경 내 가까운 거점 3개를 자동 추천한다. 사용자가 거점을 클릭하면
 * 반납 인증 + 보상(+rewardPoints) 지급. "건너뛰기" 클릭 시 보상 없이 종료.
 *
 * Props:
 *   isOpen
 *   onClose
 *   onConfirm(station)        — 반납 거점 확정 시 호출 (station 객체)
 *   onSkip                    — 건너뛰기
 *   selectedStation           — 시작 시 사용자가 선택한 헬멧 거점 (없으면 null)
 *   endLat / endLng           — 주행 종료 위치
 *   rewardPoints              — 반납 인증 시 적립 포인트 (기본 100P)
 */
const HelmetReturnSheet = ({
    isOpen,
    onClose,
    onConfirm,
    onSkip,
    selectedStation,
    endLat,
    endLng,
    rewardPoints = 100
}) => {
    const { t } = useTranslation();
    // 종료 위치 기준 가까운 거점 3개 (selectedStation이 없을 때만 사용)
    const nearbyStations = useMemo(() => {
        if (selectedStation) return [];
        if (endLat == null || endLng == null) return [];
        return helmetStationsData
            .map(s => ({
                ...s,
                distanceM: Math.round(calculateDistance(endLat, endLng, s.lat, s.lng) * 1000)
            }))
            .sort((a, b) => a.distanceM - b.distanceM)
            .slice(0, 3);
    }, [selectedStation, endLat, endLng]);

    // selectedStation의 종료 위치까지 거리 (참고용 표시)
    const selectedDistance = useMemo(() => {
        if (!selectedStation || endLat == null || endLng == null) return null;
        return Math.round(calculateDistance(endLat, endLng, selectedStation.lat, selectedStation.lng) * 1000);
    }, [selectedStation, endLat, endLng]);

    const renderStationCard = (station, distanceM, isPrimary = false) => {
        const isStation = station.type === 'STATION';
        return (
            <button
                key={station.id}
                onClick={() => onConfirm?.(station)}
                className={`w-full text-left p-4 rounded-2xl border active:scale-[0.99] transition-all shadow-lg group ${
                    isPrimary
                        ? 'bg-gradient-to-br from-cyber-cyan/15 to-black border-cyber-cyan/40 hover:border-cyber-cyan/70'
                        : 'bg-gradient-to-br from-[#12161b] to-black border-white/5 hover:border-cyber-cyan/40'
                }`}
            >
                <div className="flex items-start gap-3">
                    <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            isStation
                                ? 'bg-cyber-cyan/15 border-cyber-cyan/40 text-cyber-cyan'
                                : 'bg-amber-400/10 border-amber-400/40 text-amber-400'
                        }`}
                    >
                        {isStation ? <ShieldCheck size={18} /> : <Store size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-black text-white tracking-tight truncate">{station.name}</p>
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
                        <p className="text-[10px] text-gray-500 truncate mb-1.5">{station.address}</p>
                        <div className="flex items-center gap-3 text-[10px] font-bold">
                            {distanceM != null && (
                                <span className="flex items-center gap-1 text-cyber-cyan">
                                    <MapPin size={10} />
                                    {t('hrs_from_end', { d: distanceM < 1000 ? `${distanceM}m` : `${(distanceM / 1000).toFixed(1)}km` })}
                                </span>
                            )}
                        </div>
                    </div>
                    {isPrimary && (
                        <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className="text-[8px] font-black text-cyber-cyan bg-cyber-cyan/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-cyber-cyan/30">
                                {t('hrs_my_pick')}
                            </span>
                            <span className="text-xs font-black text-amber-400">+{rewardPoints}P</span>
                        </div>
                    )}
                </div>
            </button>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="helmet-return-root"
                    className="fixed inset-0 z-[2450] pointer-events-none flex flex-col justify-end items-center px-0 sm:px-4"
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
                        <div
                            onClick={onClose}
                            className="w-full pt-4 pb-2 flex justify-center cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-60 pointer-events-none" />
                        </div>

                        {/* Header */}
                        <div className="px-8 pb-4 pt-2 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-amber-400/15 rounded-xl flex items-center justify-center border border-amber-400/30 shrink-0">
                                    <Award size={20} className="text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-[20px] font-black italic tracking-tighter text-white uppercase leading-none">
                                        Helmet Return
                                    </h2>
                                    <p className="text-[10px] font-bold text-amber-400 tracking-wider uppercase mt-1.5">
                                        {t('hrs_subtitle', { p: rewardPoints })}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-500 hover:text-white transition-colors"
                                aria-label={t('close')}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2 scrollbar-hide">
                            {selectedStation ? (
                                <>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 mb-1">
                                        {t('hrs_selected_label')}
                                    </p>
                                    {renderStationCard(selectedStation, selectedDistance, true)}
                                    <p className="text-[10px] text-gray-600 px-1 mt-2">
                                        {t('hrs_other_hint')}
                                    </p>
                                </>
                            ) : nearbyStations.length > 0 ? (
                                <>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 mb-1">
                                        {t('hrs_nearby_label')}
                                    </p>
                                    {nearbyStations.map(s => renderStationCard(s, s.distanceM, false))}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-xs text-gray-500">
                                        {t('hrs_no_nearby')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 건너뛰기 */}
                        <div className="p-5 pt-3 border-t border-white/5 bg-black/40">
                            <button
                                onClick={() => (onSkip ? onSkip() : onClose?.())}
                                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 border border-white/10 transition-all"
                            >
                                {t('hrs_skip')}
                            </button>
                            <p className="text-[10px] text-gray-600 text-center mt-2">
                                {t('hrs_skip_hint', { p: rewardPoints })}
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default HelmetReturnSheet;
