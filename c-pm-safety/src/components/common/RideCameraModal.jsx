import React, { useState, useRef } from 'react';
import { Camera, Check, X, Info, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const RideCameraModal = ({ isOpen, onClose, onConfirm, mode, onQRScanRequest, onAIScanRequest }) => {
    const { t } = useTranslation();
    const [photoPreview, setPhotoPreview] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleCaptureClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirm = () => {
        // 실제 운영 환경이라면 여기서 이미지를 서버로 전송하는 로직 추가
        onConfirm(photoPreview);
        setPhotoPreview(null);
        onClose();
    };

    const isStart = mode === 'start';
    const title = isStart ? t("modal_start_title") : t("modal_end_title");
    const desc = isStart
        ? t("modal_start_desc")
        : t("modal_end_desc");

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in duration-300">
            <div className="w-full max-w-md bg-cyber-panel/95 rounded-[2rem] border border-white/10 shadow-glass overflow-hidden pb-6">

                {/* Header */}
                <div className="p-6 text-center border-b border-white/5 relative">
                    <button
                        onClick={() => { setPhotoPreview(null); onClose(); }}
                        className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <div className="w-16 h-16 bg-cyber-cyan/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyber-cyan shadow-neon-cyan">
                        <Camera size={28} className="text-cyber-cyan flex-shrink-0" />
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tighter">{title}</h2>
                    <p className="text-sm text-gray-400 mt-2 whitespace-pre-line">{desc}</p>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col items-center">
                    {/* Hidden File Input for Native Camera */}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />

                    {!photoPreview ? (
                        <div className="w-full flex flex-col gap-3">
                            {isStart ? (
                                <>
                                    <button
                                        onClick={onQRScanRequest}
                                        className="w-full h-32 bg-cyber-cyan/10 border-2 border-dashed border-cyber-cyan/30 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-cyber-cyan/20 transition-colors group shadow-[0_0_15px_rgba(64,255,220,0.1)]"
                                    >
                                    <div className="flex items-center gap-2">
                                        <QrCode size={36} className="text-cyber-cyan group-hover:scale-110 transition-transform" />
                                    </div>
                                    <span className="text-cyber-cyan font-black tracking-tight text-lg mt-2">{t("qr_scan_btn")}</span>
                                    <span className="text-cyber-cyan/80 text-xs font-medium">인증 완료 시 마일리지 <span className="text-yellow-400 font-bold tracking-widest ml-0.5 bg-yellow-400/20 px-1.5 py-0.5 rounded uppercase">+50P 선지급</span></span>
                                </button>
                                <button
                                    onClick={onAIScanRequest}
                                    className="w-full h-32 bg-cyber-green/10 border-2 border-dashed border-cyber-green/30 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-cyber-green/20 transition-colors group shadow-[0_0_15px_rgba(64,255,100,0.1)]"
                                >
                                    <div className="flex items-center gap-2">
                                        <Camera size={36} className="text-cyber-green group-hover:scale-110 transition-transform" />
                                    </div>
                                    <span className="text-cyber-green font-black tracking-tight text-lg mt-2">Edge AI 헬멧 인증</span>
                                    <span className="text-cyber-green/80 text-xs font-medium">스마트폰 카메라 <span className="text-yellow-400 font-bold tracking-widest ml-0.5 bg-yellow-400/20 px-1.5 py-0.5 rounded uppercase">+100P 즉시</span></span>
                                </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleCaptureClick}
                                    className="w-full h-32 bg-black/50 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 hover:border-cyber-cyan transition-colors group"
                                >
                                    <Camera size={32} className="text-gray-500 group-hover:text-cyber-cyan transition-colors" />
                                    <span className="text-gray-400 group-hover:text-cyber-cyan font-bold">{t("end_photo_btn")}</span>
                                </button>
                            )}

                            {isStart && (
                                <button
                                    onClick={handleCaptureClick}
                                    className="w-full h-12 bg-black/30 border border-white/10 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors group"
                                >
                                    <Camera size={16} className="text-gray-500" />
                                    <span className="text-gray-400 text-sm font-medium">{t("direct_photo_btn")}</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full relative rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                            <img src={photoPreview} alt="Preview" className="w-full h-64 object-cover" />
                            <button
                                onClick={handleCaptureClick}
                                className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold font-pretendard flex items-center gap-2 border border-white/20 shadow-xl active:scale-95 transition-transform"
                            >
                                <Camera size={14} /> {t("retake_btn")}
                            </button>
                        </div>
                    )}

                    {/* Guidelines */}
                    <div className="mt-6 bg-blue-900/20 rounded-xl p-4 flex gap-3 border border-blue-500/30">
                        <Info size={20} className="text-blue-400 flex-shrink-0" />
                        <p className="text-xs text-blue-200/80 leading-relaxed font-medium">
                            {t("camera_permission_info")}
                        </p>
                    </div>

                    {/* Action Button */}
                    <div className="w-full mt-6">
                        <button
                            onClick={handleConfirm}
                            disabled={!photoPreview}
                            className={`w-full py-4 rounded-xl font-black text-lg shadow-xl shadow-cyber-cyan/20 active:scale-95 transition-all flex items-center justify-center gap-2 ${photoPreview ? 'bg-cyber-cyan text-black' : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'}`}
                        >
                            <Check size={20} className={photoPreview ? 'text-black' : 'text-gray-500'} />
                            {t("auth_continue_btn")}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RideCameraModal;
