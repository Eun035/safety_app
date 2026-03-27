import React from 'react';

const routeOptions = [
    { id: 'safe', label: '🛡️ 안전 최우선' },
    { id: 'bike_lane', label: '🚲 자전거 도로' },
    { id: 'fastest', label: '⚡ 최단 거리' },
    { id: 'reward', label: '💰 리워드 최대' }
];

const RoutePreferenceSelector = ({ selectedMode, onModeChange }) => {
    return (
        <div className="w-full px-2 mb-4">
            <h3 className="text-gray-400 font-bold text-[9px] mb-2.5 ml-1 tracking-widest uppercase flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-cyber-cyan/50 animate-pulse"></div>
                Select Preference
            </h3>
            <div 
                className="flex flex-nowrap gap-1.5 overflow-x-auto hide-scrollbar pb-1 snap-x"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {routeOptions.map((option) => {
                    const isActive = selectedMode === option.id;
                    return (
                        <button
                            key={option.id}
                            onClick={() => onModeChange && onModeChange(option.id)}
                            className={`snap-start shrink-0 px-[7px] py-[3.5px] rounded-lg text-[9px] font-black transition-all duration-200 ease-in-out border ${isActive
                                    ? 'bg-cyber-cyan text-black border-cyber-cyan shadow-[0_0_12px_rgba(64,255,220,0.4)]'
                                    : 'bg-black/40 text-gray-400 border-white/5 hover:border-cyber-cyan/30 hover:bg-white/5'
                                }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default RoutePreferenceSelector;
