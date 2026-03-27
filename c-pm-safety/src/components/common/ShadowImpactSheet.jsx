import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Map as MapIcon, Zap, Shield, Cloud, TrendingUp, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ShadowImpactSheet = ({ isOpen, onClose, userName = "J" }) => {
    const { t } = useTranslation();

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

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-[1001] bg-[#0a0c10]/95 backdrop-blur-2xl border-t border-cyber-cyan/30 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Drag Handle */}
                        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2" />

                        {/* Header */}
                        <div className="px-8 py-4 flex items-center justify-between border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">
                                    Shadow Impact
                                </h2>
                                <p className="text-[10px] font-bold text-cyber-cyan tracking-[0.2em] uppercase mt-1">
                                    {t("shadow_impact_title")}
                                </p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-20 scrollbar-hide">
                            
                            {/* Card 1: City Data Shadow Map */}
                            <div className="relative bg-gradient-to-br from-[#12151e] to-[#0a0c10] rounded-[2rem] border border-white/5 overflow-hidden shadow-glass group">
                                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                                
                                <div className="p-6 relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <MapIcon size={14} className="text-cyber-cyan" /> {t("shadow_map_title")}
                                        </h3>
                                        <div className="bg-cyber-cyan/10 px-3 py-1 rounded-full border border-cyber-cyan/20">
                                            <span className="text-[10px] font-black text-cyber-cyan italic">LIVE FEED</span>
                                        </div>
                                    </div>

                                    {/* Mock Mini Map Visualization */}
                                    <div className="h-48 rounded-2xl bg-[#080a0f] border border-white/5 relative overflow-hidden mb-4 shadow-inner">
                                        {/* Map Grid Lines */}
                                        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10">
                                            {[...Array(36)].map((_, i) => (
                                                <div key={i} className="border-[0.5px] border-white/50" />
                                            ))}
                                        </div>
                                        
                                        {/* Glowing Path (Polylines) */}
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                            <motion.path 
                                                d="M 50 150 L 120 120 L 200 160 L 280 100 L 350 130"
                                                fill="none"
                                                stroke="#40ffdc"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                                className="drop-shadow-[0_0_8px_rgba(64,255,220,0.8)]"
                                            />
                                            <circle cx="50" cy="150" r="4" fill="#40ffdc" className="shadow-neon-cyan" />
                                            <circle cx="350" cy="130" r="4" fill="#40ffdc" className="shadow-neon-cyan" />
                                        </svg>

                                        {/* Fog of War Effect Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/40 via-transparent to-purple-900/30 blur-2xl pointer-events-none"></div>
                                    </div>

                                    {/* Insight Callout */}
                                    <div className="bg-cyber-panel/80 p-4 rounded-xl border-l-4 border-cyber-cyan flex items-start gap-3 shadow-glass">
                                        <div className="w-8 h-8 bg-cyber-cyan/20 rounded-lg flex items-center justify-center shrink-0">
                                            <TrendingUp size={16} className="text-cyber-cyan" />
                                        </div>
                                        <p className="text-sm font-bold text-white leading-snug">
                                            <span className="text-cyber-cyan">{userName}</span>님의 주행데이터, 신부동 위험 알고리즘 <span className="text-cyber-cyan italic">0.02%</span> 기여!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: 3D Replay Scene */}
                            <div className="relative bg-gradient-to-br from-[#0d1117] to-[#080a0f] rounded-[2rem] border border-white/5 overflow-hidden shadow-glass group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-[80px]"></div>
                                
                                <div className="p-6 relative z-10">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Zap size={14} className="text-purple-400" /> {t("vibe_replay_title")}
                                    </h3>

                                    {/* 3D-like Animation Area */}
                                    <div className="bg-black/40 rounded-3xl h-56 relative border border-white/5 overflow-hidden flex flex-col items-center justify-center">
                                        {/* Winding Road Line */}
                                        <svg className="absolute inset-0 w-full h-full opacity-30">
                                            <path 
                                                d="M -20 180 Q 100 150 200 100 T 420 20" 
                                                fill="none" 
                                                stroke="white" 
                                                strokeWidth="1" 
                                                strokeDasharray="5,5" 
                                            />
                                        </svg>

                                        {/* Helmet Mockup (Icon with Glow) */}
                                        <motion.div 
                                            animate={{ 
                                                y: [0, -10, 0],
                                                scale: [1, 1.05, 1]
                                            }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            className="relative z-20"
                                        >
                                            <div className="w-24 h-24 bg-white/5 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                                <Shield size={48} className="text-white drop-shadow-lg" />
                                            </div>
                                            {/* Milestone Floating Tags */}
                                            <motion.div 
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 50 }}
                                                transition={{ delay: 1 }}
                                                className="absolute top-0 right-[-60px] whitespace-nowrap bg-cyber-green/20 border border-cyber-green/40 px-3 py-1 rounded-lg shadow-neon-green"
                                            >
                                                <span className="text-[10px] font-black text-cyber-green uppercase tracking-tighter">{t("helmet_verified")}</span>
                                            </motion.div>
                                            <motion.div 
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: -80 }}
                                                transition={{ delay: 2 }}
                                                className="absolute bottom-4 left-[-60px] whitespace-nowrap bg-purple-500/20 border border-purple-500/40 px-3 py-1 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                            >
                                                <span className="text-[10px] font-black text-purple-300 uppercase tracking-tighter">{t("esg_secured")}</span>
                                            </motion.div>
                                        </motion.div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-8 flex gap-3">
                                        <button className="flex-1 h-14 bg-cyber-cyan text-black font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-neon-cyan">
                                            <Share2 size={16} /> {t("share_ride")}
                                        </button>
                                        <button className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all">
                                            <TrendingUp size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ShadowImpactSheet;
