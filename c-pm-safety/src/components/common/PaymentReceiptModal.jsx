import React, { useState } from 'react';
import { CreditCard, CheckCircle, Smartphone, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from '../../hooks/useToast';

const PaymentReceiptModal = ({ isOpen, onClose, metrics, pointsUsed = 0, onPaymentComplete }) => {
    const [isPaying, setIsPaying] = useState(false);

    if (!isOpen || !metrics) return null;

    // 모의 과금 로직: 기본요금 1000원 + 분당 150원
    const baseFare = 1000;
    const timeFare = (metrics.time || 1) * 150;
    const totalFare = baseFare + timeFare;

    // 쿠폰/포인트 할인 적용 (예: 100P 사용)
    const finalAmount = Math.max(0, totalFare - pointsUsed);

    const handleMockPayment = () => {
        setIsPaying(true);
        // 포트원(KG이니시스 등) 결제창 호출을 모킹 (2초 지연)
        setTimeout(() => {
            setIsPaying(false);
            toast(`💳 결제 완료 — ${finalAmount.toLocaleString()}원`, 'success');
            if (onPaymentComplete) onPaymentComplete();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[2500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-[#111] w-full max-w-sm rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden relative">

                {/* Header */}
                <div className="bg-cyber-panel p-6 border-b border-white/5 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyber-cyan/10 rounded-full blur-3xl"></div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="bg-cyber-cyan/20 p-2 rounded-xl border border-cyber-cyan/30 text-cyber-cyan">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">전자 영수증</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{metrics.date}</p>
                        </div>
                    </div>
                </div>

                {/* Receipt Details */}
                <div className="p-6 pb-2 border-b border-dashed border-white/10">
                    <div className="space-y-4 font-bold text-sm">
                        <div className="flex justify-between text-gray-400">
                            <span>운행 시간 ({metrics.time}분)</span>
                            <span className="text-white">{timeFare.toLocaleString()} 원</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                            <span>기본 요금</span>
                            <span className="text-white">{baseFare.toLocaleString()} 원</span>
                        </div>
                        {pointsUsed > 0 && (
                            <div className="flex justify-between text-cyber-green">
                                <span className="flex items-center gap-1"><CheckCircle size={14} /> 리워드/포인트 할인</span>
                                <span>- {pointsUsed.toLocaleString()} 원</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Final Total */}
                <div className="p-6 bg-[#0a0c0f]">
                    <div className="flex justify-between items-end mb-6">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">최종 결제 금액</span>
                        <div className="text-right">
                            <span className="text-3xl font-black italic tracking-tighter text-cyber-cyan">{finalAmount.toLocaleString()}</span>
                            <span className="text-sm font-bold text-cyber-cyan ml-1 bg-cyber-cyan/10 px-1 rounded">원</span>
                        </div>
                    </div>

                    <p className="text-[9px] text-gray-500 font-medium mb-4 flex items-center gap-1">
                        <ShieldCheck size={12} className="text-gray-400" /> 위 금액 정보는 포트원(PortOne) 결제 연동 테스트용입니다.
                    </p>

                    <button
                        onClick={handleMockPayment}
                        disabled={isPaying}
                        className="w-full h-14 bg-white text-black font-black text-lg rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                    >
                        {isPaying ? (
                            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Smartphone size={20} />
                                {finalAmount > 0 ? '카드 결제하기' : '포인트로 전액 결제'}
                            </>
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        disabled={isPaying}
                        className="w-full mt-4 text-[11px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                    >
                        나중에 결제
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentReceiptModal;
