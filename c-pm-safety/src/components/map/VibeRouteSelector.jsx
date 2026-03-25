import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, TreePine, Zap, Navigation, ArrowRight, Layers, Leaf, MapPin } from 'lucide-react';
import RoutePreferenceSelector from '../common/RoutePreferenceSelector';

const VIBE_OPTIONS = [
    {
        id: 'sunset',
        title: 'Riverside Chill',
        subTitle: '노을 맛집 (Sunset View)',
        time: '12 min',
        distance: '2.4 km',
        icon: <Sun size={20} className="text-white" />,
        tags: ['River Side', 'Easy Path'],
        gradient: 'bg-gradient-to-br from-[#38bdf8] to-[#d946ef] border-transparent shadow-[0_0_20px_rgba(217,70,239,0.5)]',
        inactiveGradient: 'bg-[#1a1a1a] border border-white/5 opacity-60'
    },
    {
        id: 'quiet',
        title: 'Quiet Street',
        subTitle: '가로수길 (The Garden Way)',
        time: '15 min',
        distance: '2.8 km',
        icon: <TreePine size={20} className="text-white" />,
        tags: ['No Noise', 'Scenic'],
        gradient: 'bg-gradient-to-br from-[#059669] to-[#047857] border-transparent shadow-[0_0_20px_rgba(16,185,129,0.5)]',
        inactiveGradient: 'bg-[#1a1a1a] border border-white/5 opacity-60'
    },
    {
        id: 'urban',
        title: 'Street Runner',
        subTitle: '도심 숏컷 (Urban Shortcut)',
        time: '8 min',
        distance: '1.8 km',
        icon: <Zap size={20} className="text-black" />,
        tags: ['Fast', 'City Lights'],
        gradient: 'bg-gradient-to-br from-cyber-cyan to-[#0284c7] border-transparent shadow-[0_0_20px_rgba(64,255,220,0.5)] text-black',
        inactiveGradient: 'bg-[#1a1a1a] border border-white/5 opacity-60'
    }
];

