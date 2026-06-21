import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Volume2, Vibrate, X, Sparkles } from 'lucide-react';

/**
 * 추천 링크(/r/CODE) 진입 사용자에게 1회 노출되는 환영 화면.
 * - sessionStorage에 pending referral이 있고, 본 modal을 아직 안 본 상태에서만 표시
 * - "30초 시연" 버튼 → 음성 L1·L3·L4 + 햅틱 4단계를 빠르게 체험
 * - 첫 라이딩 시 양방향 +500P 안내
 */
const SHOWN_KEY = 'csafe_referral_welcome_shown_v1';

const ReferralWelcomeModal = ({ pendingReferral, speak, vibrate, onClose }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [demoStep, setDemoStep] = useState(null); // null | 'L1' | 'L3' | 'L4' | 'done'

    useEffect(() => {
        if (!pendingReferral?.code) return;
        if (typeof window === 'undefined') return;
        if (sessionStorage.getItem(SHOWN_KEY) === '1') return;
        setIsOpen(true);
    }, [pendingReferral?.code]);

    const close = () => {
        try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch (e) { /* noop */ }
        setIsOpen(false);
        onClose?.();
    };

    // 30초 시연 시퀀스 — L1 → L3 → L4 (총 7초)
    const runDemo = async () => {
        if (!speak && !vibrate) return;
        const wait = (ms) => new Promise(r => setTimeout(r, ms));

        setDemoStep('L1');
        speak?.('전방 보호구역, 시속 10km 권장.', 'L1');
        vibrate?.('L1');
        await wait(2500);

        setDemoStep('L3');
        speak?.('감속! 보호구역 진입.', 'L3');
        vibrate?.('L3');
        await wait(2500);

        setDemoStep('L4');
        speak?.('속도 위반! 즉시 감속!', 'L4');
        vibrate?.('L4');
        await wait(2000);

        setDemoStep('done');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[400] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="w-full max-w-md bg-cyber-panel border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                    >
                        {/* 헤더 */}
                        <div className="relative p-6 pb-5 border-b border-white/5">
                            <button onClick={close} className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/10 text-gray-400" title="닫기">
                                <X size={18} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center shadow-[0_0_20px_rgba(64,255,220,0.25)]">
                                    <Gift size={26} className="text-cyber-cyan" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white tracking-tight">친구 추천으로 오셨네요</h2>
                                    <p className="text-[11px] text-cyber-cyan font-bold mt-0.5">추천 코드 {pendingReferral?.code}</p>
                                </div>
                            </div>
                        </div>

                        {/* 보상 안내 */}
                        <div className="px-6 pt-5 pb-3">
                            <div className="bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-2xl p-4 flex items-start gap-3 mb-4">
                                <Sparkles size={20} className="text-cyber-cyan shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs font-black text-white mb-1">첫 라이딩 완료 시 +500P</div>
                                    <div className="text-[11px] text-gray-300 font-medium leading-relaxed">
                                        친구와 본인 양쪽 모두에게 자동 적립됩니다.<br/>
                                        헬멧 인증·합법 주차 시 추가 적립.
                                    </div>
                                </div>
                            </div>

                            {/* 시연 박스 */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <div className="text-[11px] font-black text-gray-300 uppercase tracking-widest mb-2.5">
                                    7초 안전 코치 시연
                                </div>
                                <div className="flex gap-2 mb-3">
                                    {[
                                        { id: 'L1', label: 'L1 사전 예고', color: 'text-yellow-300', bg: 'bg-yellow-500/15 border-yellow-500/30' },
                                        { id: 'L3', label: 'L3 진입',     color: 'text-orange-300', bg: 'bg-orange-500/15 border-orange-500/30' },
                                        { id: 'L4', label: 'L4 위반',     color: 'text-red-300',    bg: 'bg-red-500/15 border-red-500/30' }
                                    ].map(stage => {
                                        const active = demoStep === stage.id;
                                        return (
                                            <div
                                                key={stage.id}
                                                className={`flex-1 py-2 rounded-xl text-[9px] font-black text-center border transition-all ${
                                                    active ? `${stage.bg} ${stage.color} scale-105 shadow-lg` : 'bg-white/5 text-gray-500 border-white/5'
                                                }`}
                                            >
                                                {stage.label}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400 font-bold">
                                    <span className="flex items-center gap-1.5"><Volume2 size={12} /> 외부 스피커 음성</span>
                                    <span className="flex items-center gap-1.5"><Vibrate size={12} /> 패턴 햅틱</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={runDemo}
                                    disabled={demoStep && demoStep !== 'done'}
                                    className="mt-3 w-full py-2.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 active:scale-95 text-cyber-cyan font-black text-xs transition disabled:opacity-50"
                                >
                                    {demoStep === 'done' ? '✓ 시연 완료 — 다시 보기' : demoStep ? '시연 진행 중...' : '▶ 시연 시작'}
                                </button>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="p-5 pt-2 flex gap-2">
                            <button
                                type="button"
                                onClick={close}
                                className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/10 active:scale-95 transition"
                            >
                                나중에
                            </button>
                            <button
                                type="button"
                                onClick={close}
                                className="flex-[2] py-3.5 rounded-2xl bg-cyber-cyan text-black font-black text-xs uppercase tracking-wider shadow-neon-cyan hover:opacity-90 active:scale-95 transition"
                            >
                                지금 시작
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ReferralWelcomeModal;
