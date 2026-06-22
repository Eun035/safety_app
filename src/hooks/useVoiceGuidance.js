import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 전동 킥보드 안전 주행을 위한 음성 안내 훅
 * Web Speech API (SpeechSynthesis)를 사용하여 텍스트를 음성으로 변환합니다.
 */
export const useVoiceGuidance = () => {
    const { i18n } = useTranslation();
    const [voicesLoaded, setVoicesLoaded] = useState(false);
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        // 🚀 TTS 초기화 및 지원 여부 확인 로직 (사용자 제안 반영)
        const initVoiceSetup = () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis !== null) {
                try {
                    const voices = window.speechSynthesis.getVoices();
                    if (voices.length > 0) {
                        setVoicesLoaded(true);
                    }

                    // voiceschanged 이벤트 핸들러 등록
                    window.speechSynthesis.onvoiceschanged = () => {
                        setVoicesLoaded(true);
                    };
                    
                    setIsSupported(true);
                    return true;
                } catch (e) {
                    console.warn("TTS 초기화 중 오류 발생:", e);
                    setIsSupported(false);
                    return false;
                }
            } else {
                console.warn("현재 브라우저(또는 웹뷰)에서는 음성 안내 기능을 지원하지 않습니다.");
                setIsSupported(false);
                return false;
            }
        };

        const supported = initVoiceSetup();

        // 모바일(iOS 등) 환경 전역 오디오 권한 잠금 해제를 위한 1회용 터치 리스너
        const unlockAudio = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                try {
                    const utterance = new SpeechSynthesisUtterance('');
                    utterance.volume = 0;
                    window.speechSynthesis.speak(utterance);
                } catch (e) {
                    console.error("Audio unlock failed:", e);
                }
            }
            // 한 번 실행 후 바로 리스너 해제
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('click', unlockAudio);
        };

        if (supported) {
            document.addEventListener('touchstart', unlockAudio, { once: true });
            document.addEventListener('click', unlockAudio, { once: true });
        }

        return () => {
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('click', unlockAudio);
        };
    }, []);

    // 🎚️ Escalation 프리셋 — 이어폰 금지 정책으로 외부 스피커 의존도가 높아진 만큼
    // 단계별 톤·속도·음량을 명확히 구분해 청각만으로 위급도 구분 가능하게 한다.
    // L1: 사전 예고 / L2: 근접 / L3: 진입 시점 / L4: 위반·긴급
    const ESCALATION_PRESETS = {
        L1: { rate: 0.95, pitch: 0.95, volume: 0.75, interrupt: false },
        L2: { rate: 1.0,  pitch: 1.05, volume: 0.9,  interrupt: false },
        L3: { rate: 1.1,  pitch: 1.15, volume: 1.0,  interrupt: true  },
        L4: { rate: 1.15, pitch: 1.25, volume: 1.0,  interrupt: true  },
        // 퀴즈 문제 낭독: 또렷·편안. 사용자가 중간에 답을 누르면 QUIZ_FEEDBACK이 즉시 끊고 들어감.
        QUIZ:          { rate: 0.85, pitch: 0.95, volume: 1.0, interrupt: true },
        // 정답/오답 즉답: 짧고 명료, 진행 중 발화를 무조건 잘라낸다.
        QUIZ_FEEDBACK: { rate: 1.0,  pitch: 1.05, volume: 1.0, interrupt: true }
    };

    const speak = useCallback((text, level = 'L2') => {
        // 지원하지 않는 환경이면 즉시 리턴하여 에러 방지
        if (!isSupported || typeof window === 'undefined' || !window.speechSynthesis) {
            return;
        }

        try {
            const preset = ESCALATION_PRESETS[level] || ESCALATION_PRESETS.L2;

            // L3·L4는 진행 중 발화를 강제 중단(긴급 우선), L1·L2는 진행 중이면 스킵
            if (preset.interrupt) {
                window.speechSynthesis.cancel();
            } else if (window.speechSynthesis.speaking) {
                return;
            }

            // 빈 텍스트면 건너뛰기 (초기화용 제외)
            if (text !== '' && (!text || text.trim() === '')) return;

            const utterance = new SpeechSynthesisUtterance(text);

            let locale = 'ko-KR';
            const currentLang = i18n.language || window.localStorage.getItem('i18nextLng') || 'ko';

            if (currentLang.startsWith('en')) locale = 'en-US';
            else if (currentLang.startsWith('ja')) locale = 'ja-JP';
            else if (currentLang.startsWith('zh')) locale = 'zh-CN';
            else locale = 'ko-KR';

            utterance.lang = locale;

            // 보이스 매칭 로직 (안전하게 감쌈)
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices && availableVoices.length > 0) {
                const isoLang = locale.split('-')[0].toLowerCase();
                const matchingVoices = availableVoices.filter(v => {
                    const vLang = v.lang.toLowerCase();
                    const vName = v.name.toLowerCase();
                    return vLang.includes(isoLang) ||
                           (isoLang === 'ja' && vName.includes('japan')) ||
                           (isoLang === 'zh' && (vName.includes('chinese') || vName.includes('mandarin'))) ||
                           (isoLang === 'ko' && vName.includes('korea'));
                });

                if (matchingVoices.length > 0) {
                    const preferredVoice = matchingVoices.find(v =>
                        v.name.includes('Google') || v.name.includes('Apple') || v.name.includes('Siri')
                    );
                    utterance.voice = preferredVoice || matchingVoices[0];
                }
            }

            utterance.rate = preset.rate;
            utterance.pitch = preset.pitch;
            utterance.volume = preset.volume;

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("TTS 발화 중 오류 발생:", e);
        }

    }, [i18n.language, isSupported]);

    return { speak, voicesLoaded, isSupported };
};