const VibeRouteSelector = ({ isOpen, onClose, onSelectRoute }) => {
    const { t } = useTranslation();
    const [selectedId, setSelectedId] = useState('sunset');
    const [selectedPreference, setSelectedPreference] = useState('safe');
    const [mode, setMode] = useState('CHILL');

    // Swipe down to start logic
    const touchStartY = useRef(0);
    const touchCurrentY = useRef(0);
    const isDragging = useRef(false);
    const modalRef = useRef(null);

    const handleCloseAction = () => {
        if (modalRef.current) {
            modalRef.current.style.transition = 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)';
            modalRef.current.style.transform = `translateY(100%)`;
        }
        setTimeout(() => {
            const selectedVibe = VIBE_OPTIONS.find(v => v.id === selectedId);
            onSelectRoute({ ...selectedVibe, preference: selectedPreference, drivingMode: mode });
            if (modalRef.current) {
                modalRef.current.style.transform = '';
                modalRef.current.style.transition = '';
            }
        }, 300);
    };

    const handleTouchStart = (e) => {
        touchStartY.current = e.touches[0].clientY;
        touchCurrentY.current = e.touches[0].clientY;
        isDragging.current = false;
        if (modalRef.current) {
            modalRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e) => {
        touchCurrentY.current = e.touches[0].clientY;
        const deltaY = touchCurrentY.current - touchStartY.current;

        if (deltaY > 5) {
            isDragging.current = true;
        }

        // Apply visual drag to the modal
        if (deltaY > 0 && modalRef.current) {
            modalRef.current.style.transform = `translateY(${deltaY}px)`;
        }
    };

    const handleTouchEnd = () => {
        const deltaY = touchCurrentY.current - touchStartY.current;

        if (!isDragging.current) {
            if (modalRef.current) modalRef.current.style.transition = '';
            return;
        }

        if (modalRef.current) {
            modalRef.current.style.transition = 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)';
        }

        if (deltaY > 80) {
            handleCloseAction();
        } else {
            // Snap back
            if (modalRef.current) {
                modalRef.current.style.transform = `translateY(0px)`;
            }
            setTimeout(() => {
                if (modalRef.current) {
                    modalRef.current.style.transform = '';
                    modalRef.current.style.transition = '';
                }
            }, 300);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-end justify-center">
            <div
                ref={modalRef}
                className="bg-[#0a0a0a] w-full max-w-md rounded-t-[2rem] p-6 shadow-2xl border-t border-white/10 animate-in slide-in-from-bottom duration-300 transition-transform"
            >
                {/* Drag Handle Area (Swipe or Click to submit) */}
                <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={(e) => {
                        if (!isDragging.current) {
                            handleCloseAction();
                        }
                    }}
                    className="w-full h-10 flex flex-col items-center justify-center -mt-2 mb-2 cursor-pointer active:scale-95 transition-transform"
                >
                    <div className="w-12 h-1.5 bg-gray-600 rounded-full hover:bg-gray-400 transition-colors pointer-events-none"></div>
                </div>

                <div className="mb-6 px-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[22px] font-bold text-white tracking-tight">
                            Choose Vibe
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMode('CHILL')}
                            className={`px-4 py-[14px] rounded-full text-[11px] font-black tracking-widest flex items-center justify-center gap-2 transition-all flex-[1.2] bg-[#0d2a24] border border-[#00e5a0] text-[#00e5a0] shadow-[0_0_15px_rgba(0,229,160,0.15)]`}
                        >
                            <span className="font-mono text-[10px] tracking-tighter flex items-center">⟡_🌿RK</span>
                            <span>CHILL</span>
                        </button>

                        <button
                            className={`px-4 py-[14px] rounded-full text-[11px] font-bold tracking-widest flex items-center justify-center gap-2 transition-all flex-[0.9] bg-[#141414] text-[#888888]`}
                        >
                            <Zap size={14} className="fill-[#888888]" /> FAST
                        </button>
                    </div>
                </div>

                <RoutePreferenceSelector selectedMode={selectedPreference} onModeChange={setSelectedPreference} />

                <div className="flex flex-col gap-4 mb-4 max-h-[55vh] overflow-y-auto hide-scrollbar px-2 pb-8">
                    {VIBE_OPTIONS.map((vibe) => {
                        const isActive = selectedId === vibe.id;
                        return (
                            <div
                                key={vibe.id}
                                onClick={() => setSelectedId(vibe.id)}
                                className={`relative rounded-3xl p-5 cursor-pointer transition-all duration-300 overflow-hidden ${isActive ? `${vibe.gradient} scale-[1.02] border-2 border-white` : `${vibe.inactiveGradient} hover:opacity-100 hover:scale-[1.01]`
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-white/10 pointer-events-none"></div>
                                )}
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            {/* 아이콘 색상도 액티브 상태에 따라 변환 (도심 숏컷은 검은색, 나머지는 흰색) */}
                                            <div className={isActive ? (vibe.id === 'urban' ? 'text-black' : 'text-white') : 'text-gray-400'}>
                                                {vibe.icon}
                                            </div>
                                            <span className={`text-[11px] font-bold ${isActive ? (vibe.id === 'urban' ? 'text-gray-800' : 'text-white/90') : 'text-gray-400'}`}>
                                                {vibe.subTitle}
                                            </span>
                                        </div>
                                        <h3 className={`text-xl font-black ${isActive ? (vibe.id === 'urban' ? 'text-black' : 'text-white') : 'text-gray-200'}`}>
                                            {vibe.title}
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-2xl font-black italic tracking-tighter shadow-sm ${isActive ? (vibe.id === 'urban' ? 'text-black' : 'text-white') : 'text-gray-300'}`}>
                                            {vibe.time.split(' ')[0]} <span className="text-sm not-italic opacity-80">{vibe.time.split(' ')[1]}</span>
                                        </p>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? (vibe.id === 'urban' ? 'text-gray-800' : 'text-white/80') : 'text-gray-500'}`}>
                                            {vibe.distance}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-6 relative z-10">
                                    {vibe.tags.map(tag => (
                                        <span key={tag} className={`flex items-center gap-1.5 text-xs font-bold ${isActive ? (vibe.id === 'urban' ? 'text-gray-800' : 'text-white/90') : 'text-gray-400'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? (vibe.id === 'urban' ? 'bg-gray-800' : 'bg-white/90') : 'bg-gray-500'}`}></div>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VibeRouteSelector;
