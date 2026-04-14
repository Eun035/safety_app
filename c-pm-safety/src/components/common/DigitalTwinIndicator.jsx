import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, Zap, Gauge, Timer, Mountain } from 'lucide-react';

const DigitalTwinIndicator = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const { speed, reactionDist, brakingDist, totalDist, riskLevel, mu, incline, reactionTime } = data;

    const theme = {
        safe: {
            bg: 'bg-emerald-950/40',
            border: 'border-emerald-500/50',
            text: 'text-emerald-400',
            glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
            icon: ShieldCheck,
            label: '안전 (SAFE)'
        },
        warning: {
            bg: 'bg-amber-950/40',
            border: 'border-amber-500/50',
            text: 'text-amber-400',
            glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
            icon: AlertCircle,
            label: '주의 (WARNING)'
        },
        danger: {
            bg: 'bg-red-950/40',
            border: 'border-red-500/50',
            text: 'text-red-400',
            glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
            icon: AlertTriangle,
            label: totalDist === Infinity ? '제동 불가 (RUNAWAY)' : '위험 (DANGER)'
        }
    }[riskLevel];

    const RiskIcon = theme.icon;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`w-full max-w-sm rounded-[2.5rem] p-8 border ${theme.bg} ${theme.border} ${theme.glow} relative overflow-hidden flex flex-col items-center text-center shadow-2xl`}>
                
                {/* Cyber Background Accents */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>

                {/* Header */}
                <div className="flex flex-col items-center mb-6 z-10">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border-2 ${theme.border} bg-black/40 shadow-inner`}>
                        <RiskIcon size={32} className={theme.text} />
                    </div>
                    <h2 className={`text-xl font-black tracking-tighter uppercase ${theme.text}`}>DIGITAL TWIN LITE</h2>
                    <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mt-1">Real-time Risk Simulation</p>
                </div>

                {/* Main Distance Display */}
                <div className="w-full bg-black/40 rounded-[2rem] p-6 mb-6 border border-white/5 shadow-inner z-10">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Stop Distance</span>
                        <div className="text-right">
                            <span className={`text-5xl font-black italic tracking-tighter ${theme.text}`}>
                                {totalDist === Infinity ? '∞' : totalDist.toFixed(2)}
                            </span>
                            <span className={`text-sm font-bold ml-1 ${theme.text}`}>m</span>
                        </div>
                    </div>
                    
                    {/* Visual Bar */}
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden flex shadow-inner">
                        <div 
                            className="h-full bg-purple-500 transition-all duration-700 ease-out"
                            style={{ width: totalDist === Infinity ? '30%' : `${(reactionDist / Math.max(totalDist, 10)) * 100}%` }}
                        ></div>
                        <div 
                            className={`h-full ${theme.text.replace('text', 'bg')} transition-all duration-700 ease-out flex-1`}
                        >
                            <div className="w-full h-full bg-white/10 animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] font-bold tracking-tight text-gray-400">
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Reaction: {reactionDist.toFixed(2)}m</span>
                        <span className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${theme.text.replace('text', 'bg')}`}></div> Braking: {brakingDist === Infinity ? '∞' : brakingDist.toFixed(2)}m</span>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 w-full mb-8 z-10">
                    <div className="bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-left">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Gauge size={12} />
                            <span className="text-[9px] font-black uppercase">Speed</span>
                        </div>
                        <p className="text-lg font-black text-white">{speed} <span className="text-[10px] font-normal text-gray-400">km/h</span></p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-left">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Mountain size={12} />
                            <span className="text-[9px] font-black uppercase">Incline</span>
                        </div>
                        <p className="text-lg font-black text-white">{incline}°</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-left">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Zap size={12} />
                            <span className="text-[9px] font-black uppercase">Surface</span>
                        </div>
                        <p className="text-lg font-black text-white">μ={mu}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-left">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Timer size={12} />
                            <span className="text-[9px] font-black uppercase">Reaction</span>
                        </div>
                        <p className="text-lg font-black text-white">{reactionTime || 1.0} <span className="text-[10px] font-normal text-gray-400">s</span></p>
                    </div>
                </div>

                {/* Control / Message */}
                <div className={`w-full py-4 rounded-2xl font-black text-sm mb-4 border ${theme.border} bg-white/5 flex flex-col items-center justify-center gap-1 z-10`}>
                    <span className={`text-[10px] font-black tracking-widest ${theme.text}`}>ALGORITHM STATUS: {theme.label}</span>
                    {riskLevel !== 'safe' && (
                        <p className="text-white text-[11px] animate-pulse">속도를 줄이고 안전 거리를 확보하세요!</p>
                    )}
                </div>

                <button 
                    onClick={onClose}
                    className="w-full text-xs font-black text-gray-500 hover:text-white transition-colors py-2 uppercase tracking-widest z-10"
                >
                    CLOSE SIMULATOR
                </button>
            </div>
        </div>
    );
};

export default DigitalTwinIndicator;
