// src/components/common/DrivingConsoleUI.jsx
import React, { useState, useEffect } from 'react';
import { ProfileControlService } from '../../services/ProfileControlService';
import { X } from 'lucide-react';
import { toast } from '../../hooks/useToast';

const DrivingConsoleUI = ({ isOpen, onClose }) => {
  const [targetSpeed, setTargetSpeed] = useState(20);
  const [status, setStatus] = useState({
    isBeginner: false,
    isSenior: false,
    rideCount: 0,
  });

  useEffect(() => {
    if (isOpen) {
      // 화면 로드 시 사용자 프로필 Fetch (모킹 데이터 적용)
      const fetchedStatus = { isBeginner: true, isSenior: false, rideCount: 2 };
      setStatus(fetchedStatus);
      
      if (fetchedStatus.isBeginner) {
        setTargetSpeed(15);
      } else {
        setTargetSpeed(20);
      }
    }
  }, [isOpen]);

  const handleSpeedChange = (e) => {
    const value = parseInt(e.target.value, 10) || 10;
    // 초보자 모드일 경우 슬라이더가 15를 초과하지 못하도록 방어 로직 적용
    if (status.isBeginner && value > 15) {
      setTargetSpeed(15);
    } else {
      setTargetSpeed(value);
    }
  };

  const applyConfig = async () => {
    try {
      // API 통신을 위한 모킹 데이터 설정
      const user = { userId: "mock-user-1", age: 25, rideCount: status.rideCount };
      if (status.isSenior) user.age = 65;
      
      const config = await ProfileControlService.generateDeviceConfig(user, targetSpeed);
      toast(`✅ 맞춤형 기기 제어 파라미터가 전송되었습니다. (최고속도: ${config.maxSpeedConfigured}km/h)`, 'success');
      onClose(); // 적용 완료 후 닫기
    } catch (e) {
      console.error(e);
      toast("기기 설정 중 오류가 발생했습니다.", 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div 
        className="bg-[#1C1C1E] w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-gray-800 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-2xl font-bold tracking-tight">주행 콘솔 (C-Safe)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full bg-gray-800/50">
            <X size={20} />
          </button>
        </div>

        {/* 상태 배지 영역 */}
        <div className="flex flex-row flex-wrap mb-6 gap-2">
          {status.isBeginner && (
            <div className="bg-amber-500/20 border border-amber-500/50 py-1.5 px-3 rounded-lg">
              <span className="text-amber-400 text-xs font-black tracking-tight">초보자 모드 (주행 {status.rideCount}/5회)</span>
            </div>
          )}
          {status.isSenior && (
            <div className="bg-green-500/20 border border-green-500/50 py-1.5 px-3 rounded-lg">
              <span className="text-green-400 text-xs font-black tracking-tight">시니어 안심 모드 활성</span>
            </div>
          )}
        </div>

        {/* 속도 제어기 영역 */}
        <div className="bg-[#2C2C2E] rounded-2xl p-6 shadow-lg border border-gray-700/50">
          <div className="text-[#8E8E93] text-sm mb-2 font-medium">최고 속도 제한 (km/h)</div>
          <div className="text-white text-6xl font-black text-center my-6 tracking-tighter">{targetSpeed}</div>
          
          <div className="relative w-full h-10 flex items-center mb-2">
            <input 
              type="range" 
              min="10" 
              max="20" 
              step="1" 
              value={targetSpeed} 
              onChange={handleSpeedChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white z-10"
            />
          </div>
          
          <div className="flex justify-between px-1">
            <span className="text-[#636366] text-xs font-bold">10 km/h</span>
            <span className="text-[#636366] text-xs font-bold">
              {status.isBeginner ? "15 km/h (Max)" : "20 km/h"}
            </span>
          </div>

          {status.isBeginner && (
            <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-xs leading-relaxed font-medium">
                * 초보자 안전을 위해 최초 5회 주행까지는 15km/h로 최고 속도가 강제 제한됩니다.
              </p>
            </div>
          )}
        </div>
        
        <button 
          onClick={applyConfig}
          className="w-full mt-6 py-4 bg-white text-black font-black text-lg rounded-2xl active:scale-95 transition-all shadow-lg hover:bg-gray-200"
        >
          설정 적용
        </button>
      </div>
    </div>
  );
};

export default DrivingConsoleUI;
