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
                    speak(t('pv_success_voice'));
                } else {
                    setStep('FAIL');
                    speak(t('pv_fail_voice'));
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
                            {t('pv_init_desc1')}<br />{t('pv_init_desc2')}
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
                            {t('pv_scan_start')}
                        </button>
                        <button
                            onClick={() => {
                                speak(t('pv_skip_voice'));
                                onComplete(null);
                            }}
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
                        <p className="text-gray-400 text-sm font-bold tracking-tight">{t('pv_loading1')}<br />{t('pv_loading2')}</p>
                    </div>
                )}
 
                {step === 'FAIL' && (
                    <div className="p-8 text-center animate-in shake duration-500 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -z-10"></div>
                        <div className="bg-red-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                            <X size={40} className="text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tighter">{t('pv_fail_title')}</h2>
                        <p className="text-red-400 font-black mb-6 text-lg tracking-tight">{t('pv_fail_sub')}</p>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">
                            {t('pv_fail_desc1')}<br />{t('pv_fail_desc2')}
                        </p>
 
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-5 bg-red-500 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
                        >
                            <Camera size={24} />
                            {t('pv_retake')}
                        </button>
                        <button
                            onClick={() => {
                                speak(t('pv_skip_fail_voice'));
                                onComplete(null);
                            }}
                            className="mt-4 text-red-400/60 hover:text-red-400 font-bold text-xs tracking-wider uppercase block mx-auto transition-colors"
                        >
                            {t('pv_end_no_verify')}
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
                            {t('pv_success_desc1')}<br />{t('pv_success_desc2')}
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
                            {t('pv_claim_reward')}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ParkingVerification;
