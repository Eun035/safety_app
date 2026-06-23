import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Web Speech Recognition API 래퍼.
// Chrome/Edge는 webkitSpeechRecognition, 표준 SpeechRecognition도 일부 지원.
// Firefox / 일부 iOS WebView는 미지원 → isSupported=false로 폴백.
const getRecognitionCtor = () => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const LANG_MAP = {
    ko: 'ko-KR',
    en: 'en-US',
    ja: 'ja-JP',
    'zh-CN': 'zh-CN',
    zh: 'zh-CN'
};

export const useSpeechRecognition = ({ onResult, onError } = {}) => {
    const { i18n } = useTranslation();
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef(null);
    const onResultRef = useRef(onResult);
    const onErrorRef = useRef(onError);

    onResultRef.current = onResult;
    onErrorRef.current = onError;

    useEffect(() => {
        const Ctor = getRecognitionCtor();
        setIsSupported(Boolean(Ctor));
    }, []);

    const start = useCallback(() => {
        const Ctor = getRecognitionCtor();
        if (!Ctor) {
            onErrorRef.current?.('unsupported');
            return;
        }

        // 이전 인스턴스가 살아있으면 정리
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* noop */ }
            recognitionRef.current = null;
        }

        const recognition = new Ctor();
        const lang = i18n.language || (typeof window !== 'undefined' ? window.localStorage.getItem('i18nextLng') : null) || 'ko';
        recognition.lang = LANG_MAP[lang] || LANG_MAP[lang?.split('-')[0]] || 'ko-KR';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
        };
        recognition.onerror = (event) => {
            setIsListening(false);
            recognitionRef.current = null;
            onErrorRef.current?.(event.error || 'unknown');
        };
        recognition.onresult = (event) => {
            const transcript = event.results?.[0]?.[0]?.transcript;
            if (transcript) onResultRef.current?.(transcript.trim());
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (err) {
            // 이미 시작된 경우 등 — 무시
            console.warn('[C-Safe] SpeechRecognition start failed:', err);
            setIsListening(false);
        }
    }, [i18n.language]);

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* noop */ }
        }
    }, []);

    // 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* noop */ }
                recognitionRef.current = null;
            }
        };
    }, []);

    return { start, stop, isListening, isSupported };
};
