import React, { useState, useEffect } from 'react';
import { HelpCircle, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVoiceGuidance } from '../../hooks/useVoiceGuidance';

const SafetyQuiz = ({ onComplete }) => {
    const { t } = useTranslation();
    const { speak, voicesLoaded } = useVoiceGuidance();

    /** * [2026 최신 법규 반영 데이터 — 총 13문항, 매 시도마다 3개 랜덤 추출]
     *  1. 2인 탑승 허용 (X)        2. 인도 주행 원칙 (X)        3. 안전모 착용 의무 (O)
     *  4. 시속 25km 초과 (X)       5. 음주 후 운행 가능 (X)     6. 기본 점검 필수 (O)
     *  8. 야간 전조등 필수 (O)     9. 13세 미만 금지 (O)
     * 10. 주행 중 휴대폰 사용 (X) 11. 음주 벌금 1만 원 이하 (X) 12. 횡단보도 끌고 가기 (O)
     * 13. 양쪽 이어폰 위험 (O)    14. 무단 방치 위반 (O)
     * (quiz_q7 무면허 항목은 2026-05-28 삭제 — 키 번호는 호환성 위해 유지)
     */
    const quizDataArray = [
        { question: t("quiz_q1"),  answer: false, desc: t("quiz_desc1") },
        { question: t("quiz_q2"),  answer: false, desc: t("quiz_desc2") },  // 인도 주행 원칙 아님 (X)
        { question: t("quiz_q3"),  answer: true,  desc: t("quiz_desc3") },  // 안전모 착용 의무 (O)
        { question: t("quiz_q4"),  answer: false, desc: t("quiz_desc4") },
        { question: t("quiz_q5"),  answer: false, desc: t("quiz_desc5") },  // 음주 운행 불가능 (X)
        { question: t("quiz_q6"),  answer: true,  desc: t("quiz_desc6") },
        { question: t("quiz_q8"),  answer: true,  desc: t("quiz_desc8") },
        { question: t("quiz_q9"),  answer: true,  desc: t("quiz_desc9") },
        { question: t("quiz_q10"), answer: false, desc: t("quiz_desc10") }, // 주행 중 휴대폰 사용 불가 (X)
        { question: t("quiz_q11"), answer: false, desc: t("quiz_desc11") }, // 음주 벌금 1만 원 이하 아님 (X)
        { question: t("quiz_q12"), answer: true,  desc: t("quiz_desc12") }, // 횡단보도 끌고 가기 (O)
        { question: t("quiz_q13"), answer: true,  desc: t("quiz_desc13") }, // 양쪽 이어폰 위험 (O)
        { question: t("quiz_q14"), answer: true,  desc: t("quiz_desc14") }, // 무단 방치 위반 (O)
    ];

    const [shuffledQuiz, setShuffledQuiz] = useState(() => {
        // 컴포넌트 마운트 시 최초 즉시 3개 추출
        return [...quizDataArray].sort(() => 0.5 - Math.random()).slice(0, 3);
    });
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selected, setSelected] = useState(null);
    const [isDone, setIsDone] = useState(false);
    const [hasSpokenInit, setHasSpokenInit] = useState(false);
    const [isQuizStarted, setIsQuizStarted] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);

    useEffect(() => {
        if (isQuizStarted && shuffledQuiz.length > 0 && voicesLoaded && !hasSpokenInit) {
            setHasSpokenInit(true);
        }
    }, [isQuizStarted, shuffledQuiz, voicesLoaded, hasSpokenInit]);

    const nextQuiz = () => {
        if (currentIdx < shuffledQuiz.length - 1) {
            const nextIdx = currentIdx + 1;
            setCurrentIdx(nextIdx);
            setSelected(null);
            speak(`${t("next_question_is")} ${shuffledQuiz[nextIdx].question}`, 'QUIZ');
        } else {
            setIsDone(true);
            speak(t("EDUCATED RIDER"), 'QUIZ');
        }
    };

    const handleAnswer = (choice) => {
        if (selected !== null || shuffledQuiz.length === 0) return;
        setSelected(choice);

        const isCorrect = choice === shuffledQuiz[currentIdx].answer;
        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
            speak(`${t("CORRECT")}!`, 'QUIZ_FEEDBACK');
        } else {
            speak(`${t("INCORRECT")}.`, 'QUIZ_FEEDBACK');
        }

        setTimeout(() => {
            nextQuiz();
        }, 1500);
    };

    if (isDone) {
        return (
            <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-pretendard animate-in fade-in duration-500">
                <div className="flex flex-col items-center justify-center p-10 bg-cyber-panel/90 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-[0_0_50px_rgba(64,255,220,0.1)] w-full max-w-sm text-center animate-in zoom-in duration-300 overflow-hidden">
                    <div className="w-20 h-20 bg-cyber-green/10 rounded-full flex items-center justify-center mb-6 border border-cyber-green/30 relative overflow-hidden">
                        <Check size={40} className="text-cyber-green drop-shadow-[0_0_10px_rgba(56,239,125,0.8)] relative z-10" />
                        <div className="absolute inset-0 bg-cyber-green/5 blur-xl"></div>
                    </div>
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">{t("EDUCATED RIDER")}</h2>
                    <p className="text-gray-400 font-medium mb-8 leading-relaxed">
                        {t("onboarding_desc")}
                    </p>
                    <button
                        onClick={() => onComplete(correctCount)}
                        className="w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-neon-cyan bg-cyber-cyan text-black active:scale-95"
                    >
                        {t("Access Map")}
                    </button>
                </div>
            </div>
        );
    }

    if (shuffledQuiz.length === 0) return null;

    if (!isQuizStarted) {
        return (
            <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-pretendard animate-in fade-in duration-500">
                <div className="bg-cyber-panel/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.8)] p-10 text-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-cyber-cyan/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyber-cyan/30">
                        <HelpCircle size={40} className="text-cyber-cyan shadow-neon-cyan" />
                    </div>
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">{t("quiz_title")}</h2>
                    <p className="text-gray-400 font-medium mb-10 leading-relaxed text-sm">
                        안전한 주행을 위한 필수 지식 테스트입니다.<br />문제를 잘 듣고 O/X를 선택해 주세요.
                    </p>
                    <button
                        onClick={() => {
                            try {
                                const silence = new Audio("data:audio/mp3;base64,//MkxAAQAAAAgAFAAAhAAAMoAQAAAE/gAAAAAABzwAAAAABwAAhAAAMoAQAAAE/gAAAAAABzwAAAAAAA=");
                                silence.play().catch(e => console.log('Audio init skipped', e));
                            } catch (e) { }
                            speak(`${t("quiz_start")} ${t("next_question_is")} ${shuffledQuiz[0].question}`, 'QUIZ');
                            setIsQuizStarted(true);
                        }}
                        className="w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-neon-cyan bg-cyber-cyan text-black active:scale-95 flex items-center justify-center gap-2"
                    >
                        테스트 시작하기
                    </button>
                </div>
            </div>
        );
    }

    const currentQuiz = shuffledQuiz[currentIdx];

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-pretendard animate-in fade-in duration-500">
            <div className="bg-cyber-panel/95 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.8)] p-8 relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
                    <div
                        className="h-full bg-cyber-cyan transition-all duration-700 shadow-neon-cyan"
                        style={{ width: `${((currentIdx + 1) / shuffledQuiz.length) * 100}%` }}
                    />
                </div>

                <div className="flex items-center justify-between mb-8 pt-2">
                    <div className="flex items-center gap-2 text-cyber-cyan font-black text-xs uppercase tracking-[0.2em] italic">
                        <HelpCircle size={18} />
                        <span>{t("quiz_title")} {currentIdx + 1}/{shuffledQuiz.length}</span>
                    </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-10 leading-snug">
                    {currentQuiz.question}
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                        onClick={() => handleAnswer(true)}
                        disabled={selected !== null}
                        className={`py-8 rounded-2xl border-2 font-black text-4xl transition-all flex justify-center items-center ${selected === true
                            ? (currentQuiz.answer === true ? 'bg-cyber-green/10 border-cyber-green text-cyber-green shadow-[0_0_20px_rgba(56,239,125,0.3)]' : 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]')
                            : 'bg-black/40 border-white/5 text-gray-500 hover:border-cyber-cyan/50 hover:text-cyber-cyan'
                            } ${selected !== null && selected !== true ? 'opacity-20' : ''}`}
                    >
                        O
                    </button>
                    <button
                        onClick={() => handleAnswer(false)}
                        disabled={selected !== null}
                        className={`py-8 rounded-2xl border-2 font-black text-4xl transition-all flex justify-center items-center ${selected === false
                            ? (currentQuiz.answer === false ? 'bg-cyber-green/10 border-cyber-green text-cyber-green shadow-[0_0_20px_rgba(56,239,125,0.3)]' : 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]')
                            : 'bg-black/40 border-white/5 text-gray-500 hover:border-cyber-cyan/50 hover:text-cyber-cyan'
                            } ${selected !== null && selected !== false ? 'opacity-20' : ''}`}
                    >
                        X
                    </button>
                </div>

                {selected !== null && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 mb-2">
                        <div className={`p-5 rounded-[1.5rem] border flex items-start gap-4 backdrop-blur-md ${selected === currentQuiz.answer ? 'bg-cyber-green/10 border-cyber-green/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <div className="mt-1 flex-shrink-0">
                                {selected === currentQuiz.answer ? <Check size={20} className="text-cyber-green" /> : <X size={20} className="text-red-500" />}
                            </div>
                            <div>
                                <div className={`font-black mb-1 uppercase tracking-widest text-[10px] ${selected === currentQuiz.answer ? 'text-cyber-green' : 'text-red-500'}`}>
                                    {selected === currentQuiz.answer ? t("CORRECT") : t("INCORRECT")}
                                </div>
                                <p className="text-xs font-semibold leading-relaxed text-gray-200">{currentQuiz.desc}</p>
                            </div>
                        </div>
                        <p className="text-center text-[10px] text-cyber-cyan/60 mt-6 font-black animate-pulse uppercase tracking-[0.25em]">{t("Next Question")}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SafetyQuiz;