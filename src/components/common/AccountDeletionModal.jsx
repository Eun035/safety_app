import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, X, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from '../../hooks/useToast';

// 떠나기 전 짧은 의견을 받아 feedbacks 테이블에 적재, 그 다음 signOut + localStorage 정리 + 리로드.
// PWA는 OS 레벨 앱 삭제 이벤트가 없으므로 "계정 탈퇴"가 표준 대체 흐름.

const ISSUE_TAGS = [
    { key: 'app_slow', label: 'ad_tag_app_slow' },
    { key: 'ui_difficult', label: 'ad_tag_ui_difficult' },
    { key: 'features_missing', label: 'ad_tag_features_missing' },
    { key: 'safety_inaccurate', label: 'ad_tag_safety_inaccurate' },
    { key: 'reward_low', label: 'ad_tag_reward_low' },
    { key: 'ads_too_many', label: 'ad_tag_ads_too_many' },
    { key: 'battery_drain', label: 'ad_tag_battery_drain' },
    { key: 'no_longer_need', label: 'ad_tag_no_longer_need' },
    { key: 'other', label: 'ad_tag_other' }
];

const LOCALSTORAGE_PREFIXES_TO_CLEAR = ['c_safe_', 'csafe_'];

const clearLocalAppData = () => {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && LOCALSTORAGE_PREFIXES_TO_CLEAR.some(p => k.startsWith(p))) {
                keysToRemove.push(k);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
        /* 사파리 사생활 모드 등 */
    }
};

const AccountDeletionModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [rating, setRating] = useState(0);
    const [tags, setTags] = useState(new Set());
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmStep, setConfirmStep] = useState(false);

    if (!isOpen) return null;

    const resetAll = () => {
        setRating(0);
        setTags(new Set());
        setComments('');
        setConfirmStep(false);
        setIsSubmitting(false);
    };

    const handleClose = () => {
        if (isSubmitting) return;
        resetAll();
        onClose();
    };

    const toggleTag = (key) => {
        setTags(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // feedbacks 테이블 schema: rating(1-5 NOT NULL), tags TEXT[], comments TEXT
            // 탈퇴 흐름임을 마킹하기 위해 account_deletion 태그를 항상 포함
            const allTags = [...tags, 'account_deletion'];
            const safeRating = rating > 0 ? rating : 3; // NOT NULL이라 미응답 시 중립값 3

            const { error: feedbackError } = await supabase
                .from('feedbacks')
                .insert([{
                    rating: safeRating,
                    tags: allTags,
                    comments: comments?.trim() || null
                }]);

            if (feedbackError) {
                // 사용자에게 분명히 알리기 — 탈퇴는 계속 진행하되 피드백 저장 실패 사실은 노출
                console.error('[C-Safe] feedback insert 실패:', feedbackError);
                toast(t('ad_feedback_fail', { err: feedbackError.message || feedbackError.code || '?' }), 'error');
            } else {
                console.log('[C-Safe] feedback insert 성공');
            }

            // 로그아웃
            try { await supabase.auth.signOut(); } catch (e) {
                console.warn('[C-Safe] signOut 실패:', e?.message);
            }

            // 로컬 데이터 정리
            clearLocalAppData();

            toast(t('ad_thanks'), 'success');

            // 잠시 토스트 보여준 뒤 리로드 (앱 상태 완전 초기화)
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err) {
            console.error('[C-Safe] 탈퇴 처리 중 오류:', err);
            toast(t('ad_error'), 'error');
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[2700] bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 text-pretendard animate-in fade-in duration-300"
            style={{
                paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
            }}
        >
            <div className="bg-[#0e1116] w-full max-w-md rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-7 shadow-2xl relative border border-white/10 flex flex-col">

                {/* 닫기 */}
                <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white active:scale-95 transition disabled:opacity-50"
                    aria-label={t('close')}
                >
                    <X size={18} />
                </button>

                {!confirmStep ? (
                    // ── Survey Step ───────────────────────────────────────
                    <>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">💚</span>
                            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                                {t('ad_title1')}<br />{t('ad_title2')}
                            </h2>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-5 sm:mb-6">
                            {t('ad_desc1')}
                            <br />{t('ad_desc2')}
                        </p>

                        {/* Rating */}
                        <div className="mb-5">
                            <p className="text-xs font-black text-gray-300 uppercase tracking-wider mb-2">
                                {t('ad_rating')}
                            </p>
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setRating(n)}
                                        className={`flex-1 py-3 rounded-xl border transition-all active:scale-95 ${
                                            n <= rating
                                                ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                        aria-label={t('ad_star_aria', { n })}
                                    >
                                        <Star
                                            className={`w-5 h-5 mx-auto ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-500'}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="mb-5">
                            <p className="text-xs font-black text-gray-300 uppercase tracking-wider mb-2">
                                {t('ad_what_missing')} <span className="text-gray-500 normal-case font-medium">{t('ad_multi')}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {ISSUE_TAGS.map(tag => {
                                    const active = tags.has(tag.key);
                                    return (
                                        <button
                                            key={tag.key}
                                            type="button"
                                            onClick={() => toggleTag(tag.key)}
                                            className={`px-3 py-2 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                                                active
                                                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_10px_rgba(64,255,220,0.25)]'
                                                    : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                                            }`}
                                        >
                                            {t(tag.label)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Comments */}
                        <div className="mb-6">
                            <p className="text-xs font-black text-gray-300 uppercase tracking-wider mb-2">
                                {t('ad_improve')} <span className="text-gray-500 normal-case font-medium">{t('ad_optional')}</span>
                            </p>
                            <textarea
                                value={comments}
                                onChange={e => setComments(e.target.value)}
                                placeholder={t('ad_placeholder')}
                                rows={3}
                                maxLength={500}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-cyber-cyan/40 resize-none"
                            />
                            <p className="text-[10px] text-gray-500 mt-1 text-right">{comments.length}/500</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 sm:gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3.5 sm:py-4 rounded-xl font-black text-sm uppercase tracking-wider bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition"
                            >
                                {t('eg_cancel')}
                            </button>
                            <button
                                onClick={() => setConfirmStep(true)}
                                className="flex-[2] py-3.5 sm:py-4 rounded-xl font-black text-sm uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 active:scale-95 transition shadow-lg shadow-red-600/30"
                            >
                                {t('ad_send_delete')}
                            </button>
                        </div>
                    </>
                ) : (
                    // ── Confirm Step ──────────────────────────────────────
                    <>
                        <div className="flex flex-col items-center text-center pt-2">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3">
                                <AlertTriangle className="w-7 h-7 text-red-400" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-white mb-2">
                                {t('ad_confirm_title')}
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-5 sm:mb-6">
                                {t('ad_del_before')}<span className="text-red-400 font-bold">{t('ad_del_perm')}</span>{t('ad_del_after')}
                                <br />{t('ad_del_norecover')}
                            </p>

                            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left">
                                <ul className="text-xs sm:text-sm text-gray-300 space-y-1.5">
                                    <li>{t('ad_item_profile')}</li>
                                    <li>{t('ad_item_rides')}</li>
                                    <li>{t('ad_item_points')}</li>
                                    <li>{t('ad_item_cache')}</li>
                                </ul>
                            </div>

                            <div className="flex gap-2 sm:gap-3 w-full">
                                <button
                                    onClick={() => setConfirmStep(false)}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3.5 sm:py-4 rounded-xl font-black text-sm uppercase tracking-wider bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition disabled:opacity-50"
                                >
                                    {t('ad_go_back')}
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-[2] py-3.5 sm:py-4 rounded-xl font-black text-sm uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 active:scale-95 transition shadow-lg shadow-red-600/30 disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('ad_processing')}</>
                                        : t('ad_perm_delete_btn')
                                    }
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AccountDeletionModal;
