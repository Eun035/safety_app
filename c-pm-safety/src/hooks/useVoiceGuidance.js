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

    const speak = useCallback((text) => {
        // 지원하지 않는 환경이면 즉시 리턴하여 에러 방지
        if (!isSupported || typeof window === 'undefined' || !window.speechSynthesis) {
            return;
        }

        try {
            window.speechSynthesis.cancel();

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

            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("TTS 발화 중 오류 발생:", e);
        }

    }, [i18n.language, isSupported]);

    return { speak, voicesLoaded, isSupported };
};
