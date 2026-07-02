import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap, Shield, ChevronRight } from 'lucide-react';

/**
 * AISafetyCoach
 * ─────────────────────────────────────────────────────────────────────────
 * 주행 후 표시되는 AI 개인화 코칭 카드.
 *
 * 재사용:
 *   - RideSummaryModal onClose 후 App.jsx에서 호출
 *   - finalRideSummary + rideHistory를 props로 수신
 *   - Framer Motion (기존 AnimatePresence 패턴 동일)
 *
 * 설계 원칙:
 *   - 결과는 결정론적 룰 기반 (블랙박스 없음, 모든 인사이트 설명 가능)
 *   - 초보 라이더에게 지지적(supportive) 어조 사용
 *   - 3가지 코칭 포인트 최대 표시 (인지 부하 최소화)
 */
const AISafetyCoach = ({ isOpen, onClose, data }) => {
    const { t } = useTranslation();

    /**
     * generateInsights
     * 주행 데이터를 분석해 개인화 코칭 메시지 생성
     * 완전 결정론적 룰 기반 — 설명 가능, 오버라이드 가능
     */
    const insights = useMemo(() => {
        if (!data) return [];

        const result = [];
        const {
            distance = 0,
            time = 0,
            topSpeed = 0,
            suddenBrakeCount = 0,
            co2Saved = 0,
            history = [],
            helmetOn = false
        } = data;

        const distNum = parseFloat(distance) || 0;
        const speedNum = parseFloat(topSpeed) || 0;
        const historyLen = history?.length || 0;

        // ─── 인사이트 룰 ───────────────────────────────────────────

        // 규칙 1: 급제동 평가
        if (suddenBrakeCount === 0) {
            result.push({
                type: 'positive',
                icon: CheckCircle,
                color: '#40ffdc',
                title: t('ac_brake0_title'),
                message: t('ac_brake0_msg'),
                action: null
            });
        } else if (suddenBrakeCount <= 2) {
            result.push({
                type: 'warning',
                icon: AlertTriangle,
                color: '#f59e0b',
                title: t('ac_brake_low_title', { n: suddenBrakeCount }),
                message: t('ac_brake_low_msg'),
                action: t('ac_brake_low_action')
            });
        } else {
            result.push({
                type: 'danger',
                icon: Zap,
                color: '#ef4444',
                title: t('ac_brake_high_title', { n: suddenBrakeCount }),
                message: t('ac_brake_high_msg'),
                action: t('ac_brake_high_action')
            });
        }

        // 규칙 2: 최고 속도 평가
        if (speedNum > 25) {
            result.push({
                type: 'danger',
                icon: TrendingUp,
                color: '#ef4444',
                title: t('ac_speed_over_title', { s: speedNum }),
                message: t('ac_speed_over_msg'),
                action: null
            });
        } else if (speedNum > 0 && speedNum <= 20) {
            result.push({
                type: 'positive',
                icon: Shield,
                color: '#40ffdc',
                title: t('ac_speed_safe_title'),
                message: t('ac_speed_safe_msg', { s: speedNum }),
                action: null
            });
        }

        // 규칙 3: 헬멧 착용
        if (!helmetOn) {
            result.push({
                type: 'warning',
                icon: Shield,
                color: '#f59e0b',
                title: t('ac_helmet_title'),
                message: t('ac_helmet_msg'),
                action: t('ac_helmet_action')
            });
        }

        // 규칙 4: 주행 거리 성취 메시지
        if (distNum >= 5) {
            result.push({
                type: 'positive',
                icon: TrendingUp,
                color: '#a855f7',
                title: t('ac_dist_title', { d: distNum.toFixed(1) }),
                message: historyLen >= 3
                    ? t('ac_dist_msg_regular')
                    : t('ac_dist_msg_first'),
                action: null
            });
        }

        // 규칙 5: 성장 인사이트 (3회 이상 주행 시)
        if (historyLen >= 3) {
            const recentBrakes = history.slice(0, 3)
                .reduce((acc, r) => acc + (r.suddenBrakeCount || 0), 0) / 3;

            if (suddenBrakeCount < recentBrakes) {
                result.push({
                    type: 'positive',
                    icon: TrendingDown,
                    color: '#22c55e',
                    title: t('ac_growth_title'),
                    message: t('ac_growth_detail'),
                    action: null
                });
            }
        }

        // 최대 3개까지만 표시 (인지 부하 최소화)
        return result.slice(0, 3);
    }, [data, t]);

    // 전체 코칭 점수 (100점 만점)
    const coachScore = useMemo(() => {
        if (!data) return 100;
        let score = 100;
        if (data.suddenBrakeCount > 0) score -= data.suddenBrakeCount * 8;
        if (parseFloat(data.topSpeed) > 25) score -= 20;
        if (!data.helmetOn) score -= 15;
        return Math.max(0, Math.min(100, Math.round(score)));
    }, [data]);

    const scoreColor = coachScore >= 80 ? '#40ffdc' : coachScore >= 60 ? '#f59e0b' : '#ef4444';
    const scoreLabel = coachScore >= 80 ? t('ac_label_safe') : coachScore >= 60 ? t('ac_label_growing') : t('ac_label_caution');

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="ai-coach-backdrop"
                    className="fixed inset-0 z-[3000] flex items-end justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        key="ai-coach-sheet"
                        className="relative w-full max-w-md bg-[#080b10] rounded-t-[2.5rem] border-t border-white/10 overflow-hidden flex flex-col max-h-[88vh] shadow-[0_-20px_60px_rgba(0,0,0,0.9)]"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                    >
                        {/* Drag Handle */}
                        <div className="pt-4 pb-2 flex justify-center cursor-pointer" onClick={onClose}>
                            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-6 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-600/40 to-cyan-600/40 rounded-2xl flex items-center justify-center border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                    <Brain size={20} className="text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white tracking-tighter italic">AI SAFETY COACH</h2>
                                    <p className="text-[10px] font-bold text-purple-400/70 tracking-widest uppercase">Post-Ride Analysis</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Score Card */}
                        <div className="mx-5 mb-4 p-5 rounded-[1.5rem] bg-gradient-to-br from-[#12161b] to-black border border-white/5 flex items-center gap-5">
                            {/* Circular Score */}
                            <div className="relative shrink-0">
                                <svg width="80" height="80" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="#1a1f26" strokeWidth="8" />
                                    <circle
                                        cx="40" cy="40" r="34"
                                        fill="none"
                                        stroke={scoreColor}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 34}`}
                                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - coachScore / 100)}`}
                                        transform="rotate(-90 40 40)"
                                        style={{ filter: `drop-shadow(0 0 6px ${scoreColor}80)` }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-black text-white leading-none">{coachScore}</span>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase">{t('ac_score_unit')}</span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t('ac_overall')}</p>
                                <p className="text-lg font-black tracking-tighter" style={{ color: scoreColor }}>{scoreLabel}</p>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                    {coachScore >= 80
                                        ? t('ac_summary_high')
                                        : coachScore >= 60
                                        ? t('ac_summary_mid')
                                        : t('ac_summary_low')}
                                </p>
                            </div>
                        </div>

                        {/* Insights List */}
                        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3 scrollbar-hide">
                            {insights.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 text-sm">
                                    {t('ac_analyzing')}
                                </div>
                            ) : (
                                insights.map((insight, i) => {
                                    const Icon = insight.icon;
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.12 }}
                                            className="bg-[#0f1318] rounded-[1.5rem] p-4 border border-white/5 flex gap-4 items-start"
                                            style={{ borderLeftColor: insight.color + '40', borderLeftWidth: 3 }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                                                style={{ backgroundColor: insight.color + '15' }}
                                            >
                                                <Icon size={18} style={{ color: insight.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-white mb-1 leading-tight">{insight.title}</p>
                                                <p className="text-[11px] text-gray-400 leading-relaxed mb-2">{insight.message}</p>
                                                {insight.action && (
                                                    <button className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider" style={{ color: insight.color }}>
                                                        {insight.action}
                                                        <ChevronRight size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}

                            {/* Growth Message */}
                            <div className="text-center pt-4 pb-2">
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                                    {t('ac_growth_msg')}
                                </p>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="px-5 pb-8 pt-2">
                            <button
                                onClick={onClose}
                                className="w-full h-14 rounded-2xl font-black text-black text-sm tracking-tight flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
                                style={{
                                    background: `linear-gradient(135deg, ${scoreColor}, #a855f7)`,
                                    boxShadow: `0 0 20px ${scoreColor}30`
                                }}
                            >
                                <Brain size={18} />
                                {t('ac_cta')}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AISafetyCoach;
