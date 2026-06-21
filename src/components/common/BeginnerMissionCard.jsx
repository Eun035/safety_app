import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Lock, ChevronRight, Trophy, Zap } from 'lucide-react';
import { useBeginnerMissions } from '../../hooks/useBeginnerMissions';

/**
 * MissionProgressBar — 개별 미션 진행도 바
 */
const MissionProgressBar = ({ progress, goal, accentColor }) => {
    const pct = Math.min((progress / goal) * 100, 100);
    return (
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
            <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: accentColor }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            />
        </div>
    );
};

/**
 * MissionItem — 단일 미션 카드 행
 */
const MissionItem = ({ mission, index }) => {
    const { id, title, description, icon, points, goal, unit, isStreak, accentColor, progress, completed, completedAt } = mission;

    return (
        <motion.div
            key={id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={`relative p-3 rounded-2xl border transition-all ${
                completed
                    ? 'bg-white/5 border-white/10 opacity-70'
                    : 'bg-gradient-to-br from-[#12161b] to-black border-white/5 shadow-lg'
            }`}
        >
            {/* 완료 배지 */}
            {completed && (
                <div
                    className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
                >
                    <CheckCircle2 size={8} /> DONE
                </div>
            )}

            <div className="flex items-start gap-3">
                {/* 아이콘 */}
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                    style={{
                        backgroundColor: completed ? '#ffffff08' : `${accentColor}15`,
                        borderColor: completed ? 'rgba(255,255,255,0.08)' : `${accentColor}40`,
                        boxShadow: completed ? 'none' : `0 0 12px ${accentColor}30`,
                    }}
                >
                    {icon}
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <p className={`text-[11px] font-black tracking-tight leading-tight ${completed ? 'text-gray-400' : 'text-white'}`}>
                            {title}
                        </p>
                        {isStreak && (
                            <span className="text-[8px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-1 py-0.5 rounded-full leading-none">
                                ★ STREAK
                            </span>
                        )}
                    </div>
                    <p className="text-[9px] text-gray-500 leading-tight mb-1">{description}</p>

                    {/* 진행도 */}
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold" style={{ color: completed ? '#6b7280' : accentColor }}>
                            {completed ? `완료 ✓` : `${progress} / ${goal} ${unit}`}
                        </span>
                        <span className="text-[9px] font-black text-amber-400">+{points.toLocaleString()}P</span>
                    </div>

                    {!completed && (
                        <MissionProgressBar progress={progress} goal={goal} accentColor={accentColor} />
                    )}

                    {completed && completedAt && (
                        <p className="text-[8px] text-gray-600 mt-1">
                            {new Date(completedAt).toLocaleDateString('ko-KR')} 달성
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

/**
 * BeginnerMissionCard
 * ─────────────────────────────────────────────────────────────────────────
 * UserProfileSheet 탭 내부에 삽입되는 초보자 미션 카드 섹션
 *
 * Props:
 *   onReward(missionId, points) — 미션 완료 시 포인트 지급 콜백
 */
const BeginnerMissionCard = ({ onReward }) => {
    const { missions, completedCount, totalPoints } = useBeginnerMissions({ onReward });

    const pending = missions.filter(m => !m.completed);
    const completed = missions.filter(m => m.completed);
    const totalGoalPoints = missions.reduce((s, m) => s + m.points, 0);
    const overallPct = Math.round((completedCount / missions.length) * 100);

    return (
        <div className="space-y-2.5">
            {/* 헤더 & 전체 진행도 */}
            <div className="bg-gradient-to-br from-[#0d1117] to-black p-3 rounded-[1.5rem] border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center border border-amber-500/30">
                            <Trophy size={14} className="text-amber-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none">
                                초보자 미션
                            </p>
                            <p className="text-[8px] text-gray-500 leading-none mt-0.5">
                                완료 {completedCount}/{missions.length} · 획득 {totalPoints.toLocaleString()}P
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black text-amber-400">{overallPct}%</span>
                        <span className="text-[8px] text-gray-600">목표 {totalGoalPoints.toLocaleString()}P</span>
                    </div>
                </div>

                {/* 전체 진행도 바 */}
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${overallPct}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    />
                </div>
            </div>

            {/* 진행 중 미션 */}
            {pending.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest px-1 flex items-center gap-1.5">
                        <Zap size={8} className="text-amber-400" /> 진행 중
                    </p>
                    {pending.map((m, i) => (
                        <MissionItem key={m.id} mission={m} index={i} />
                    ))}
                </div>
            )}

            {/* 완료된 미션 */}
            {completed.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest px-1 flex items-center gap-1.5">
                        <CheckCircle2 size={8} className="text-gray-600" /> 완료됨
                    </p>
                    {completed.map((m, i) => (
                        <MissionItem key={m.id} mission={m} index={i} />
                    ))}
                </div>
            )}

            {/* 전체 완료 상태 */}
            {completedCount === missions.length && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4 bg-amber-500/10 rounded-2xl border border-amber-500/30"
                >
                    <p className="text-2xl mb-1">🏆</p>
                    <p className="text-xs font-black text-amber-400 uppercase tracking-wider">모든 미션 완료!</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">총 {totalPoints.toLocaleString()}P 획득</p>
                </motion.div>
            )}
        </div>
    );
};

export default BeginnerMissionCard;
