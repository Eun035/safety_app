import { X, Sliders, Moon, Zap, Shield, Filter, Bike } from 'lucide-react';

const RideSettings = ({ isOpen, onClose, onNext, config, setConfig }) => {
    
    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />
            
            <div className="relative bg-[#1C1C1E]/95 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl border border-gray-800">

                {/* Cyber Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-800/80 rounded-xl flex items-center justify-center border border-gray-700">
                            <Sliders size={20} className="text-cyber-cyan" />
                        </div>
                        <h2 className="text-xl font-black text-white tracking-tight uppercase">Ride Control</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors rounded-full bg-gray-800/50">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8">

                    {/* One-Touch Ride Mode */}
                    <section>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap size={12} /> Ride Mode (Limit)
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setConfig({ ...config, speedLimit: 15, isBicycleMode: false })}
                                className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${config.speedLimit === 15 ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-neon-cyan' : 'bg-gray-800/60 text-gray-500 border-gray-700'}`}
                            >
                                <Shield size={18} />
                                <span className="text-xs font-black uppercase italic">15 km/h</span>
                                <span className="text-[8px] font-bold opacity-60">전동스쿠터 모드</span>
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, speedLimit: 25, isBicycleMode: true })}
                                className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${config.speedLimit === 25 ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-neon-cyan' : 'bg-gray-800/60 text-gray-500 border-gray-700'}`}
                            >
                                <Zap size={18} />
                                <span className="text-xs font-black uppercase italic">25 km/h</span>
                                <span className="text-[8px] font-bold opacity-60">전동자전거 모드</span>
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, speedLimit: 999, isBicycleMode: true })}
                                className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${config.speedLimit >= 999 ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-neon-cyan' : 'bg-gray-800/60 text-gray-500 border-gray-700'}`}
                            >
                                <Bike size={18} />
                                <span className="text-xs font-black uppercase italic">PRO</span>
                                <span className="text-[8px] font-bold opacity-60">제한속도 해제</span>
                            </button>
                        </div>
                    </section>

                    {/* Night Mode Toggle */}
                    <section className="flex items-center justify-between p-6 bg-gray-800/40 rounded-2xl border border-gray-700/50">
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


                    {/* Brand Filtering */}
                    <section>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Filter size={12} /> Active Brands
                        </h3>
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

                    {/* Save/Close Button */}
                    <button
                        onClick={onNext || onClose}
                        className="w-full h-14 bg-cyber-cyan text-black rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-neon-cyan"
                    >
                        Apply & Next
                    </button>

                </div>
            </div>
        </div>
    );
};

export default RideSettings;
