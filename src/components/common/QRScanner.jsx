import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const QRScanner = ({ isOpen, onClose, onScanSuccess, mode = 'station' }) => {
    const { t } = useTranslation();
    const scannerRef = useRef(null);

    const onScanSuccessRef = useRef(onScanSuccess);

    // Update callback ref without triggering effect
    useEffect(() => {
        onScanSuccessRef.current = onScanSuccess;
    }, [onScanSuccess]);

    useEffect(() => {
        if (!isOpen) return;

        // Html5Qrcode를 직접 사용하여 UI 없이 바로 카메라를 시작합니다.
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            (decodedText) => {
                if (scannerRef.current) {
                    try {
                        if (scannerRef.current.isScanning) {
                            scannerRef.current.stop().then(() => {
                                scannerRef.current.clear();
                                const elem = document.getElementById("qr-reader");
                                if (elem) elem.innerHTML = '';
                            }).catch(e => console.log("Stop failed:", e));
                        }
                    } catch (e) {
                        console.error("Error stopping scanner:", e);
                    }
                    scannerRef.current = null;
                }
                onScanSuccessRef.current(decodedText);
            },
            (err) => {
                // 매 프레임마다 QR을 찾지 못하면 에러를 뿜어내므로 무시합니다.
            }
        ).catch((err) => {
            console.error("카메라를 자동으로 시작하는 데 실패했습니다.", err);
            alert("카메라 권한을 허용해 주시거나 카메라가 정상 작동하는지 확인해주세요.");
        });

        // Cleanup on unmount or when `isOpen` becomes false
        return () => {
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        scannerRef.current.stop().then(() => {
                            scannerRef.current.clear();
                            const elem = document.getElementById("qr-reader");
                            if (elem) elem.innerHTML = '';
                        }).catch(e => {
                            console.error("Failed to clear scanner on unmount", e);
                        });
                    } else {
                        scannerRef.current.clear();
                        const elem = document.getElementById("qr-reader");
                        if (elem) elem.innerHTML = '';
                    }
                } catch (e) {
                    console.error("Error during scanner unmount cleanup", e);
                }
                scannerRef.current = null;
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex flex-col justify-center items-center animate-in zoom-in duration-300">
            <div className="w-full max-w-sm bg-cyber-panel/90 p-6 rounded-[2rem] border border-cyber-cyan/30 shadow-glass relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
                >
                    <X size={24} />
                </button>

                <div className="text-center mb-6">
                    <div className="bg-cyber-cyan/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyber-cyan/50 shadow-neon-cyan relative">
                        <div className="absolute inset-0 bg-cyber-cyan/10 blur-xl rounded-full"></div>
                        <QrCode size={32} className="text-cyber-cyan relative z-10" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tighter">
                        {mode === 'helmet' ? t("qr_scanner_title_helmet") : t("qr_scanner_title_station")}
                    </h2>
                    <p className="text-gray-400 text-sm mt-2 font-medium break-keep">
                        {mode === 'helmet' ? t("qr_scanner_desc_helmet") : t("qr_scanner_desc_station")}
                    </p>
                </div>

                <style>{`
                    #qr-reader img[alt="Info icon"] { display: none !important; }
                    #qr-reader img[alt="Camera based scan"] { display: none !important; }
                    #qr-reader span {
                        color: #40ffdc;
                        font-weight: 900;
                        font-size: 14px;
                        display: block;
                        margin-top: 50px;
                    }
                `}</style>
                <div id="qr-reader" className="w-full min-h-[250px] bg-black rounded-2xl overflow-hidden border-2 border-dashed border-cyber-cyan/50 flex items-center justify-center relative">
                    <div className="absolute text-cyber-cyan/30 text-xs font-black uppercase tracking-widest text-center">
                        Waiting for camera...
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
