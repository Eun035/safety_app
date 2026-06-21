import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeadphoneOff, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * 🎧 라이딩 시작 직전 게이트 — 이어폰 미착용 자가 확인.
 *
 * 안전 정책상 PM 주행 중 이어폰·헤드폰 착용을 금지한다 (외부 위험 신호 차단·집중도 저하).
 * 외부 스피커·햅틱 채널로만 안내가 발화되므로, 사용자가 이를 인지하고 동의해야 주행 시작.
 *
 * isOpen이 true가 되면 닫을 수 없고(취소 = 라이딩 미시작), 체크박스 후 시작 버튼만 활성화.
 */
const EarphoneConfirmGate = ({ isOpen, onConfirm, onCancel }) => {
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (isOpen) setChecked(false); // 매 열림마다 초기화
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="w-full max-w-md bg-cyber-panel border-t border-white/10 rounded-t-[2rem] shadow-2xl"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                    >
                        <div className="p-6 pb-7 flex flex-col gap-5">

                            {/* 헤더 아이콘 */}
                            <div className="flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.25)]">
                                    <HeadphoneOff size={28} className="text-red-400" />
                                </div>
                            </div>

                            {/* 타이틀 */}
                            <div className="text-center">
                                <h2 className="text-lg font-black text-white tracking-tight mb-1.5">
                                    이어폰을 빼주세요
                                </h2>
                                <p className="text-xs text-gray-300 font-bold leading-relaxed">
                                    주행 중 이어폰 착용은 자동차 경적·주변 차량 접근음 등<br/>
                                    <span className="text-red-300">외부 위험 신호를 차단</span>해 사고 위험을 높입니다.
                                </p>
                            </div>

                            {/* 안내 박스 */}
                            <div className="bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-2xl p-4 space-y-2.5">
                                <div className="flex items-start gap-2.5">
                                    <ShieldCheck size={16} className="text-cyber-cyan shrink-0 mt-0.5" />
                                    <div className="text-[11px] text-gray-200 font-medium leading-relaxed">
                                        안전 안내는 <span className="font-black text-cyber-cyan">외부 스피커·진동</span>으로 전달됩니다.
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <AlertTriangle size={16} className="text-orange-300 shrink-0 mt-0.5" />
                                    <div className="text-[11px] text-gray-200 font-medium leading-relaxed">
                                        이어폰·헤드폰 착용 상태로 시작 시 사고 책임은 본인에게 있습니다.
                                    </div>
                                </div>
                            </div>

                            {/* 자가 확인 체크박스 */}
                            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition active:scale-[0.99]">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => setChecked(e.target.checked)}
                                    className="w-5 h-5 accent-cyber-cyan cursor-pointer shrink-0"
                                />
                                <span className="text-[12px] font-black text-white leading-snug">
                                    이어폰을 착용하지 않은 상태이며,<br/>외부 소리를 들을 수 있는 환경입니다.
                                </span>
                            </label>

                            {/* 버튼 */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex-1 py-3.5 rounded-2xl bg-white/5 text-gray-300 font-bold text-xs border border-white/10 hover:bg-white/10 transition active:scale-95"
                                >
                                    취소
                                </button>
                                <button
                                    type="button"
                                    disabled={!checked}
                                    onClick={onConfirm}
                                    className={`flex-[2] py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition active:scale-95 ${
                                        checked
                                            ? 'bg-cyber-cyan text-black shadow-neon-cyan hover:opacity-90'
                                            : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
                                    }`}
                                >
                                    주행 시작
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EarphoneConfirmGate;
