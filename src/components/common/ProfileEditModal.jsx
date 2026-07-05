// src/components/common/ProfileEditModal.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Camera, Save } from 'lucide-react';
import { useUserStore } from '../../hooks/useUserStore';
import { toast } from '../../hooks/useToast';

const PRESET_AVATARS = [
    '', // 기본 (Me 텍스트)
    'https://api.dicebear.com/7.x/bottts/svg?seed=c-safe-1',
    'https://api.dicebear.com/7.x/bottts/svg?seed=c-safe-2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=c-safe-3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=c-safe-4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=c-safe-5',
];

const ProfileEditModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { profile, updateProfile } = useUserStore();
    const [nickname, setNickname] = useState('');
    const [age, setAge] = useState('');
    const [avatar, setAvatar] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && profile) {
            setNickname(profile.nickname || '');
            setAge(profile.age || '');
            setAvatar(profile.profile_image || '');
        }
    }, [isOpen, profile]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!nickname.trim()) {
            toast(t('pe_need_nickname'), 'error');
            return;
        }

        setIsSaving(true);
        await updateProfile({
            nickname: nickname.trim(),
            age: age ? parseInt(age, 10) : null,
            profile_image: avatar,
        });
        setIsSaving(false);
        toast(t('pe_updated'), 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-[#12161b] w-full max-w-sm rounded-[2rem] p-6 shadow-[0_0_40px_rgba(64,255,220,0.15)] border border-cyber-cyan/20 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-white text-xl font-black tracking-tighter uppercase">Edit Profile</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full bg-white/5 active:scale-95">
                        <X size={20} />
                    </button>
                </div>

                {/* Avatar Selection */}
                <div className="mb-8 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full border-2 border-cyber-cyan shadow-neon-cyan flex items-center justify-center bg-[#1a1f2e] overflow-hidden mb-4 relative group cursor-pointer" onClick={() => setAvatar('')}>
                        {avatar ? (
                            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-cyber-cyan text-2xl font-black">{nickname?.[0] || 'K'}</span>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white" size={24} />
                        </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto w-full pb-2 scrollbar-hide justify-center">
                        {PRESET_AVATARS.map((preset, idx) => (
                            <button
                                key={idx}
                                onClick={() => setAvatar(preset)}
                                className={`w-10 h-10 rounded-full shrink-0 border-2 overflow-hidden flex items-center justify-center ${avatar === preset ? 'border-cyber-cyan shadow-[0_0_8px_rgba(64,255,220,0.8)]' : 'border-transparent bg-white/5'}`}
                            >
                                {preset ? <img src={preset} alt="preset" className="w-full h-full object-cover" /> : <span className="text-gray-400 text-[10px] font-bold">Me</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Nickname</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder={t('pe_nickname_ph')}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-600 focus:outline-none focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/50 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Age (Optional)</label>
                        <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder={t('pe_age_ph')}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold placeholder-gray-600 focus:outline-none focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/50 transition-all"
                        />
                        <p className="text-[9px] text-gray-500 mt-1">{t('pe_senior_hint')}</p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-4 bg-cyber-cyan text-black font-black text-sm uppercase tracking-widest rounded-xl shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Save size={18} /> {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
            </div>
        </div>
    );
};

export default ProfileEditModal;
