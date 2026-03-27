import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Shield, Star, Zap, Award, TrendingUp, Gift } from 'lucide-react';

// Radar Chart (Spider Web) component using SVG
const RadarChart = ({ data }) => {
    const size = 100;
    const center = size / 2;
    const levels = 4;
    const labels = data.map(d => d.label);
    const values = data.map(d => d.value / 100); // normalize to 0-1
    const numAxes = data.length;
    const angleStep = (Math.PI * 2) / numAxes;

    const getPoint = (angleDeg, radius) => {
        const angle = angleDeg - Math.PI / 2;
        return {
            x: center + radius * Math.cos(angle),
            y: center + radius * Math.sin(angle),
        };
    };

    // Generate web background lines
    const webLines = Array.from({ length: levels }, (_, lvl) => {
        const r = (center - 8) * ((lvl + 1) / levels);
        const points = Array.from({ length: numAxes }, (_, i) => {
            const p = getPoint(i * angleStep, r);
            return `${p.x},${p.y}`;
        }).join(' ');
        return points;
    });

    // Axis lines
    const axisLines = Array.from({ length: numAxes }, (_, i) => {
        const p = getPoint(i * angleStep, center - 8);
        return p;
    });

    // Data polygon
    const dataPoints = values.map((v, i) => {
        const p = getPoint(i * angleStep, v * (center - 8));
        return `${p.x},${p.y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
            {/* Web background polygons */}
            {webLines.map((pts, i) => (
                <polygon key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
            ))}
            {/* Axis lines */}
            {axisLines.map((p, i) => (
                <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
            ))}
            {/* Data polygon fill */}
            <polygon
                points={dataPoints}
                fill="rgba(168, 85, 247, 0.3)"
                stroke="#a855f7"
                strokeWidth="1.5"
                className="drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]"
            />
            {/* Data dots */}
            {values.map((v, i) => {
                const p = getPoint(i * angleStep, v * (center - 8));
                return <circle key={i} cx={p.x} cy={p.y} r="2" fill="#a855f7" />;
            })}
            {/* Labels */}
            {labels.map((label, i) => {
                const p = getPoint(i * angleStep, center + 1);
                return (
                    <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                        fontSize="6" fill="rgba(255,255,255,0.55)" fontWeight="bold">
                        {label}
                    </text>
                );
            })}
        </svg>
    );
};

// Hexagonal avatar border using SVG clip
const HexAvatar = ({ src, name }) => (
    <div className="relative w-14 h-14 shrink-0">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <defs>
                <clipPath id="hex-clip">
                    <polygon points="50,3 93,25 93,75 50,97 7,75 7,25" />
                </clipPath>
            </defs>
            {/* Neon border */}
            <polygon
                points="50,3 93,25 93,75 50,97 7,75 7,25"
                fill="none"
                stroke="#40ffdc"
                strokeWidth="3"
                className="drop-shadow-[0_0_8px_rgba(64,255,220,0.8)]"
            />
            {/* Avatar background */}
            <rect x="0" y="0" width="100" height="100" fill="#1a1f2e" clipPath="url(#hex-clip)" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black text-cyber-cyan">{name?.[0] || 'K'}</span>
        </div>
    </div>
);

const radarData = [
    { label: '🪖헬멧', value: 92 },
    { label: '🅿파킹', value: 78 },
    { label: '🌊스무스', value: 85 },
    { label: '🚀속도', value: 70 },
    { label: '🌿탄소', value: 95 },
];

const leaderboard = [
    { rank: 1, name: '천안마스터', score: 98, highlight: false },
    { rank: 2, name: '에코라이더X', score: 95, highlight: false },
    { rank: 3, name: '사용자 K', score: 92, highlight: true },
    { rank: 4, name: '스피드세이버', score: 88, highlight: false },
    { rank: 5, name: '라이더99', score: 84, highlight: false },
];

const badges = [
    { icon: '🏆', name: '천안 마스터', color: 'from-amber-500/20 to-amber-900/20', border: 'border-amber-500/40', text: 'text-amber-400' },
    { icon: '🪖', name: '헬멧 가디언', color: 'from-cyber-cyan/10 to-cyan-900/10', border: 'border-cyber-cyan/40', text: 'text-cyber-cyan' },
    { icon: '🌿', name: 'ESG 챔피언', color: 'from-green-500/10 to-green-900/10', border: 'border-green-500/40', text: 'text-green-400' },
    { icon: '⚡', name: '스피드킹', color: 'from-purple-500/10 to-purple-900/10', border: 'border-purple-500/40', text: 'text-purple-400' },
];

const UserProfileSheet = ({ isOpen, onClose, userName, userPoints = 12350, userScore = 92 }) => {
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

                    {/* Bottom Sheet Wrapper */}
                    <div className="fixed inset-0 z-[2500] pointer-events-none flex flex-col justify-end items-center px-0 sm:px-4">
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="pointer-events-auto w-full max-w-md bg-[#0a0c0f] rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] border-t border-cyber-cyan/30 overflow-hidden flex flex-col max-h-[92vh]"
                        >
                            {/* Drag Handle (Click to close) */}
                            <div
                                onClick={onClose}
                                className="w-full pt-3 pb-1.5 flex justify-center cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                            >
                                <div className="w-10 h-1 bg-gray-600 rounded-full opacity-60 pointer-events-none" />
                            </div>

                            {/* Header */}
                            <div className="px-6 pb-2 pt-1 flex flex-col">
                                <h2 className="text-[20px] font-black italic tracking-tighter text-white uppercase leading-none">
                                    MY PROFILE
                                </h2>
                                <p className="text-[9px] font-bold text-cyber-cyan tracking-wider uppercase mt-1">
                                    나의 안전 정체성 & 리워드
                                </p>
                            </div>

                            {/* Scrollable content */}
                            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2.5 scrollbar-hide">

                                {/* === Section 1: Safety Identity === */}
                                <div className="bg-gradient-to-br from-[#12161b] to-black p-3 rounded-[1.5rem] border border-white/5 shadow-xl">
                                    <div className="flex items-center gap-3">
                                        <HexAvatar name={userName || '사용자 K'} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Safety Identity</p>
                                            <p className="text-base font-black text-white truncate">{userName || '사용자 K'}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="text-[9px] font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30 px-1.5 py-0.5 rounded-full">상위 5%</span>
                                                <span className="text-[9px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 rounded-full">🏅 Gold Rider</span>
                                            </div>
                                        </div>
                                        {/* Radar chart */}
                                        <div className="shrink-0">
                                            <RadarChart data={radarData} />
                                        </div>
                                    </div>
                                    {/* Score bar */}
                                    <div className="mt-2 flex items-center gap-3">
                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest shrink-0">안전점수</span>
                                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-cyber-cyan to-purple-400 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${userScore}%` }}
                                                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                                            />
                                        </div>
                                        <span className="text-xs font-black text-cyber-cyan shrink-0">{userScore}</span>
                                    </div>
                                </div>

                                {/* === Section 2: Insurance Ad === */}
                                <div className="bg-gradient-to-br from-[#0d131a] to-[#0a0c0f] p-3 rounded-[1.5rem] border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
                                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Shield size={10} className="text-blue-400" /> 보험 가입 안내
                                    </p>
                                    <div className="mb-2.5">
                                        <h3 className="text-sm font-black text-white tracking-tight">천안시민 전용 안전 보험</h3>
                                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">라이딩 중 사고 발생 시 보장 내역을 확인하고<br />무료로 혜택을 누리세요.</p>
                                    </div>
                                    <button className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-black text-[10px] shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 transition-all uppercase tracking-[0.1em] flex items-center justify-center gap-2">
                                        무료 보험 확인하기
                                    </button>
                                </div>

                                {/* === Section 3: Crew Leaderboard === */}
                                <div className="bg-gradient-to-br from-[#12161b] to-black p-3 rounded-[1.5rem] border border-white/5">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <TrendingUp size={10} className="text-purple-400" /> 크루 랭킹
                                    </p>
                                    <div className="space-y-1.5">
                                        {leaderboard.map((item) => (
                                            <div
                                                key={item.rank}
                                                className={`flex items-center gap-3 px-2.5 py-1.5 rounded-lg transition-all ${item.highlight
                                                    ? 'bg-cyber-cyan/10 border border-cyber-cyan/30 shadow-[0_0_10px_rgba(64,255,220,0.1)]'
                                                    : 'bg-white/3'
                                                    }`}
                                            >
                                                <span className={`text-[10px] font-black w-5 text-center ${item.rank === 1 ? 'text-amber-400' : item.rank === 2 ? 'text-gray-300' : item.rank === 3 ? 'text-amber-600' : 'text-gray-600'}`}>
                                                    {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                                                </span>
                                                <span className={`flex-1 text-[10px] font-bold ${item.highlight ? 'text-white' : 'text-gray-400'}`}>{item.name}</span>
                                                <span className={`text-[11px] font-black ${item.highlight ? 'text-cyber-cyan drop-shadow-[0_0_6px_rgba(64,255,220,0.8)]' : 'text-gray-500'}`}>{item.score}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* === Section 4: Achievement Badges === */}
                                <div className="pt-0.5">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 px-1 flex items-center gap-1.5">
                                        <Zap size={10} className="text-amber-400" /> 업적 배지
                                    </p>
                                    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                                        {badges.map((badge, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 * i }}
                                                className={`flex-shrink-0 w-18 bg-gradient-to-br ${badge.color} border ${badge.border} rounded-xl p-2.5 flex flex-col items-center gap-1 shadow-lg`}
                                            >
                                                <span className="text-xl">{badge.icon}</span>
                                                <span className={`text-[8px] font-black ${badge.text} text-center leading-tight uppercase tracking-tight`}>{badge.name}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default UserProfileSheet;
