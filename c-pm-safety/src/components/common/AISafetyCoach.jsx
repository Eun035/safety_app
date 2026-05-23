import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
                title: '완벽한 제동 컨트롤!',
                message: '이번 주행에서 급제동이 전혀 없었습니다. 앞차와의 거리 유지 습관이 탁월합니다.',
                action: null
            });
        } else if (suddenBrakeCount <= 2) {
            result.push({
                type: 'warning',
                icon: AlertTriangle,
                color: '#f59e0b',
                title: `급제동 ${suddenBrakeCount}회 감지`,
                message: '급제동은 배터리 수명과 타이어 마모를 줄이고 뒤차 충돌 위험을 높입니다. 3~4초 앞을 미리 보는 습관을 길러보세요.',
                action: '안전 거리 유지 가이드 보기'
            });
        } else {
            result.push({
                type: 'danger',
                icon: Zap,
                color: '#ef4444',
                title: `급제동 ${suddenBrakeCount}회 — 주의 필요`,
                message: '급제동이 반복되면 사고 위험이 크게 높아집니다. 속도를 낮추고 교차로 진입 전 미리 감속하는 연습을 권장합니다.',
                action: '이번 주 급제동 패턴 분석'
            });
        }

        // 규칙 2: 최고 속도 평가
        if (speedNum > 25) {
            result.push({
                type: 'danger',
                icon: TrendingUp,
                color: '#ef4444',
                title: `최고 속도 ${speedNum}km/h — 법적 한도 초과`,
                message: '전동킥보드 법정 최고 속도는 25km/h입니다. 과속은 면허정지 및 과태료 대상입니다. 안전을 위해 속도를 유지해 주세요.',
                action: null
            });
        } else if (speedNum > 0 && speedNum <= 20) {
            result.push({
                type: 'positive',
                icon: Shield,
                color: '#40ffdc',
                title: '안전 속도 유지 완료',
                message: `최고 속도 ${speedNum}km/h — 권장 속도 범위를 완벽히 지켰습니다. 이 속도면 제동 거리도 짧고 보행자 위험도 낮습니다.`,
                action: null
            });
        }

        // 규칙 3: 헬멧 착용
        if (!helmetOn) {
            result.push({
                type: 'warning',
                icon: Shield,
                color: '#f59e0b',
                title: '헬멧 미착용 감지',
                message: '이번 주행에서 헬멧 착용이 확인되지 않았습니다. 두부 외상 위험을 80% 줄이는 가장 쉬운 방법은 헬멧 착용입니다.',
                action: '헬멧 착용 인증하고 100P 받기'
            });
        }

        // 규칙 4: 주행 거리 성취 메시지
        if (distNum >= 5) {
            result.push({
                type: 'positive',
                icon: TrendingUp,
                color: '#a855f7',
                title: `${distNum.toFixed(1)}km 달성!`,
                message: historyLen >= 3
                    ? `꾸준히 주행하고 있습니다! 누적 경험이 쌓일수록 안전 반응 속도가 향상됩니다.`
                    : `첫 번째 주행부터 좋은 거리를 달성했습니다. 앞으로 더 많은 안전 포인트가 기다립니다!`,
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
                    title: '급제동 감소 추세 감지!',
                    message: `최근 3회 주행 평균보다 급제동이 줄었습니다. 당신의 운전 습관이 개선되고 있습니다. 계속 유지하세요!`,
                    action: null
                });
            }
        }

        // 최대 3개까지만 표시 (인지 부하 최소화)
        return result.slice(0, 3);
    }, [data]);

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
    const scoreLabel = coachScore >= 80 ? '안전 라이더' : coachScore >= 60 ? '성장 중' : '주의 필요';

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
                                    <span className="text-[8px] font-bold text-gray-400 uppercase">점</span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">이번 주행 종합 평가</p>
                                <p className="text-lg font-black tracking-tighter" style={{ color: scoreColor }}>{scoreLabel}</p>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                    {coachScore >= 80
                                        ? '훌륭합니다! 안전 습관이 완전히 자리잡고 있습니다.'
                                        : coachScore >= 60
                                        ? '좋은 방향으로 가고 있습니다. 조금만 더 개선해봐요!'
                                        : '이번 주행은 위험 요소가 있었습니다. 아래 가이드를 확인하세요.'}
                                </p>
                            </div>
                        </div>

                        {/* Insights List */}
                        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3 scrollbar-hide">
                            {insights.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 text-sm">
                                    주행 데이터를 분석 중입니다...
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
                                    C-SAFE는 매 주행마다 당신의 성장을 기억합니다
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
                                코칭 완료 — 다음 주행 준비됨
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AISafetyCoach;
