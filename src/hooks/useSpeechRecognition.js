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

// Permissions API로 mic 상태 조회 (지원 안 하면 'unknown')
const queryMicPermission = async () => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
        return 'unknown';
    }
    try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        return result.state; // 'granted' | 'prompt' | 'denied'
    } catch {
        return 'unknown';
    }
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

    const start = useCallback(async () => {
        const Ctor = getRecognitionCtor();
        if (!Ctor) {
            onErrorRef.current?.('unsupported');
            return;
        }

        // HTTPS 체크 (localhost 제외)
        if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            onErrorRef.current?.('insecure-context');
            return;
        }

        // Permissions API로 사전 체크 (블로킹 X — 지원 안 하거나 unknown이면 그냥 진행)
        // 명시적으로 'denied'인 경우만 가로채기. 그 외엔 SpeechRecognition.start()가
        // 알아서 다이얼로그를 띄우거나 not-allowed 에러를 onerror로 던져준다.
        const permState = await queryMicPermission();
        if (permState === 'denied') {
            onErrorRef.current?.('not-allowed');
            return;
        }

        // 이전 인스턴스 정리
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* noop */ }
            recognitionRef.current = null;
        }

        const recognition = new Ctor();
        const lang = i18n.language || (typeof window !== 'undefined' ? window.localStorage.getItem('i18nextLng') : null) || 'ko';
        recognition.lang = LANG_MAP[lang] || LANG_MAP[lang?.split('-')[0]] || 'ko-KR';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 5;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
        };
        recognition.onerror = (event) => {
            setIsListening(false);
            recognitionRef.current = null;
            console.warn('[C-Safe] SpeechRecognition onerror:', event.error);
            onErrorRef.current?.(event.error || 'unknown');
        };
        recognition.onresult = (event) => {
            const result = event.results?.[0];
            if (!result || result.length === 0) return;
            const seen = new Set();
            const alternatives = [];
            for (let i = 0; i < result.length; i++) {
                const t = result[i]?.transcript?.trim();
                if (t && !seen.has(t)) {
                    seen.add(t);
                    alternatives.push(t);
                }
            }
            if (alternatives.length === 0) return;
            console.log('[C-Safe] SpeechRecognition result:', alternatives);
            onResultRef.current?.(alternatives[0], alternatives);
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (err) {
            console.warn('[C-Safe] SpeechRecognition start failed:', err);
            setIsListening(false);
            onErrorRef.current?.('start-failed');
        }
    }, [i18n.language]);

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* noop */ }
        }
    }, []);

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
