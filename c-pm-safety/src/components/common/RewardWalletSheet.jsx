import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Wallet, Ticket, CheckCircle, Gift, ArrowRightLeft, Sparkles } from 'lucide-react';

const RewardWalletSheet = ({ isOpen, onClose, userPoints, coupons, setCoupons }) => {
    const { t } = useTranslation();

    const handleUseCoupon = (id) => {
        const isConfirmed = window.confirm("지역화폐로 전환하시겠습니까? 전환 후에는 취소할 수 없습니다.");
        if (isConfirmed) {
            const updatedCoupons = coupons.map(c =>
                c.id === id ? { ...c, status: 'used' } : c
            );
            setCoupons(updatedCoupons);
        }
    };

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
                            className="pointer-events-auto w-full max-w-md bg-[#0a0c0f] rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] border-t border-amber-500/40 overflow-hidden flex flex-col max-h-[92vh]"
                        >
                            {/* Drag Handle */}
                            <div
                                onClick={onClose}
                                className="w-full pt-4 pb-2 flex justify-center cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                            >
                                <div className="w-12 h-1.5 bg-amber-500/20 rounded-full opacity-60 pointer-events-none" />
                            </div>

                            {/* Header */}
                            <div className="px-6 pb-4 pt-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles size={14} className="text-amber-400" />
                                    <h2 className="text-[22px] font-black italic tracking-tighter text-white uppercase leading-none">
                                        REWARD WALLET
                                    </h2>
                                </div>
                                <p className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">
                                    나의 자산 및 혜택 관리
                                </p>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5 scrollbar-hide">
                                
                                {/* === Section 1: Balance Header === */}
                                <div className="bg-gradient-to-br from-[#1a160d] to-[#0a0c0f] p-5 rounded-[2rem] border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.08)] relative overflow-hidden">
                                    <div className="relative z-10">
                                        <p className="text-[11px] font-black text-amber-500/60 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <Wallet size={12} /> CURRENT BALANCE
                                        </p>
                                        <motion.div 
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="flex items-baseline gap-2"
                                        >
                                            <span className="text-5xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] tracking-tighter">
                                                {userPoints.toLocaleString()}
                                            </span>
                                            <span className="text-xl font-black text-amber-500/70">PTS</span>
                                        </motion.div>
                                    </div>
                                    {/* Ornamental glow */}
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                                </div>

                                {/* === Section 2: Coupon/Activity List === */}
                                <div>
                                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                                        <Ticket size={13} className="text-amber-500" /> 천안사랑카드 적립 및 쿠폰
                                    </p>

                                    <div className="space-y-3">
                                        {coupons.length === 0 ? (
                                            <div className="text-center py-12 bg-white/3 rounded-[2rem] border border-white/5">
                                                <p className="text-sm font-bold text-gray-500">적립된 내역이 없습니다</p>
                                                <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-wide">라이딩을 통해 포인트를 모아보세요!</p>
                                            </div>
                                        ) : (
                                            coupons.map((coupon, idx) => {
                                                const isActive = coupon.status === 'active';
                                                return (
                                                    <motion.div
                                                        key={coupon.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className={`relative p-5 rounded-[1.8rem] border transition-all ${
                                                            isActive 
                                                            ? 'bg-gradient-to-br from-[#12161b] to-black border-amber-500/20 shadow-lg' 
                                                            : 'bg-black/20 border-white/5 opacity-50'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="min-w-0">
                                                                <h3 className={`text-base font-black truncate ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                                                    {coupon.shopName}
                                                                </h3>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{coupon.issuedAt}</span>
                                                                    <span className="w-0.5 h-0.5 bg-gray-700 rounded-full" />
                                                                    <span className="text-[9px] text-amber-600 font-bold uppercase tracking-widest">{coupon.type}</span>
                                                                </div>
                                                            </div>
                                                            <div className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-tight ${isActive ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-gray-800 text-gray-500'}`}>
                                                                {coupon.amount}
                                                            </div>
                                                        </div>

                                                        {isActive ? (
                                                            <button
                                                                onClick={() => handleUseCoupon(coupon.id)}
                                                                className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-black text-[11px] tracking-[0.1em] rounded-xl border border-amber-500/30 transition-all flex items-center justify-center gap-2 group"
                                                            >
                                                                <ArrowRightLeft size={14} className="transition-transform group-hover:rotate-180" />
                                                                지역화폐로 전환하기
                                                            </button>
                                                        ) : (
                                                            <div className="w-full py-3 bg-gray-900/50 text-gray-600 font-black text-[11px] rounded-xl flex items-center justify-center gap-2 border border-white/5 uppercase">
                                                                <CheckCircle size={14} /> 전환 완료
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* === Section 3: Promotional Banner === */}
                                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                        <Gift size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-white">친구 초대하고 5,000P 받기</p>
                                        <p className="text-[9px] text-white/60 mt-0.5 uppercase tracking-widest">초대한 친구가 첫 주행 완료 시 지급</p>
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

export default RewardWalletSheet;
