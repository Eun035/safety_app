import React, { useState, useEffect } from 'react';
import { Shield, Zap } from 'lucide-react';

const SplashScreen = ({ isDataLoading, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        // 아방가르드한 로딩 페칭 애니메이션
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev < 90) return prev + Math.floor(Math.random() * 15);
                if (prev >= 90 && !isDataLoading) return 100;
                return prev;
            });
        }, 150);

        return () => clearInterval(timer);
    }, [isDataLoading]);

    useEffect(() => {
        if (progress >= 100 && !isDataLoading) {
            // 100% 도달 후 페이드아웃 시작
            setTimeout(() => {
                setIsFadingOut(true);
                // 페이드아웃 애니메이션 완료 후 컴포넌트 언마운트
                setTimeout(onComplete, 800);
            }, 500);
        }
    }, [progress, isDataLoading, onComplete]);

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-[#070b12] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-800 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
        >
            {/* Cursive Font Load (Dynamic) */}
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&family=La+Belle+Aurore&display=swap');
                    
                    .font-serif-italic {
                        font-family: 'Playfair Display', serif;
                    }
                    .font-script-chill {
                        font-family: 'La Belle Aurore', cursive;
                    }
                `}
            </style>

            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Top Logo / Emblem */}
            <div className="absolute top-16 flex flex-col items-center opacity-80 animate-in fade-in duration-1000 delay-300">
                <div className="w-12 h-12 bg-[#0d141f] rounded-full border border-cyber-cyan/30 flex items-center justify-center shadow-neon-cyan mb-3">
                    <span className="text-cyber-cyan font-black text-lg italic tracking-tighter">C<Zap size={14} className="inline ml-0.5 fill-cyber-cyan" /></span>
                </div>
                <span className="text-[9px] text-cyber-cyan font-bold tracking-[0.3em] uppercase opacity-70">Personal Mobility</span>
            </div>

            {/* Center Artwork (Minimalist Edition Reference) */}
            <div className="relative w-64 h-64 mb-16 flex items-center justify-center">
                {/* Visual Container */}
                <div className="absolute inset-0 rounded-full animate-in zoom-in duration-1000 relative flex flex-col items-center justify-center overflow-hidden">
                    {/* User-provided Video Asset */}
                    <video controls
                        src="./helmet_video.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover mix-blend-screen contrast-[1.4] brightness-[0.9] saturate-[1.3] drop-shadow-[0_0_20px_rgba(64,255,220,0.3)]"
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>

                {/* Typography Overlay */}
                <div className="absolute -bottom-6 w-full text-center z-10 flex flex-col items-center">
                    <h1 className="text-6xl text-white font-serif-italic opacity-90 tracking-tight drop-shadow-2xl translate-x-[-20px]">
                        Ride Safe
                    </h1>
                    <h2 className="text-5xl text-cyber-cyan font-script-chill transform -rotate-6 translate-y-[-20px] translate-x-[30px] drop-shadow-lg" style={{ textShadow: "0 0 10px #40ffdc, 0 0 20px #40ffdc" }}>
                        Stay Chill
                    </h2>
                </div>
            </div>

            {/* Progress Bar & Loader Text */}
            <div className="absolute bottom-20 w-full max-w-xs flex flex-col gap-3 px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Initializing Core</span>
                    <span className="text-xs font-black text-cyber-cyan">{Math.min(progress, 100)}%</span>
                </div>

                {/* Progress Track */}
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-cyber-cyan shadow-neon-cyan transition-all duration-300 ease-out"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                </div>

                <div className="text-center mt-4">
                    <span className="text-[8px] text-gray-600 tracking-[0.2em] font-mono">SIGNATURE v2.0.4</span>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
