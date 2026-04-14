import React, { useState } from 'react';
import { Store, ChevronRight, X, Scan, Gift } from 'lucide-react';

const DropAndGoModal = ({ isOpen, onClose, station, onScanStart }) => {
    const [isScanning, setIsScanning] = useState(false);

    if (!isOpen || !station) return null;

    const handleAction = () => {
        setIsScanning(true);
        setTimeout(() => {
            setIsScanning(false);
            if (onScanStart) onScanStart();
        }, 1500); // 1.5s delay to show scan UI
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#12161b] w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-orange-500/30 overflow-hidden relative animate-in slide-in-from-bottom flex flex-col pt-2 pb-8 px-6">

                {/* Drag Handle & Close */}
                <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mt-2 mb-6" onClick={onClose}></div>
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>

                {/* Cyberpunk Glow Background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px] pointer-events-none"></div>

                {isScanning ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 border-4 border-orange-500/20 rounded-2xl flex items-center justify-center relative overflow-hidden">
                                <Scan size={32} className="text-orange-400" />
                                <div className="absolute top-0 left-0 w-full h-1 bg-orange-400 shadow-[0_0_10px_#f97316] animate-scan-line"></div>
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">NFC 스캔 대기 중...</h3>
                        <p className="text-sm text-orange-400 font-bold animate-pulse">상점 앞 NFC 태그에 기기를 가져다 대주세요.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-orange-500/20 border-2 border-orange-500/50 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                <Store size={28} className="text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">{station.name}</h3>
                                <p className="text-xs font-bold text-gray-400 flex items-center gap-1 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                    C-Safe 파트너 스테이션
                                </p>
                            </div>
                        </div>

                        {/* Attractive Banner */}
                        <div className="bg-gradient-to-r from-orange-950/80 to-[#1e1410] border border-orange-500/30 rounded-2xl p-4 mb-6 relative overflow-hidden">
                            <Gift className="absolute -right-4 -bottom-4 w-24 h-24 text-orange-500/10" />
                            <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1 relative z-10">Drop & Go 리워드</p>
                            <p className="text-md font-bold text-white relative z-10 leading-snug">
                                24시간 무인 반납 가능!<br />
                                지금 반납하면 <span className="text-orange-400 font-black">{station.discountOffer}</span> 즉시 지급!
                            </p>
                        </div>

                        <button
                            onClick={handleAction}
                            className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 text-black rounded-2xl font-black text-lg shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Scan size={20} className="font-black" /> NFC로 1초 반납하기
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default DropAndGoModal;
