import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Zap, X } from 'lucide-react';

const StationUnlockScreen = ({ onClose, onUnlockComplete }) => {
  // 상태 관리
  const [progress, setProgress] = useState(96); // 초기 살균 진행률
  const [isNear, setIsNear] = useState(false);  // 사용자 접근 여부 (BLE 연동 가정)
  const [isUnlocked, setIsUnlocked] = useState(false);

  // 살균 진행률 시뮬레이션 (99%까지 점진적 증가)
  useEffect(() => {
    if (progress < 99) {
      const timer = setTimeout(() => setProgress(progress + 1), 1500);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  // 접근(isNear) 시 부드러운 잠금 해제 트랜지션 처리
  useEffect(() => {
    if (isNear) {
      const unlockTimer = setTimeout(() => {
        setIsUnlocked(true);
        // 1.5초 후 자동으로 완료 처리 및 콜백 호출 (실제 앱 로직)
        setTimeout(() => {
          if (onUnlockComplete) onUnlockComplete();
        }, 1500);
      }, 800);
      return () => clearTimeout(unlockTimer);
    } else {
      setIsUnlocked(false);
    }
  }, [isNear, onUnlockComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#121212]/95 backdrop-blur-xl text-slate-200 font-sans transition-colors duration-500">
      
      {/* 닫기 버튼 */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
      >
        <X size={24} />
      </button>

      {/* 상단: 스테이션 정보 */}
      <div className="absolute top-16 text-center text-slate-500 text-sm tracking-widest uppercase">
        Plasma Sterilization Station
      </div>

      {/* 중앙: 스테이션 번호 및 살균 상태 */}
      <div className="flex flex-col items-center space-y-6">
        <h1 className="text-6xl font-light tracking-tighter text-white">
          STATION 04
        </h1>
        
        {/* 프로그레스 및 상태 텍스트 */}
        <div className="flex items-center space-x-2 text-slate-400">
          <Zap size={18} className={`${progress < 99 ? 'animate-pulse text-blue-400' : 'text-slate-500'}`} />
          <span className="text-xl font-light">
            {progress}% Purified
          </span>
        </div>
      </div>

      {/* 하단: 언락 인터랙션 영역 */}
      <div className="absolute bottom-32 flex flex-col items-center space-y-4">
        <div 
          className={`flex items-center justify-center w-24 h-24 rounded-full border border-slate-700 transition-all duration-700 ease-in-out ${
            isUnlocked ? 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.4)] scale-110' : 'bg-transparent'
          }`}
        >
          {isUnlocked ? (
            <Unlock size={40} className="text-[#121212]" />
          ) : (
            <Lock size={40} className="text-slate-400" />
          )}
        </div>
        
        <p className={`text-sm tracking-widest uppercase transition-opacity duration-500 ${
          isUnlocked ? 'text-white' : 'text-slate-500'
        }`}>
          {isUnlocked ? 'Unlocked & Ready' : 'Awaiting Approach'}
        </p>
      </div>

      {/* 테스트용 시뮬레이션 버튼 (실제 앱에서는 BLE 인식 로직으로 대체) */}
      <div className="absolute bottom-8 w-full px-8">
        <button 
          onClick={() => setIsNear(!isNear)}
          className="w-full py-4 bg-slate-800/50 text-slate-300 text-sm font-bold rounded-2xl border border-slate-700/50 hover:bg-slate-700 transition-all active:scale-95"
        >
          {isNear ? '멀어짐 시뮬레이션 (BLE 연결 끊김)' : '1m 이내 접근 (BLE 인식 시뮬레이션)'}
        </button>
      </div>

    </div>
  );
};

export default StationUnlockScreen;
