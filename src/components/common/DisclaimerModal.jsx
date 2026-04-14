import React, { useState } from 'react';
import { AlertTriangle, CheckSquare, Square, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DisclaimerModal = ({ onAgree }) => {
    const { t } = useTranslation();
    const [isChecked, setIsChecked] = useState(false);

    const handleAgree = () => {
        if (!isChecked) return;
        onAgree();
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-pretendard animate-in fade-in duration-500">
            <div className="bg-[#111] w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative border border-white/10 flex flex-col items-center">

                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle size={36} className="text-red-500 drop-shadow-lg" />
                </div>

                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-4 text-center">{t("disclaimer_title_1")}<br /><span className="text-red-500">{t("disclaimer_title_2")}</span></h2>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-8 text-sm text-gray-300 leading-relaxed font-medium">
                    <p className="mb-4">
                        {t("disclaimer_p1")}
                    </p>
                    <p className="mb-4">
                        {t("disclaimer_p2")}
                    </p>
                    <p className="text-red-400 font-bold">
                        {t("disclaimer_p3")}
                    </p>
                </div>

                <div
                    className="flex items-center gap-3 w-full p-4 mb-8 bg-black/40 rounded-xl cursor-pointer border border-white/5 hover:border-white/20 transition-colors"
                    onClick={() => setIsChecked(!isChecked)}
                >
                    <div className="flex-shrink-0">
                        {isChecked ? <CheckSquare size={24} className="text-cyber-green" /> : <Square size={24} className="text-gray-500" />}
                    </div>
                    <span className={`text-sm font-bold select-none ${isChecked ? 'text-white' : 'text-gray-400'}`}>
                        {t("disclaimer_check")}
                    </span>
                </div>

                <button
                    onClick={handleAgree}
                    disabled={!isChecked}
                    className={`w-full py-4 rounded-xl font-black text-lg shadow-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isChecked
                        ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                        : 'bg-white/5 text-gray-600 cursor-not-allowed'
                        }`}
                >
                    {t("disclaimer_btn")} <ChevronRight size={20} className={isChecked ? 'text-white' : 'text-gray-600'} />
                </button>
            </div>
        </div>
    );
};

export default DisclaimerModal;
