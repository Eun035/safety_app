import React from 'react';
import { X, Bike, Zap, Check } from 'lucide-react';

const VehicleSelectModal = ({ isOpen, onClose, isBicycleMode, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-black/90 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300 shadow-neon-cyan border border-white/10">
        
        {/* Decorative background glows */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyber-cyan/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>

        {/* Modal Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between relative z-10">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">이동 수단 선택</h2>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">안전 주행 모니터링을 위해 수단을 선택해 주세요</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 relative z-10">
          
          {/* Options Wrapper */}
          <div className="flex flex-col gap-4">
            
            {/* Option 1: PM (Kickboard) */}
            <button
              onClick={() => onSelect(false)}
              className={`p-5 rounded-2xl border transition-all flex items-center gap-4 text-left relative ${
                !isBicycleMode 
                  ? 'bg-cyber-cyan/10 border-cyber-cyan shadow-[0_0_20px_rgba(6,182,212,0.15)] text-white' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                !isBicycleMode ? 'bg-cyber-cyan text-black' : 'bg-white/10 text-gray-300'
              }`}>
                <Zap size={24} className={!isBicycleMode ? 'fill-black' : ''} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${!isBicycleMode ? 'text-cyber-cyan' : 'text-white'}`}>전동 킥보드 (PM)</span>
                  {!isBicycleMode && (
                    <span className="text-[8px] bg-cyber-cyan/20 text-cyber-cyan px-1.5 py-0.5 rounded font-black">ACTIVE</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 font-bold mt-1 leading-normal">
                  최고 속도 20km/h 제한 및 안전 속도 초과 시 안내 경고음이 송출됩니다.
                </p>
              </div>
              {!isBicycleMode && (
                <div className="w-5 h-5 rounded-full bg-cyber-cyan flex items-center justify-center text-black shrink-0">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </button>

            {/* Option 2: Bicycle */}
            <button
              onClick={() => onSelect(true)}
              className={`p-5 rounded-2xl border transition-all flex items-center gap-4 text-left relative ${
                isBicycleMode 
                  ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-white' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isBicycleMode ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-300'
              }`}>
                <Bike size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${isBicycleMode ? 'text-emerald-400' : 'text-white'}`}>전기/일반 자전거</span>
                  {isBicycleMode && (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black">ACTIVE</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 font-bold mt-1 leading-normal">
                  도로교통법 규정 준수를 위해 자전거 탑승 시 초과속도 경고음이 자동으로 해제됩니다.
                </p>
              </div>
              {isBicycleMode && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </button>

          </div>

          {/* Confirm Button */}
          <button 
            onClick={() => onSelect(isBicycleMode)}
            className="w-full h-14 bg-white text-black rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl text-xs flex items-center justify-center gap-2"
          >
            선택 완료 & 주행 시작
          </button>

        </div>
      </div>
    </div>
  );
};

export default VehicleSelectModal;
