import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Lock, X, Loader2 } from 'lucide-react';
import { useUserStore } from '../../hooks/useUserStore';

/**
 * 관리자 로그인.
 *
 * 예전에는 `prompt()` 결과를 소스에 박힌 "admin1234"와 비교했다. 번들만 열면
 * 보이는 데다, 서버는 관리자 여부를 전혀 모르니 RLS 판단에 쓸 수도 없었다.
 *
 * 이제 서버가 판정한다 — 이메일 로그인 후 is_admin() RPC로 확인하고,
 * 실제 데이터 접근은 RLS와 관리자 전용 RPC가 막는다. 이 화면을 우회해도
 * 대시보드에 데이터가 채워지지 않는다.
 *
 * 계정은 자가 가입이 불가하며(Supabase [auth.email] enable_signup = false),
 * 대시보드에서 만든 뒤 public.admin_users에 uid를 넣어야 권한이 생긴다.
 */
const AdminLoginModal = ({ isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const signInAsAdmin = useUserStore(s => s.signInAsAdmin);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e?.preventDefault();
        if (busy || !email.trim() || !password) return;
        setBusy(true);
        setError(null);
        const res = await signInAsAdmin(email.trim(), password);
        setBusy(false);
        if (res.ok) {
            setEmail('');
            setPassword('');
            onSuccess?.();
        } else {
            // 계정이 없는 것과 관리자가 아닌 것을 구분해서 알려주지 않는다
            // (계정 존재 여부를 흘리지 않기 위함).
            setError(t('adm_login_failed'));
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[3200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.form
                        onSubmit={submit}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-sm bg-cyber-panel border border-white/10 rounded-[2rem] p-6 shadow-2xl"
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center">
                                    <Lock size={18} className="text-cyber-cyan" />
                                </div>
                                <h2 className="text-sm font-black text-white tracking-tight">{t('adm_login_title')}</h2>
                            </div>
                            <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400" title={t('close')}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <input
                                type="email"
                                autoComplete="username"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder={t('adm_login_email')}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder-gray-600 focus:outline-none focus:border-cyber-cyan/50"
                            />
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={t('adm_login_password')}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder-gray-600 focus:outline-none focus:border-cyber-cyan/50"
                            />
                        </div>

                        {error && (
                            <p className="text-[11px] text-red-300 font-bold mt-3">{error}</p>
                        )}

                        <p className="text-[10px] text-gray-500 font-medium mt-3 leading-relaxed">
                            {t('adm_login_note')}
                        </p>

                        <button
                            type="submit"
                            disabled={busy || !email.trim() || !password}
                            className="mt-4 w-full py-3.5 rounded-2xl bg-cyber-cyan text-black font-black text-xs uppercase tracking-widest shadow-neon-cyan active:scale-95 transition disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {busy && <Loader2 size={14} className="animate-spin" />}
                            {t('adm_login_submit')}
                        </button>
                    </motion.form>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AdminLoginModal;
