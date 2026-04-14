import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSelectorScreen = ({ onComplete }) => {
    const { i18n } = useTranslation();

    const languages = [
        { code: 'ko', label: '한국어', desc: 'Korean' },
        { code: 'en', label: 'English', desc: 'English' },
        { code: 'ja', label: '日本語', desc: 'Japanese' },
        { code: 'zh-CN', label: '中文', desc: 'Chinese' }
    ];

    const handleSelectLanguage = (code) => {
        i18n.changeLanguage(code);
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-[#070b12] flex items-center justify-center p-6 text-pretendard animate-in fade-in duration-500">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="bg-cyber-panel/95 backdrop-blur-2xl border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col items-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-cyber-cyan/10 rounded-full flex items-center justify-center mb-6 border border-cyber-cyan/30 shadow-neon-cyan relative">
                    <Globe size={32} className="text-cyber-cyan" />
                </div>

                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-8">Select Language</h2>

                <div className="flex flex-col gap-4 w-full relative z-10">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelectLanguage(lang.code)}
                            className="w-full bg-black/40 border border-white/5 py-5 rounded-2xl flex items-center justify-between px-6 hover:bg-white/10 hover:border-cyber-cyan/50 hover:shadow-[0_0_15px_rgba(64,255,220,0.2)] transition-all active:scale-95 group"
                        >
                            <span className="text-xl font-bold text-white group-hover:text-cyber-cyan transition-colors">{lang.label}</span>
                            <span className="text-sm font-medium text-gray-500">{lang.desc}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LanguageSelectorScreen;
