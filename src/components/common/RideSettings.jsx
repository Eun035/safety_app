import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, Moon, Zap, Shield, Filter, Bike, FileText } from 'lucide-react';

// VIBE 탭 핑크 톤과 매칭하는 sheet 디자인 (다른 footer 시트들과 동일한 슬라이드업 패턴)
const ACCENT = '#FF8C94';

const RideSettings = ({ isOpen, onClose, onNext, config, setConfig }) => {
    const brands = ['G-Bike', 'Swing', 'Dear', 'Beam', 'Lime', 'Alphon', 'Elecle'];

    const toggleBrand = (brand) => {
        const current = config.brandFilters || [];
        if (current.includes(brand)) {
            setConfig({ ...config, brandFilters: current.filter(b => b !== brand) });
        } else {
            setConfig({ ...config, brandFilters: [...current, brand] });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div key="modal-root" className="fixed inset-0 z-[2500] pointer-events-none flex flex-col justify-end items-center px-0 sm:px-4">
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
                        className="pointer-events-auto relative w-full max-w-md bg-[#0a0c0f] rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh]"
                        style={{ borderTop: `1px solid ${ACCENT}66` }}
                    >
                        {/* Drag Handle */}
                        <div
                            onClick={onClose}
                            className="w-full pt-4 pb-2 flex justify-center cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            <div className="w-12 h-1.5 rounded-full opacity-60 pointer-events-none" style={{ background: `${ACCENT}33` }} />
                        </div>

                        {/* Header */}
                        <div className="px-6 pb-4 pt-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <Sliders size={14} style={{ color: ACCENT }} />
                                <h2 className="text-[22px] font-black italic tracking-tighter text-white uppercase leading-none">
                                    RIDE CONTROL
                                </h2>
                            </div>
                            <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: ACCENT }}>
                                주행 모드 · 환경 · 토글 설정
                            </p>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5 scrollbar-hide">

                            {/* === Section 1: Ride Mode === */}
                            <section className="bg-gradient-to-br from-[#1a160d] to-[#0a0c0f] p-5 rounded-[2rem] border border-white/5 shadow-xl">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-1.5" style={{ color: ACCENT }}>
                                    <Zap size={12} /> Ride Mode · 속도 제한
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setConfig({ ...config, speedLimit: 15, isBicycleMode: false })}
                                        className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${config.speedLimit === 15 ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-neon-cyan' : 'bg-gray-800/60 text-gray-500 border-gray-700'}`}
                                    >
                                        <Shield size={18} />
                                        <span className="text-xs font-black uppercase italic">15 km/h</span>
                                        <span className="text-[8px] font-bold opacity-60">전동스쿠터</span>
                                    </button>
                                    <button
                                        onClick={() => setConfig({ ...config, speedLimit: 25, isBicycleMode: true })}
                                        className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${config.speedLimit === 25 ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-neon-cyan' : 'bg-gray-800/60 text-gray-500 border-gray-700'}`}
                                    >
                                        <Zap size={18} />
                                        <span className="text-xs font-black uppercase italic">25 km/h</span>
                                        <span className="text-[8px] font-bold opacity-60">전동자전거</span>
                                    </button>
                                    <button
                                        onClick={() => setConfig({ ...config, speedLimit: 999, isBicycleMode: true })}
                                        className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${config.speedLimit >= 999 ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-neon-cyan' : 'bg-gray-800/60 text-gray-500 border-gray-700'}`}
                                    >
                                        <Bike size={18} />
                                        <span className="text-xs font-black uppercase italic">PRO</span>
                                        <span className="text-[8px] font-bold opacity-60">제한 해제</span>
                                    </button>
                                </div>
                            </section>

                            {/* === Section 2: Night Vision Toggle === */}
                            <section className="flex items-center justify-between p-5 bg-gray-800/40 rounded-2xl border border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${config.isNightMode ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-gray-700 text-gray-400'}`}>
                                        <Moon size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">Night Vision</p>
                                        <p className="text-[10px] text-gray-500 font-bold">Dark Map + Neon Focus</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, isNightMode: !config.isNightMode })}
                                    className={`w-14 h-8 rounded-full transition-all relative ${config.isNightMode ? 'bg-purple-600 shadow-[0_4px_12px_rgba(147,51,234,0.3)]' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${config.isNightMode ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </section>

                            {/* === Section 3: Ride Summary Toggle === */}
                            <section className="flex items-center justify-between p-5 bg-gray-800/40 rounded-2xl border border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${config.showRideSummary !== false ? 'bg-cyber-cyan/80 text-black shadow-[0_0_10px_rgba(64,255,220,0.4)]' : 'bg-gray-700 text-gray-400'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">Ride Summary</p>
                                        <p className="text-[10px] text-gray-500 font-bold">주행 종료 후 요약 카드 노출</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, showRideSummary: config.showRideSummary === false })}
                                    className={`w-14 h-8 rounded-full transition-all relative ${config.showRideSummary !== false ? 'bg-cyber-cyan shadow-[0_4px_12px_rgba(64,255,220,0.3)]' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${config.showRideSummary !== false ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </section>

                            {/* === Section 4: Brand Filtering === */}
                            <section className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Filter size={12} /> Active Brands · 표시할 브랜드
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {brands.map(brand => (
                                        <button
                                            key={brand}
                                            onClick={() => toggleBrand(brand)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${config.brandFilters?.includes(brand) ? 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/50' : 'bg-gray-800/60 text-gray-500 border-gray-700'}`}
                                        >
                                            {brand}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* CTA — onNext가 있으면 라이딩 흐름 다음 단계, 아니면 그냥 닫기 */}
                            <button
                                onClick={onNext || onClose}
                                className="w-full h-14 rounded-2xl font-black text-lg uppercase tracking-widest active:scale-95 transition-all"
                                style={{
                                    background: ACCENT,
                                    color: '#0a0c0f',
                                    boxShadow: `0 0 24px ${ACCENT}66`
                                }}
                            >
                                {onNext ? 'Apply & Next' : 'Apply & Close'}
                            </button>

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RideSettings;
