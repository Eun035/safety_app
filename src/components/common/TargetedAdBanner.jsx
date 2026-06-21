import React from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';

const TargetedAdBanner = ({ suddenBrakeCount = 0 }) => {
    // 맥락에 따른 조건부 렌더링
    const isAggressiveRider = suddenBrakeCount >= 2;

    const adContent = isAggressiveRider
        ? {
            title: "보호구 특가 할인 기전",
            desc: "안전이 우선! 프리미엄 헬멧 20% OFF",
            bgColor: "from-red-900/50 to-[#12161b]",
            borderColor: "border-red-500/30",
            icon: <ShieldAlert size={28} className="text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]" />,
            buttonBg: "bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/40"
        }
        : {
            title: "에코 라이더 전용 굿즈",
            desc: "안전 주행 리워드로 친환경 텀블러 교환",
            bgColor: "from-cyber-cyan/20 to-[#12161b]",
            borderColor: "border-cyber-cyan/30",
            icon: <Sparkles size={28} className="text-cyber-cyan drop-shadow-[0_0_10px_rgba(64,255,220,0.5)]" />,
            buttonBg: "bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/50 hover:bg-cyber-cyan/40"
        };


    return (
        <div className={`mt-6 w-full rounded-2xl p-4 border flex items-center justify-between relative overflow-hidden bg-gradient-to-r ${adContent.bgColor} ${adContent.borderColor}`}>
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="flex items-center gap-4 z-10">
                <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                    {adContent.icon}
                </div>
                <div>
                    <h4 className="text-white font-black text-sm mb-0.5">{adContent.title}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">{adContent.desc}</p>
                </div>
            </div>

            <button className={`z-10 px-3 py-1.5 rounded-lg text-xs font-black border transition-colors shrink-0 shadow-lg ${adContent.buttonBg}`}>
                포인트 교환
            </button>
        </div>
    );
};

export default TargetedAdBanner;
