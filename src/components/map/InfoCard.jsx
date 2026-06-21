import React from 'react';
import { X, Info, ShieldCheck, MapPin, Star, Navigation } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { toast } from '../../hooks/useToast';
import { useRegion } from '../../hooks/useRegion';
import { REGIONS } from '../../config/regions';

const InfoCard = ({ location, onClose, onSetOrigin, onSetDestination }) => {
    // Phase 26: 즐겨찾기 기능 (Bookmark)
    const [favorites, setFavorites] = useLocalStorage('csafe_favorite_stations', []);
    const currentRegion = useRegion(s => s.currentRegion);

    if (!location) return null;

    // 🏙️ 지역 뱃지 — location.region이 있으면 표시 (현재 지역이면 강조)
    const locRegion = location.region;
    const locRegionMeta = locRegion ? REGIONS[locRegion] : null;
    const isCurrentRegion = locRegion === currentRegion;

    // 고유 식별자로 id 사용, 없으면 title
    const locId = location.id || location.title;
    const isFavorite = favorites.some(fav => (fav.id || fav.title) === locId);

    const toggleFavorite = (e) => {
        e.stopPropagation();
        if (isFavorite) {
            setFavorites(prev => prev.filter(fav => (fav.id || fav.title) !== locId));
            toast("즐겨찾기에서 제거되었습니다.", 'info');
        } else {
            setFavorites(prev => [...prev, location]);
            toast("⭐ 즐겨찾기에 추가되었습니다!", 'success');
        }
    };

    return (
        <div className="absolute bottom-28 left-4 right-4 z-[90] animate-in slide-in-from-bottom-10 duration-300">
            <div className="bg-cyber-panel/90 backdrop-blur-xl rounded-[2rem] shadow-glass overflow-hidden border border-white/10">
                {/* Header */}
                <div className="bg-cyber-cyan/10 border-b border-cyber-cyan/20 p-4 flex items-center justify-between text-cyber-cyan">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MapPin size={18} />
                        <h3 className="font-black text-sm uppercase tracking-tight truncate">{location.title}</h3>
                        {locRegionMeta && (
                            <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                isCurrentRegion
                                    ? 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/40'
                                    : 'bg-white/5 text-gray-400 border-white/10'
                            }`}>
                                🏙️ {locRegionMeta.name}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={toggleFavorite}
                            className="p-1 hover:bg-cyber-cyan/20 rounded-full transition"
                            title="즐겨찾기"
                        >
                            <Star size={20} className={isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-cyber-cyan/20 rounded-full transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 bg-cyber-cyan/20 text-cyber-cyan rounded-xl border border-cyber-cyan/30">
                            <Info size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-cyber-cyan uppercase tracking-widest mb-1">Condition Details</div>
                            <p className="text-gray-200 font-bold text-sm leading-relaxed">
                                {location.desc}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-cyber-green/10 rounded-2xl border border-cyber-green/30 flex items-start gap-3 shadow-[inset_0_0_20px_rgba(56,239,125,0.1)]">
                        <ShieldCheck size={20} className="text-cyber-green shrink-0 mt-0.5" />
                        <div>
                            <div className="text-[10px] font-black text-cyber-green uppercase tracking-widest mb-1">Safety Tip</div>
                            <p className="text-xs font-medium text-gray-200 leading-relaxed">
                                {location.safetyTip || '안전한 라이딩을 위해 헬멧을 꼭 착용하세요.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                        {onSetOrigin && (
                            <button
                                onClick={onSetOrigin}
                                className="w-full py-3 bg-cyber-cyan text-black font-black rounded-xl hover:bg-[#40e0d0] transition-all shadow-[0_0_15px_rgba(64,255,220,0.4)] flex items-center justify-center gap-2"
                            >
                                <Navigation size={18} className="fill-black" />
                                이곳을 출발지로 지정
                            </button>
                        )}
                        {onSetDestination && (
                            <button
                                onClick={onSetDestination}
                                className="w-full py-3 bg-orange-500 text-black font-black rounded-xl hover:bg-orange-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
                            >
                                <Navigation size={18} className="fill-black" />
                                이곳을 목적지로 지정
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfoCard;
