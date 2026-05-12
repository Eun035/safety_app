import React from 'react';
import { Bluetooth, Lock, Unlock, Loader2, Zap } from 'lucide-react';

const HardwareStatusOverlay = ({ isSyncing, isRiding }) => {
  if (!isSyncing) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center pointer-events-none">
      <div className="bg-black/80 backdrop-blur-2xl border border-cyber-cyan/30 p-8 rounded-[3rem] flex flex-col items-center gap-6 shadow-neon-cyan animate-in zoom-in duration-300 pointer-events-auto">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-cyber-cyan/20 flex items-center justify-center">
            {isRiding ? (
              <Lock size={40} className="text-cyber-cyan animate-pulse" />
            ) : (
              <Unlock size={40} className="text-cyber-cyan animate-pulse" />
            )}
          </div>
          <div className="absolute inset-0 w-24 h-24 border-4 border-cyber-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Bluetooth size={16} className="text-blue-400 animate-pulse" />
            <span className="text-[10px] font-black text-cyber-cyan uppercase tracking-[0.3em]">Hardware Link</span>
          </div>
          <h3 className="text-xl font-black italic text-white tracking-tighter">
            {isRiding ? "LOCKING DEVICE..." : "UNLOCKING DEVICE..."}
          </h3>
          <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-widest">
            Syncing via Bluetooth Low Energy
          </p>
        </div>

        {/* Binary Stream Decoration */}
        <div className="flex gap-1">
          {[1,0,1,1,0,1].map((b, i) => (
            <div key={i} className="text-[8px] font-mono text-cyber-cyan/40 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
              {b}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HardwareStatusOverlay;
