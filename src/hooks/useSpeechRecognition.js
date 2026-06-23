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

// SpeechRecognition.start()가 일부 브라우저에서 권한 다이얼로그를 못 띄우고
// 바로 'not-allowed' 에러를 던지는 케이스가 있어서, getUserMedia로 먼저 명시적으로
// 마이크 권한을 요청한다. 권한 받은 뒤 stream은 즉시 정리하고 SpeechRecognition을 시작.
const ensureMicPermission = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        // getUserMedia 미지원 환경: 그냥 SpeechRecognition.start()에 맡김
        return 'unknown';
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 권한만 받고 즉시 트랙 정리 — SpeechRecognition이 다시 마이크 잡음
        stream.getTracks().forEach(t => t.stop());
        return 'granted';
    } catch (err) {
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
            return 'denied';
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            return 'no-device';
        }
        return 'error';
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

        // HTTPS 체크 (localhost 제외) — 안 그러면 권한 자체가 막힘
        if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            onErrorRef.current?.('insecure-context');
            return;
        }

        // 1) 마이크 권한 명시적 요청 (다이얼로그 강제 노출)
        const permResult = await ensureMicPermission();
        if (permResult === 'denied') {
            onErrorRef.current?.('not-allowed');
            return;
        }
        if (permResult === 'no-device') {
            onErrorRef.current?.('no-device');
            return;
        }

        // 2) 이전 인스턴스 정리
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* noop */ }
            recognitionRef.current = null;
        }

        // 3) SpeechRecognition 시작
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
            onErrorRef.current?.(event.error || 'unknown');
        };
        recognition.onresult = (event) => {
            const result = event.results?.[0];
            if (!result || result.length === 0) return;
            // 확률 순으로 정렬된 대안 후보 전부 수집 (중복·빈문자열 제거)
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
            // 1st arg: best, 2nd arg: 전체 후보 배열 (best 포함)
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
