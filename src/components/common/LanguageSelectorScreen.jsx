import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

const LanguageSelectorScreen = ({ onComplete }) => {
    const { i18n } = useTranslation();
    const [pendingLanguage, setPendingLanguage] = useState(null);

    const languages = [
        { code: 'ko', label: '한국어', desc: 'Korean' },
        { code: 'en', label: 'English', desc: 'English' },
        { code: 'ja', label: '日本語', desc: 'Japanese' },
        { code: 'zh-CN', label: '中文', desc: 'Chinese' }
    ];

    const handleConfirm = () => {
        if (!pendingLanguage) return;
        i18n.changeLanguage(pendingLanguage);
        onComplete();
    };

    return (
        <div
            className="fixed inset-0 z-[10000] bg-[#070b12] flex items-center justify-center p-3 sm:p-6 text-pretendard animate-in fade-in duration-500"
            style={{
                paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
            }}
        >
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="bg-cyber-panel/95 backdrop-blur-2xl border border-white/10 w-full max-w-sm rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl relative flex flex-col items-center animate-in zoom-in duration-300">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-cyber-cyan/10 rounded-full flex items-center justify-center mb-3 sm:mb-6 border border-cyber-cyan/30 shadow-neon-cyan relative">
                    <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-cyber-cyan" />
                </div>

                <h2 className="text-lg sm:text-2xl font-black text-white italic tracking-tighter uppercase mb-4 sm:mb-6">Select Language</h2>

                <div className="flex flex-col gap-2 sm:gap-3 w-full relative z-10">
                    {languages.map((lang) => {
                        const isPending = pendingLanguage === lang.code;
                        return (
                            <button
                                key={lang.code}
                                onClick={() => setPendingLanguage(lang.code)}
                                className={`w-full border py-5 sm:py-6 rounded-2xl flex items-center justify-between px-4 sm:px-6 transition-all active:scale-95 ${
                                    isPending
                                        ? 'bg-cyber-cyan/15 border-cyber-cyan shadow-[0_0_20px_rgba(64,255,220,0.35)]'
                                        : 'bg-black/40 border-white/5 hover:bg-white/10 hover:border-cyber-cyan/40'
                                }`}
                            >
                                <span className={`text-lg sm:text-xl font-bold transition-colors ${isPending ? 'text-cyber-cyan' : 'text-white'}`}>
                                    {lang.label}
                                </span>
                                {isPending
                                    ? <Check className="w-5 h-5 text-cyber-cyan" />
                                    : <span className="text-xs sm:text-sm font-medium text-gray-500">{lang.desc}</span>
                                }
                            </button>
                        );
                    })}
                </div>

                {/* Confirm (전체 너비) */}
                <div className="w-full mt-4 sm:mt-6">
                    <button
                        onClick={handleConfirm}
                        disabled={!pendingLanguage}
                        className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider text-sm sm:text-base transition-all active:scale-95 ${
                            pendingLanguage
                                ? 'bg-cyber-cyan text-black shadow-neon-cyan'
                                : 'bg-white/5 text-gray-600 cursor-not-allowed'
                        }`}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LanguageSelectorScreen;
