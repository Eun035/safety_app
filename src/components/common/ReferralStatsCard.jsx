import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Gift, Copy, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { buildReferralCode, buildReferralUrl } from '../../utils/referral';
import { toast } from '../../hooks/useToast';

/**
 * 추천 통계 카드 — 내가 데려온 친구 수 / 적립 포인트 / 본인 추천 링크 공유.
 * PersonalInsights "Activity" 탭 안에 삽입.
 */
const ReferralStatsCard = ({ userId }) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState({ invited: 0, completed: 0, pending: 0, earnedPoints: 0 });
    const referralCode = buildReferralCode(userId);
    const referralUrl = buildReferralUrl(referralCode);

    useEffect(() => {
        if (!userId) return;
        let canceled = false;

        const fetchStats = async () => {
            try {
                const { data, error } = await supabase
                    .from('referrals')
                    .select('invitee_user_id, signed_up_at, reward_granted, first_ride_at')
                    .eq('inviter_code', referralCode);

                if (error) {
                    console.warn('[referral] stats fetch error:', error.message);
                    return;
                }
                if (canceled) return;

                const rows = data || [];
                const signedUp = rows.filter(r => r.signed_up_at && r.invitee_user_id);
                const completed = rows.filter(r => r.reward_granted);
                setStats({
                    invited: signedUp.length,
                    completed: completed.length,
                    pending: Math.max(0, signedUp.length - completed.length),
                    earnedPoints: completed.length * 500
                });
            } catch (e) {
                console.warn('[referral] stats fetch failed:', e?.message || e);
            }
        };

        fetchStats();
        return () => { canceled = true; };
    }, [userId, referralCode]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(referralUrl);
            toast(t('rsc_copied'), 'success');
        } catch (e) {
            toast(t('rsc_copy_fail'), 'error');
        }
    };

    const shareLink = async () => {
        const text = t('rsc_share_text', { url: referralUrl });
        try {
            if (navigator.share) {
                await navigator.share({ title: t('rsc_share_title'), text, url: referralUrl });
                return;
            }
        } catch (e) { /* 취소 등은 무시 */ }
        copyLink();
    };

    return (
        <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden shadow-inner">
            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users size={12} /> {t('rsc_invite')}
            </h3>

            {/* 통계 3개 */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <StatItem label={t('rsc_stat_joined')} value={stats.invited} accent="text-cyber-cyan" />
                <StatItem label={t('rsc_stat_completed')} value={stats.completed} accent="text-cyber-green" />
                <StatItem label={t('rsc_stat_points')} value={`+${stats.earnedPoints}P`} accent="text-yellow-300" />
            </div>

            {/* 진행 중 안내 */}
            {stats.pending > 0 && (
                <div className="text-[10px] font-bold text-gray-400 bg-white/5 rounded-xl p-2.5 mb-4 flex items-center gap-2">
                    <Gift size={12} className="text-cyber-cyan" />
                    {t('rsc_pending', { n: stats.pending })}
                </div>
            )}

            {/* 추천 코드 + 링크 액션 */}
            <div className="bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-2xl p-3.5 mb-3">
                <div className="text-[9px] font-black text-cyber-cyan uppercase tracking-widest mb-1">{t('rsc_my_code')}</div>
                <div className="text-lg font-black text-white tracking-[0.25em]">{referralCode}</div>
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={copyLink}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 font-black text-[11px] hover:bg-white/10 active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                    <Copy size={13} /> {t('rsc_copy_link')}
                </button>
                <button
                    type="button"
                    onClick={shareLink}
                    className="flex-[1.4] py-3 rounded-xl bg-cyber-cyan text-black font-black text-[11px] shadow-neon-cyan hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                    <Share2 size={13} /> {t('rsc_invite_friend')}
                </button>
            </div>
        </div>
    );
};

const StatItem = ({ label, value, accent }) => (
    <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center">
        <div className={`text-xl font-black ${accent} tracking-tight`}>{value}</div>
        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
);

export default ReferralStatsCard;
