import React from 'react';
import { X, Info, ShieldCheck, MapPin, Star } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { toast } from '../../hooks/useToast';

const InfoCard = ({ location, onClose }) => {
    // Phase 26: 즐겨찾기 기능 (Bookmark)
    const [favorites, setFavorites] = useLocalStorage('csafe_favorite_stations', []);

    if (!location) return null;

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
                    <div className="flex items-center gap-2 flex-1">
                        <MapPin size={18} />
                        <h3 className="font-black text-sm uppercase tracking-tight truncate pr-2">{location.title}</h3>
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
                                {location.safetyTip}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfoCard;
