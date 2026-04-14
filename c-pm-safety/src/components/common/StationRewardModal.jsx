import React from 'react';
import { Award, CheckCircle, Ticket } from 'lucide-react';

const StationRewardModal = ({ isOpen, onClose, onNext, points = 100, partner = "단국대 앞 하이카페" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-cyber-panel w-full max-w-sm rounded-[2rem] shadow-neon-green border border-cyber-green/50 overflow-hidden relative text-center flex flex-col items-center pt-10 pb-8 px-6">

                {/* Background Glow */}
                <div className="absolute top-0 w-40 h-40 bg-cyber-green/20 rounded-full blur-[50px] -z-10" />

                {/* Header Icon */}
                <div className="w-20 h-20 bg-cyber-green/20 border-2 border-cyber-green rounded-full shadow-neon-green flex items-center justify-center mb-6">
                    <CheckCircle size={40} className="text-cyber-green" />
                </div>

                <h2 className="text-2xl font-black text-white mb-2 tracking-tighter">주차 및 반납 완료</h2>
                <p className="text-gray-400 text-sm mb-6">성공적으로 기기를 반납하셨습니다.</p>

                {/* Points Card */}
                <div className="w-full bg-[#12161b] border border-cyber-cyan/30 rounded-2xl p-4 mb-4 flex items-center justify-between shadow-lg">
                    <div className="text-left">
                        <p className="text-xs font-bold text-cyber-cyan mb-1">천안사랑카드 연계</p>
                        <p className="text-white font-black text-lg">에코 마일리지 적립</p>
                    </div>
                    <div className="flex items-center gap-1 bg-cyber-cyan/10 px-3 py-1.5 rounded-full border border-cyber-cyan/20">
                        <Award size={16} className="text-cyber-cyan" />
                        <span className="text-cyber-cyan font-black">+{points}P</span>
                    </div>
                </div>

                {/* Local Partner Coupon */}
                <div className="w-full bg-gradient-to-r from-purple-900/40 to-[#12161b] border border-purple-500/30 rounded-2xl p-4 mb-8 flex items-center justify-between relative overflow-hidden shadow-lg shadow-purple-900/20">
                    <Ticket className="absolute -right-4 -bottom-4 w-24 h-24 text-purple-500/10" />
                    <div className="text-left relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">제휴 상점 혜택</p>
                        <p className="text-white font-black">{partner} 10% 쿠폰</p>
                    </div>
                    <button className="relative z-10 px-4 py-2 bg-purple-500/20 text-purple-300 font-bold text-sm rounded-xl border border-purple-500/50 hover:bg-purple-500/40 transition-colors">
                        다운로드
                    </button>
                </div>

                {/* Actions */}
                <button
                    onClick={() => {
                        onClose();
                        if (onNext) onNext();
                    }}
                    className="w-full h-14 bg-cyber-green text-black rounded-2xl font-black text-lg shadow-neon-green active:scale-95 transition-transform"
                >
                    포인트 수령 및 요약 확인
                </button>
            </div>
        </div>
    );
};

export default StationRewardModal;
