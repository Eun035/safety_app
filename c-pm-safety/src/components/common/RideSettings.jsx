import React from 'react';
import { X, Sliders, Moon, Zap, Shield, Filter, Check } from 'lucide-react';

const RideSettings = ({ isOpen, onClose, config, setConfig }) => {
    
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
            
            <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl border border-white/20">
                
                {/* Minimalist Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                            <Sliders size={20} className="text-gray-600" />
                        </div>
                        <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase">Ride Control</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-300 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    
                    {/* One-Touch Ride Mode */}
                    <section>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap size={12} /> Ride Mode (Limit)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setConfig({ ...config, speedLimit: 15 })}
                                className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${config.speedLimit === 15 ? 'bg-gray-900 text-white border-gray-900 shadow-xl' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                            >
                                <Shield size={20} />
                                <span className="text-xs font-black uppercase italic">15 km/h</span>
                                <span className="text-[9px] font-bold opacity-60">Safety</span>
                            </button>
                            <button 
                                onClick={() => setConfig({ ...config, speedLimit: 20 })}
                                className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${config.speedLimit === 20 ? 'bg-gray-900 text-white border-gray-900 shadow-xl' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                            >
                                <Zap size={20} />
                                <span className="text-xs font-black uppercase italic">20 km/h</span>
                                <span className="text-[9px] font-bold opacity-60">Normal</span>
                            </button>
                        </div>
                    </section>

                    {/* Night Mode Toggle */}
                    <section className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${config.isNightMode ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-gray-200 text-gray-500'}`}>
                                <Moon size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-800">Night Vision</p>
                                <p className="text-[10px] text-gray-400 font-bold">Dark Map + Neon Focus</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setConfig({ ...config, isNightMode: !config.isNightMode })}
                            className={`w-14 h-8 rounded-full transition-all relative ${config.isNightMode ? 'bg-purple-600 shadow-[0_4px_12px_rgba(147,51,234,0.3)]' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${config.isNightMode ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </section>

                    {/* Brand Filtering */}
                    <section>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Filter size={12} /> Active Brands
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {brands.map(brand => (
                                <button 
                                    key={brand}
                                    onClick={() => toggleBrand(brand)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${config.brandFilters?.includes(brand) ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-white text-gray-300 border-gray-100'}`}
                                >
                                    {brand}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Save/Close Button */}
                    <button 
                        onClick={onClose}
                        className="w-full h-14 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                    >
                        Apply Changes
                    </button>

                </div>
            </div>
        </div>
    );
};

export default RideSettings;
