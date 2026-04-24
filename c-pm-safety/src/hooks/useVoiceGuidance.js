import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 전동 킥보드 안전 주행을 위한 음성 안내 훅
 * Web Speech API (SpeechSynthesis)를 사용하여 텍스트를 음성으로 변환합니다.
 */
export const useVoiceGuidance = () => {
    const { i18n } = useTranslation();
    const [voicesLoaded, setVoicesLoaded] = useState(false);

    useEffect(() => {
        const handleVoicesChanged = () => {
            setVoicesLoaded(true);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            setTimeout(() => setVoicesLoaded(true), 0);
        }

        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
        }

        // 모바일(iOS 등) 환경 전역 오디오 권한 잠금 해제를 위한 1회용 터치 리스너
        const unlockAudio = () => {
            if (window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance('');
                utterance.volume = 0;
                window.speechSynthesis.speak(utterance);
            }
            // 한 번 실행 후 바로 리스너 해제 (불필요한 리소스 낭비 방지)
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('click', unlockAudio);
        };

        document.addEventListener('touchstart', unlockAudio, { once: true });
        document.addEventListener('click', unlockAudio, { once: true });

        return () => {
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('click', unlockAudio);
        };
    }, []);

    const speak = useCallback((text) => {
        if (!window.speechSynthesis) {
            console.warn('이 브라우저는 음성 합성을 지원하지 않습니다.');
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        let locale = 'ko-KR';
        const currentLang = i18n.language || window.localStorage.getItem('i18nextLng') || 'ko';

        if (currentLang.startsWith('en')) locale = 'en-US';
        else if (currentLang.startsWith('ja')) locale = 'ja-JP';
        else if (currentLang.startsWith('zh')) locale = 'zh-CN';
        else locale = 'ko-KR';

        utterance.lang = locale;

        let availableVoices = window.speechSynthesis.getVoices();

        if (availableVoices.length > 0) {
            const isoLang = locale.split('-')[0].toLowerCase();

            // 더 넓은 범위의 매칭: lang 코드 일치 또는 보이스 이름에 언어명 포함
            const matchingVoices = availableVoices.filter(v => {
                const vLang = v.lang.toLowerCase();
                const vName = v.name.toLowerCase();
                // 언어 코드 직접 포함 (예: ja-JP -> ja 포함)
                if (vLang.includes(isoLang)) return true;
                // 보이스 이름으로 매칭 (예: Microsoft Ayumi Desktop - Japanese)
                if (isoLang === 'ja' && vName.includes('japan')) return true;
                if (isoLang === 'zh' && (vName.includes('chinese') || vName.includes('mandarin') || vName.includes('taiwan') || vName.includes('hong kong'))) return true;
                if (isoLang === 'en' && vName.includes('english')) return true;
                if (isoLang === 'ko' && vName.includes('korea')) return true;
                return false;
            });

            let voice = null;

            if (matchingVoices.length > 0) {
                // 1순위: 브라우저 제공 고품질 네이티브 보이스 (Google)
                voice = matchingVoices.find(v => v.name.includes('Google'));

                // 2순위: OS 기본 고품질 보이스 (Apple, Microsoft, Siri)
                if (!voice) {
                    voice = matchingVoices.find(v => v.name.includes('Apple') || v.name.includes('Siri') || v.name.includes('Microsoft'));
                }

                // 3순위: 리스트의 첫 번째 매칭 보이스
                if (!voice) {
                    voice = matchingVoices[0];
                }
            }

            // 아주 극단적인 케이스로 언어팩은 있는데 이름에 english가 없는 경우 대비
            if (!voice && currentLang.startsWith('en')) {
                voice = availableVoices.find(v => v.lang.toLowerCase().startsWith('en'));
            }

            if (voice) {
                utterance.voice = voice;
            }
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // 모바일 브라우저(iOS Safari 등)의 사용자 인터랙션 기반 자동재생 정책 해제를 위한 동기 호출 처리
        // 텍스트가 비어있다면 권한 요청용 호출이므로 즉시 실행
        if (!text || text.trim() === '') {
            window.speechSynthesis.speak(utterance);
            return;
        }

        // 모바일 환경에서의 권한 블로킹을 우회하기 위해 모든 TTS 호출을 동기화하여 즉각 실행함
        window.speechSynthesis.speak(utterance);

    }, [i18n.language]);

    return { speak, voicesLoaded };
};
