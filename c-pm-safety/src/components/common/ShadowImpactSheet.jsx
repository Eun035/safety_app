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
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[2500] bg-[#0a0c0f] rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] border-t border-white/10 overflow-hidden flex flex-col max-h-[92vh]"
                    >
                        {/* Drag Handle */}
                        <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mt-4 mb-2 pointer-events-none opacity-40" />

                        {/* Neon Header */}
                        <div className="sticky top-0 z-20 bg-[#0a0c0f]/80 backdrop-blur-xl px-8 pt-6 pb-4 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-cyber-cyan shadow-neon-cyan animate-pulse"></div>
                                    <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
                                        Shadow Impact
                                    </h2>
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 tracking-[0.3em] uppercase">
                                    {t("shadow_impact_title")}
                                </p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-20 scrollbar-hide">
                            
                            {/* Card 1: City Data Shadow Map */}
                            <section className="relative group">
                                <div className="flex justify-between items-end mb-4">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <MapIcon size={14} className="text-cyber-cyan" /> {t("shadow_map_title")}
                                    </h3>
                                    <span className="text-[10px] font-bold text-cyber-cyan bg-cyber-cyan/10 px-2 py-0.5 rounded tracking-widest">LIVE AI SYNC</span>
                                </div>

                                <div className="bg-gradient-to-br from-[#12161b] to-black p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden">
                                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyber-cyan/5 rounded-full blur-3xl pointer-events-none"></div>
                                    
                                    {/* Mock Mini Map Visualization */}
                                    <div className="h-48 rounded-2xl bg-[#080a0f] border border-white/5 relative overflow-hidden mb-6 shadow-inner">
                                        {/* Map Grid Lines */}
                                        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10">
                                            {[...Array(36)].map((_, i) => (
                                                <div key={i} className="border-[0.5px] border-white/50" />
                                            ))}
                                        </div>
                                        
                                        {/* Glowing Path (Polylines) */}
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                            <motion.path 
                                                d="M 50 150 L 120 120 L 180 160 L 260 100 L 320 130"
                                                fill="none"
                                                stroke="#40ffdc"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                                className="drop-shadow-[0_0_8px_rgba(64,255,220,0.8)]"
                                            />
                                            <circle cx="50" cy="150" r="4" fill="#40ffdc" />
                                            <circle cx="320" cy="130" r="4" fill="#40ffdc" />
                                        </svg>

                                        {/* Fog of War Effect Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/40 via-transparent to-purple-900/30 blur-2xl pointer-events-none"></div>
                                    </div>

                                    {/* Insight Callout */}
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-start gap-4 backdrop-blur-md">
                                        <div className="w-12 h-12 bg-cyber-cyan/10 rounded-xl flex items-center justify-center border border-cyber-cyan/30 shrink-0">
                                            <TrendingUp size={20} className="text-cyber-cyan shadow-neon-cyan" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-white mb-1">{userName}님의 데이터 기여</p>
                                            <p className="text-xs font-bold text-gray-400">신부동 위험 알고리즘 <span className="text-cyber-cyan">{t("0.02% 기여!") || "0.02% 기여!"}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Card 2: 3D Replay Scene */}
                            <section className="relative group">
                                <div className="flex justify-between items-end mb-4">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Zap size={14} className="text-purple-400" /> {t("vibe_replay_title")}
                                    </h3>
                                    <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded tracking-widest italic">3D VISION</span>
                                </div>

                                <div className="bg-gradient-to-br from-[#12161b] to-black p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden">
                                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-600/5 rounded-full blur-3xl pointer-events-none"></div>

                                    {/* 3D-like Animation Area */}
                                    <div className="bg-black/40 rounded-3xl h-56 relative border border-white/5 overflow-hidden flex flex-col items-center justify-center mb-6">
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

                                    {/* Share Button (ESG Style) */}
                                    <button 
                                        className="w-full bg-cyber-cyan text-black py-4 rounded-2xl font-black text-xs shadow-neon-cyan active:scale-95 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                                        onClick={() => {}}
                                    >
                                        <Share2 size={16} /> {t("share_ride")}
                                    </button>
                                </div>
                            </section>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ShadowImpactSheet;
