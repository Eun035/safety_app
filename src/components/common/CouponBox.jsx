import React from 'react';
import { Ticket, X, CheckCircle } from 'lucide-react';

const CouponBox = ({ isOpen, onClose, coupons, setCoupons }) => {
    if (!isOpen) return null;

    const handleUseCoupon = (id) => {
        const isConfirmed = window.confirm("사장님(직원) 확인을 받으셨습니까? 사용 처리 후에는 되돌릴 수 없습니다.");
        if (isConfirmed) {
            const updatedCoupons = coupons.map(c =>
                c.id === id ? { ...c, status: 'used' } : c
            );
            setCoupons(updatedCoupons);
            alert("쿠폰이 사용 처리되었습니다.");
        }
    };

    return (
        <div className="fixed inset-0 z-[900] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-cyber-panel border border-white/10 rounded-[2rem] shadow-glass flex flex-col max-h-[80vh] overflow-hidden">

                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-cyber-cyan/10 to-transparent relative">
                    <div className="flex items-center gap-3 relative z-10">
                        <Ticket size={24} className="text-cyber-cyan drop-shadow-[0_0_10px_rgba(64,255,220,0.8)]" />
                        <h2 className="text-xl font-black text-white tracking-widest uppercase">천안사랑카드 적립 내역</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white relative z-10">
                        <X size={24} />
                    </button>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
                    {coupons.length === 0 ? (
                        <div className="text-center text-gray-500 py-10 font-bold">
                            적립된 포인트 내역이 없어요.<br /><span className="text-cyber-cyan">헬멧 스테이션</span>을 이용해 혜택을 받아보세요!
                        </div>
                    ) : (
                        coupons.map(coupon => {
                            const isActive = coupon.status === 'active';
                            return (
                                <div
                                    key={coupon.id}
                                    className={`relative p-5 rounded-2xl border transition-all ${isActive ? 'bg-black/40 border-cyber-cyan/30 shadow-[0_0_15px_rgba(64,255,220,0.1)]' : 'bg-gray-900 border-gray-800 grayscale opacity-60'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className={`text-lg font-black tracking-tight ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                                {coupon.shopName}
                                            </h3>
                                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">
                                                적립일: {coupon.issuedAt} | 구분: {coupon.type}
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${isActive ? 'bg-cyber-cyan text-black shadow-neon-cyan' : 'bg-gray-800 text-gray-500'}`}>
                                            {coupon.amount}
                                        </div>
                                    </div>

                                    {isActive ? (
                                        <button
                                            onClick={() => handleUseCoupon(coupon.id)}
                                            className="w-full py-3 bg-cyber-panel hover:bg-white/10 text-white font-black tracking-widest rounded-xl border border-white/10 transition-colors shadow-glass active:scale-95"
                                        >
                                            지역화폐로 전환하기
                                        </button>
                                    ) : (
                                        <div className="w-full py-3 bg-gray-800 text-gray-500 font-bold rounded-xl flex items-center justify-center gap-2">
                                            <CheckCircle size={18} /> 전환 완료
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default CouponBox;
