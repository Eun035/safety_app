import { create } from 'zustand';
import i18n from '../locales/i18n';

// 아직 번역되지 않은 한글 토스트는 비-한국어 설정에서 표시하지 않는다.
// (한국어 제공만, 다른 언어에서는 조용히 스킵 — 잘못된 언어 노출 방지)
const HANGUL_RE = /[가-힣]/;
const shouldSuppress = (message) => {
    if (typeof message !== 'string') return false;
    const lang = i18n?.language || 'ko';
    return HANGUL_RE.test(message) && !lang.startsWith('ko');
};

/**
 * C-Safe 글로벌 토스트 알림 시스템
 * alert() 대체용 - Zustand 기반으로 어디서든 호출 가능
 */
export const useToast = create((set, get) => ({
    toasts: [],

    /**
     * 토스트 메시지 표시
     * @param {string} message 표시할 메시지
     * @param {'info'|'success'|'error'|'warning'} type 토스트 유형
     * @param {number} duration 자동 닫힘 시간(ms), 기본 3500ms
     */
    show: (message, type = 'info', duration = 3500) => {
        // 번역 안 된 한글 토스트는 비-한국어 설정에서 무음 처리
        if (shouldSuppress(message)) return null;
        const id = Date.now() + Math.random();
        set(state => ({
            toasts: [...state.toasts.slice(-2), { id, message, type }]
        }));
        setTimeout(() => {
            get().remove(id);
        }, duration);
        return id;
    },

    remove: (id) => {
        set(state => ({
            toasts: state.toasts.filter(t => t.id !== id)
        }));
    },

    clear: () => set({ toasts: [] }),
}));

/**
 * React 훅 외부(이벤트 핸들러, 비동기 콜백)에서 토스트 호출할 때 사용
 * 예: toast('메시지', 'success')
 */
export const toast = (message, type = 'info', duration = 3500) => {
    useToast.getState().show(message, type, duration);
};
