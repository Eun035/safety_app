import React, { useEffect, useState } from 'react';
import { AlertOctagon } from 'lucide-react';

const HazardAlertOverlay = ({ activeHazard }) => {
    // 깜빡임 상태 제어
    const [isBlinking, setIsBlinking] = useState(true);

    useEffect(() => {
        if (!activeHazard) return;

        // 0.5초마다 깜빡이는 효과 (css animation으로 대체 가능하나, 부팅 효과 극대화를 위해 React state 활용)
        const interval = setInterval(() => {
            setIsBlinking(prev => !prev);
        }, 500);

        return () => clearInterval(interval);
    }, [activeHazard]);

    if (!activeHazard) return null;

    return (
        <>
            {/* 화면 전체를 감싸는 붉은색 깜빡임 테두리 효과 */}
            <div
                className="absolute inset-0 pointer-events-none z-[200] transition-opacity duration-300"
                style={{
                    boxShadow: isBlinking ? 'inset 0 0 40px 10px rgba(239, 68, 68, 0.5)' : 'none',
                    opacity: isBlinking ? 1 : 0.4
                }}
            />

            {/* 상단 경고 배너 */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[210] pointer-events-none animate-in slide-in-from-top duration-300">
                <div className={`p-4 rounded-[2rem] shadow-[0_10px_40px_rgba(220,38,38,0.5)] border border-red-500 transition-colors duration-300 flex items-center gap-4 ${isBlinking ? 'bg-red-600/90' : 'bg-red-800/80'} backdrop-blur-xl`}>

                    <div className="bg-white/20 p-2 rounded-2xl animate-pulse">
                        <AlertOctagon size={28} className="text-white fill-red-500" />
                    </div>

                    <div className="flex-1">
                        <p className="text-[10px] font-black opacity-80 uppercase leading-none mb-1 text-white tracking-widest">
                            Danger Zone Ahead
                        </p>
                        <p className="text-sm font-bold tracking-tight text-white line-clamp-2">
                            {activeHazard.title || '자전거 및 PM 사고 다발 구역'}
                        </p>
                        <p className="text-xs font-black text-yellow-300 mt-1">
                            거리: {activeHazard.distance}m 이내 • 안전 속도 10km/h 이하 유지
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HazardAlertOverlay;
