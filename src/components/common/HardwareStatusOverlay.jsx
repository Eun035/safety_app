import React, { useState, useEffect } from 'react';
import { Bluetooth, Lock, Unlock, CheckCircle2 } from 'lucide-react';

const HardwareStatusOverlay = ({ isSyncing, isRiding }) => {
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState('');

  useEffect(() => {
    if (!isSyncing) {
      setProgress(0);
      return;
    }

    // 1.5초(1500ms) 동안 progress가 0에서 100까지 부드럽게 증가
    const duration = 1500;
    const intervalTime = 20; 
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isSyncing]);

  useEffect(() => {
    if (progress < 25) {
      setStepText(isRiding ? "Searching BLE Node..." : "Connecting Smart Station...");
    } else if (progress < 60) {
      setStepText("Handshaking Cryptographic Key...");
    } else if (progress < 90) {
      setStepText(isRiding ? "Applying Active Brake Lock..." : "Releasing Wheel Clamps...");
    } else {
      setStepText("Hardware Authorization Complete!");
    }
  }, [progress, isRiding]);

  if (!isSyncing) return null;

  // 원형 게이지의 stroke-dashoffset 계산
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-300 pointer-events-auto">
      <div className="bg-cyber-panel/90 border-2 border-cyber-cyan/50 p-10 rounded-[3rem] w-[320px] flex flex-col items-center gap-6 shadow-[0_0_35px_rgba(64,255,220,0.3)] animate-in zoom-in duration-300">
        
        {/* Circular Progress Gauge */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            {/* Background Circle */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              className="stroke-white/5 fill-none"
              strokeWidth="6"
            />
            {/* Foreground Progress */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              className="stroke-cyber-cyan fill-none transition-all duration-75 ease-linear"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Inner Icon Indicator */}
          <div className="relative z-10 w-20 h-20 rounded-full bg-black/40 flex items-center justify-center border border-white/10 shadow-inner">
            {progress >= 100 ? (
              <CheckCircle2 size={36} className="text-cyber-green animate-bounce" />
            ) : isRiding ? (
              <Lock size={36} className="text-cyber-cyan animate-pulse" />
            ) : (
              <Unlock size={36} className="text-cyber-cyan animate-pulse" />
            )}
          </div>
        </div>

        {/* Status Text Info */}
        <div className="text-center w-full">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Bluetooth size={14} className="text-blue-400 animate-pulse" />
            <span className="text-[10px] font-black text-cyber-cyan uppercase tracking-[0.3em] font-mono">
              IoT LINKING - {Math.round(progress)}%
            </span>
          </div>
          <h3 className="text-lg font-black italic text-white tracking-tight uppercase min-h-[28px] flex items-center justify-center">
            {isRiding ? "LOCKING VEHICLE..." : "UNLOCKING VEHICLE..."}
          </h3>
          <p className="text-[11px] text-cyber-cyan/70 font-bold mt-2 uppercase font-mono tracking-tight bg-cyber-cyan/10 px-3 py-1 rounded-full border border-cyber-cyan/20 animate-pulse">
            {stepText}
          </p>
        </div>

        {/* Dynamic Binary Decorator */}
        <div className="flex gap-1.5 justify-center py-1">
          {[1, 0, 1, 1, 0, 1].map((b, i) => {
            const isLit = (progress / 100) * 6 > i;
            return (
              <div 
                key={i} 
                className={`text-[9px] font-mono font-bold transition-all duration-300 ${isLit ? 'text-cyber-cyan shadow-neon-cyan' : 'text-white/10'}`}
              >
                {b}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HardwareStatusOverlay;
