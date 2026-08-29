import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ko from './ko';

// 번역 사전은 언어별 파일로 분리돼 있다(ko/en/ja/zh-CN).
// 기본어이자 fallback인 ko만 정적으로 포함하고, 나머지는 실제로 그 언어를
// 쓸 때 동적으로 불러온다 — 4개 언어를 전부 초기 번들에 싣지 않기 위함.
const loaders = {
    en: () => import('./en'),
    ja: () => import('./ja'),
    'zh-CN': () => import('./zh-CN'),
};

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh-CN'];

/**
 * 브라우저가 주는 코드(en-US, ja-JP, zh, zh-TW ...)를 지원 언어 코드로 정규화.
 * 매칭되지 않으면 기본어 ko.
 */
export function normalizeLanguage(lng) {
    const raw = (lng || '').toLowerCase();
    if (raw.startsWith('zh')) return 'zh-CN';
    const base = raw.split('-')[0];
    return SUPPORTED_LANGUAGES.includes(base) ? base : 'ko';
}

/**
 * 해당 언어 사전이 로드돼 있도록 보장한다. 이미 있으면 즉시 반환.
 * 로드에 실패해도 ko로 fallback되므로 앱은 계속 동작한다.
 */
export async function ensureLanguage(lng) {
    const code = normalizeLanguage(lng);
    if (code === 'ko' || i18n.hasResourceBundle(code, 'translation')) return code;

    try {
        const mod = await loaders[code]();
        i18n.addResourceBundle(code, 'translation', mod.default, true, true);
    } catch (e) {
        console.warn('[C-Safe] 번역 사전 로드 실패:', code, e);
    }
    return code;
}

/**
 * 사전을 먼저 확보한 뒤 언어를 바꾼다.
 * 이 순서를 지켜야 전환 직후 한국어가 잠깐 비치는 일이 없다.
 */
export async function changeLanguage(lng) {
    const code = await ensureLanguage(lng);
    await i18n.changeLanguage(code);
    return code;
}

i18n
    .use(LanguageDetector)   // 사용자 기기 언어 자동 감지
    .use(initReactI18next)   // React에 i18next 적용
    .init({
        resources: { ko: { translation: ko } },
        fallbackLng: 'ko',     // 기본 언어는 한국어
        // supportedLngs는 지정하지 않는다. 지정하면 init 단계에서 'en-US' 같은
        // 지역 변형이 곧바로 fallback(ko)으로 치환돼, 감지된 원래 값을 잃어
        // normalizeLanguage가 손댈 기회조차 없어진다. 정규화는 아래에서 직접 한다.
        interpolation: {
            escapeValue: false   // React는 기본적으로 XSS를 방어하므로 false
        }
    });

// 감지된 언어의 사전을 첫 렌더 전에 확보한다.
// main.jsx가 이 Promise를 기다린 뒤 앱을 그린다 → 한국어가 깜빡이지 않는다.
//
// changeLanguage는 항상 호출한다. init 시점엔 해당 언어의 사전이 아직 없어
// i18next가 languages를 ['ko']로 굳혀버리므로, 사전을 추가한 뒤 다시
// 해석시켜야 실제로 그 언어가 적용된다.
export const i18nReady = ensureLanguage(i18n.language)
    .then(code => i18n.changeLanguage(code));

export default i18n;
