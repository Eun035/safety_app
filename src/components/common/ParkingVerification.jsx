import React, { useState, useRef } from 'react';
import { Camera, CheckCircle, Smartphone, Award, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ParkingVerification = ({ isOpen, onClose, speak, onComplete }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState('INIT'); // INIT -> LOADING -> SUCCESS | FAIL
    const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleCapture = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const imageUrl = URL.createObjectURL(file);
            setCapturedPhotoUrl(imageUrl);
            setStep('LOADING');

            // AI Vision Analysis Mocking (2.5초 지연 및 랜덤 실패 20%)
            setTimeout(() => {
                const isSuccess = Math.random() > 0.2; // 80% 통과 확률
                if (isSuccess) {
                    setStep('SUCCESS');
                    speak("주차 이미지가 AI 비전 테스트를 통과했습니다. 안전 주차 감사합니다!");
                } else {
                    setStep('FAIL');
                    speak("지정된 주차 구역 테두리를 이탈하였거나 형태를 인식할 수 없습니다. 다시 촬영해 주세요.");
                }
            }, 2500);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <div className="bg-cyber-panel/90 w-full max-w-sm rounded-[2rem] shadow-glass border border-cyber-cyan/30 overflow-hidden animate-in zoom-in duration-300">

                {step === 'INIT' && (
                    <div className="p-8 text-center relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-cyan/10 rounded-full blur-3xl -z-10"></div>
                        <div className="bg-cyber-cyan/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-cyber-cyan/50 shadow-neon-cyan">
                            <Smartphone size={40} className="text-cyber-cyan" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tighter">{t("Parking Cam")}</h2>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">
                            지정된 가상 주차 구역에 PM을 세우고<br />네온 가이드라인에 맞춰 촬영해 주세요.
                        </p>

                        <input
                            type="file"
                            accept="image/*"
                            capture="camera"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleCapture}
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-5 bg-cyber-cyan text-black rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-white active:scale-95 transition-all shadow-neon-cyan"
                        >
                            <Camera size={24} />
                            비전 스캔 시작
                        </button>
                        <button
                            onClick={onClose}
                            className="mt-4 text-cyber-cyan/60 hover:text-cyber-cyan font-bold text-sm tracking-widest uppercase"
                        >
                            SKIP
                        </button>
                    </div>
                )}

                {step === 'LOADING' && (
                    <div className="p-8 text-center relative flex flex-col items-center justify-center min-h-[300px]">
                        <div className="w-16 h-16 border-4 border-cyber-cyan/30 border-t-cyber-cyan border-b-cyber-cyan rounded-full animate-spin mb-6"></div>
                        <h2 className="text-xl font-black text-cyber-cyan tracking-widest mb-2 animate-pulse uppercase">AI Vision Analysis</h2>
                        <p className="text-gray-400 text-sm font-bold tracking-tight">C-Safe 서버로 이미지를 전송 중입니다...<br />구역 이탈 여부를 분석하고 있습니다.</p>
                    </div>
                )}

                {step === 'FAIL' && (
                    <div className="p-8 text-center animate-in shake duration-500 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -z-10"></div>
                        <div className="bg-red-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                            <X size={40} className="text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tighter">분석 실패</h2>
                        <p className="text-red-400 font-black mb-6 text-lg tracking-tight">주차 구역 이탈 감지</p>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">
                            이미지가 번들거리거나 주차 구역(P)<br />테두리를 완전히 벗어났습니다.
                        </p>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-5 bg-red-500 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
                        >
                            <Camera size={24} />
                            다시 촬영하기
                        </button>
                    </div>
                )}

                {step === 'SUCCESS' && (
                    <div className="p-8 text-center animate-in fade-in duration-500 relative">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-cyber-green/10 rounded-full blur-3xl -z-10"></div>
                        <div className="relative inline-block mb-6">
                            <div className="bg-cyber-green/20 w-24 h-24 rounded-full flex items-center justify-center border-2 border-cyber-green shadow-neon-green">
                                <CheckCircle size={56} className="text-cyber-green" />
                            </div>
                            <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2 shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce">
                                <Award size={24} className="text-black fill-black" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tighter">SUCCESS!</h2>
                        <p className="text-cyber-green font-black mb-6 text-xl tracking-tight">+10 ECO POINT</p>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">
                            올바른 주차로 보행자의 안전과<br />지구를 지켰습니다.
                        </p>
                        <button
                            onClick={() => {
                                if (onComplete) {
                                    onComplete(capturedPhotoUrl);
                                } else {
                                    onClose();
                                }
                            }}
                            className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg hover:bg-gray-200 active:scale-95 transition-all shadow-lg"
                        >
                            리워드 수령
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ParkingVerification;
