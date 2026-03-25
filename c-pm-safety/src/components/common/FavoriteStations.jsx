import React from 'react';
import { Star, MapPin, X, Navigation } from 'lucide-react';
import { useLocalStorage } from '../../../src/hooks/useLocalStorage';
import { calculateDistance } from '../../../src/utils/distance';

const FavoriteStations = ({ isOpen, onClose, onSelect, userLocation }) => {
    const [favorites, setFavorites] = useLocalStorage('csafe_favorite_stations', []);

    if (!isOpen) return null;

    const handleSelect = (station) => {
        onSelect(station);
    };

    const handleRemove = (e, locId) => {
        e.stopPropagation();
        setFavorites(prev => prev.filter(fav => (fav.id || fav.title) !== locId));
    };

    return (
        <div className="fixed inset-0 z-[1200] flex flex-col justify-end p-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
            <div className="w-full h-[60vh] bg-cyber-panel/95 border-t border-white/10 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-bottom duration-300">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center">
                            <Star size={20} className="text-yellow-400 fill-yellow-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tighter">즐겨찾기</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Favorite Stations</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* List Content */}
                <div className="p-4 flex-1 overflow-y-auto hidden-scrollbar">
                    {favorites.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                            <Star size={48} className="text-gray-700 font-light" />
                            <p className="font-medium text-sm">즐겨찾기한 스테이션이 없습니다.</p>
                            <span className="text-xs bg-white/5 px-3 py-1 rounded-full border border-white/5">지도 내 마커의 ⭐ 아이콘을 눌러 추가하세요.</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {favorites.map((loc, idx) => {
                                const locId = loc.id || loc.title;
                                // 거리 계산 로직 (사용자 위치가 있으면 표시)
                                let distText = '';
                                if (userLocation) {
                                    const dist = calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng);
                                    distText = dist > 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`;
                                }

                                return (
                                    <div
                                        key={locId || idx}
                                        onClick={() => handleSelect(loc)}
                                        className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all active:scale-95 group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center shrink-0">
                                            <MapPin size={20} className="text-cyber-cyan" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-base truncate pr-2">{loc.title}</h3>
                                            <p className="text-xs text-gray-400 mt-1 truncate">{loc.desc || '정보 없음'}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            {distText && (
                                                <div className="bg-cyber-cyan/20 px-2 py-0.5 rounded text-[10px] font-black text-cyber-cyan tracking-widest flex items-center gap-1">
                                                    <Navigation size={10} />
                                                    {distText}
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => handleRemove(e, locId)}
                                                className="text-gray-500 hover:text-red-400 p-1"
                                                title="즐겨찾기 삭제"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FavoriteStations;
