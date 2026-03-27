import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, MapPin, X, Navigation } from 'lucide-react';
import { useLocalStorage } from '../../../src/hooks/useLocalStorage';
import { calculateDistance } from '../../../src/utils/distance';

const FavoriteStations = ({ isOpen, onClose, onSelect, userLocation }) => {
    const [favorites, setFavorites] = useLocalStorage('csafe_favorite_stations', []);

    const handleSelect = (station) => {
        onSelect(station);
        onClose();
    };

    const handleRemove = (e, locId) => {
        e.stopPropagation();
        setFavorites(prev => prev.filter(fav => (fav.id || fav.title) !== locId));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
                    />

                    {/* Bottom Sheet Wrapper */}
                    <div className="fixed inset-0 z-[2500] pointer-events-none flex flex-col justify-end items-center px-0 sm:px-4">
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="pointer-events-auto w-full max-w-md bg-[#0a0c0f] rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] border-t border-amber-400/30 overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            {/* Drag Handle (Click to close) */}
                            <div
                                onClick={onClose}
                                className="w-full pt-4 pb-2 flex justify-center cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                            >
                                <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-60 pointer-events-none" />
                            </div>

                            {/* Header */}
                            <div className="px-6 pb-4 pt-1 flex flex-col">
                                <h2 className="text-[22px] font-black italic tracking-tighter text-white uppercase leading-none">
                                    즐겨찾기
                                </h2>
                                <p className="text-[10px] font-bold text-amber-400 tracking-wider uppercase mt-1.5">
                                    FAVORITE STATIONS
                                </p>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">
                                {favorites.length === 0 ? (
                                    /* Empty State */
                                    <div className="flex flex-col items-center justify-center py-16 gap-5">
                                        <div className="w-20 h-20 rounded-full bg-amber-400/5 border border-amber-400/20 flex items-center justify-center">
                                            <Star size={36} className="text-amber-400/40" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black text-gray-400 mb-2">즐겨찾기한 스테이션이 없습니다</p>
                                            <span className="text-[11px] text-gray-600 bg-white/5 px-4 py-2 rounded-full border border-white/5 inline-block">
                                                지도 내 마커의 ⭐ 아이콘을 눌러 추가하세요.
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    /* Station List */
                                    <div className="flex flex-col gap-3">
                                        {favorites.map((loc, idx) => {
                                            const locId = loc.id || loc.title;
                                            let distText = '';
                                            if (userLocation) {
                                                const dist = calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng);
                                                distText = dist > 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`;
                                            }

                                            return (
                                                <motion.div
                                                    key={locId || idx}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => handleSelect(loc)}
                                                    className="bg-gradient-to-br from-[#12161b] to-black border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-98 transition-all group hover:border-amber-400/20"
                                                >
                                                    {/* Icon */}
                                                    <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0">
                                                        <MapPin size={20} className="text-amber-400" />
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-black text-white text-sm truncate pr-2">{loc.title}</h3>
                                                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{loc.desc || '정보 없음'}</p>
                                                    </div>

                                                    {/* Right Side */}
                                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                                        {distText && (
                                                            <div className="bg-cyber-cyan/10 border border-cyber-cyan/30 px-2 py-0.5 rounded-lg text-[10px] font-black text-cyber-cyan tracking-widest flex items-center gap-1">
                                                                <Navigation size={9} />
                                                                {distText}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={(e) => handleRemove(e, locId)}
                                                            className="text-gray-600 hover:text-red-400 p-1 transition-colors"
                                                            title="즐겨찾기 삭제"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default FavoriteStations;
