import React, { useState } from 'react';
import { AlertTriangle, CheckSquare, Square, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DisclaimerModal = ({ onAgree, onBack }) => {
    const { t } = useTranslation();
    const [isChecked, setIsChecked] = useState(false);

    const handleAgree = () => {
        if (!isChecked) return;
        onAgree();
    };

    return (
        <div
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 text-pretendard animate-in fade-in duration-500"
            style={{
                paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
            }}
        >
            <div className="bg-[#111] w-full max-w-sm rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 shadow-2xl relative border border-white/10 flex flex-col items-center">

                {onBack && (
                    <button
                        onClick={onBack}
                        className="absolute top-3 left-3 sm:top-5 sm:left-5 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:bg-white/10 hover:text-white active:scale-95 transition"
                        aria-label="뒤로가기"
                    >
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                )}

                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-3 sm:mb-6">
                    <AlertTriangle className="w-6 h-6 sm:w-9 sm:h-9 text-red-500 drop-shadow-lg" />
                </div>

                <h2 className="text-lg sm:text-2xl font-black text-white italic tracking-tighter uppercase mb-2 sm:mb-4 text-center leading-tight">
                    {t("disclaimer_title_1")}<br /><span className="text-red-500">{t("disclaimer_title_2")}</span>
                </h2>

                <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-5 mb-3 sm:mb-8 text-xs sm:text-sm text-gray-300 leading-relaxed font-medium">
                    <p className="mb-2 sm:mb-4">
                        {t("disclaimer_p1")}
                    </p>
                    <p className="mb-2 sm:mb-4">
                        {t("disclaimer_p2")}
                    </p>
                    <p className="text-red-400 font-bold">
                        {t("disclaimer_p3")}
                    </p>
                </div>

                <div
                    className="flex items-center gap-2 sm:gap-3 w-full p-4 sm:p-5 mb-3 sm:mb-8 bg-black/40 rounded-xl cursor-pointer border border-white/5 hover:border-white/20 transition-colors active:scale-95"
                    onClick={() => setIsChecked(!isChecked)}
                >
                    <div className="flex-shrink-0">
                        {isChecked
                            ? <CheckSquare className="w-6 h-6 sm:w-7 sm:h-7 text-cyber-green" />
                            : <Square className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500" />}
                    </div>
                    <span className={`text-sm sm:text-base font-bold select-none ${isChecked ? 'text-white' : 'text-gray-400'}`}>
                        {t("disclaimer_check")}
                    </span>
                </div>

                <button
                    onClick={handleAgree}
                    disabled={!isChecked}
                    className={`w-full py-5 sm:py-6 rounded-2xl font-black text-base sm:text-lg shadow-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isChecked
                        ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                        : 'bg-white/5 text-gray-600 cursor-not-allowed'
                        }`}
                >
                    {t("disclaimer_btn")} <ChevronRight className={`w-5 h-5 sm:w-6 sm:h-6 ${isChecked ? 'text-white' : 'text-gray-600'}`} />
                </button>
            </div>
        </div>
    );
};

export default DisclaimerModal;
