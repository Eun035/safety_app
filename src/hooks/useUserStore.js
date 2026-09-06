import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

// 기기 고유 ID를 localStorage에 영구 저장하여 앱 재시작 시에도 동일한 사용자 유지
const getOrCreateDeviceId = () => {
    const key = 'c_safe_device_id';
    let deviceId = localStorage.getItem(key);
    if (!deviceId) {
        deviceId = 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(key, deviceId);
    }
    return deviceId;
};

// localStorage에서 로컬 프로필을 읽거나 새로 생성
const getOrCreateLocalProfile = (userId) => {
    const key = `c_safe_profile_${userId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try { return JSON.parse(saved); } catch { /* fall through */ }
    }
    const newProfile = {
        id: userId,
        nickname: '안전 라이더',
        points: 0,
        safety_score: 100,
        total_distance: 0,
        age: null,
        profile_image: '',
        is_guest: true
    };
    localStorage.setItem(key, JSON.stringify(newProfile));
    return newProfile;
};

// localStorage에 로컬 프로필 저장
const saveLocalProfile = (profile) => {
    if (!profile?.id) return;
    const key = `c_safe_profile_${profile.id}`;
    localStorage.setItem(key, JSON.stringify(profile));
};

export const useUserStore = create((set, get) => ({
    user: null,
    profile: null,
    isLoading: true,
    error: null,
    // 관리자 여부는 서버(is_admin RPC)가 판정한다. 클라이언트가 이 값을 true로
    // 바꿔봐야 대시보드 데이터는 RLS/RPC가 막으므로 의미가 없다 — 이 상태는
    // 버튼을 보여줄지 말지에만 쓰는 UX용이다.
    isAdmin: false,

    // 로그인 직후 1회 호출. 실패하면 관리자가 아닌 것으로 간주한다(안전한 기본값).
    refreshAdminFlag: async () => {
        try {
            const { data, error } = await supabase.rpc('is_admin');
            if (error) throw error;
            set({ isAdmin: data === true });
        } catch (e) {
            console.warn('[C-Safe] 관리자 여부 확인 실패 — 비관리자로 처리:', e?.message || e);
            set({ isAdmin: false });
        }
    },

    // 사용자 세션 로딩 및 프로필 가져오기
    loadUser: async () => {
        try {
            set({ isLoading: true });
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            if (session?.user) {
                set({ user: session.user });
                await get().fetchProfile(session.user.id);
                await get().refreshAdminFlag();
            } else {
                set({ user: null, profile: null, isAdmin: false });
            }
        } catch (error) {
            console.error('Error loading user session:', error);
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    // 프로필 데이터 Fetch (에러 발생 시 로컬 저장 프로필로 자동 전환)
    fetchProfile: async (userId) => {
        try {
            if (!userId) return;

            const { data, error, status } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error || status === 406 || status === 403) {
                console.warn(`[C-Safe] Profile fetch restricted (Status: ${status}). Using local profile.`);
                const localProfile = getOrCreateLocalProfile(userId);
                set({ profile: localProfile });
                return;
            }

            if (data) {
                // DB 데이터를 로컬에도 캐싱
                saveLocalProfile(data);
                set({ profile: data });
            } else {
                const localProfile = getOrCreateLocalProfile(userId);
                set({ profile: localProfile });
            }
        } catch (error) {
            console.warn('[C-Safe] Profile fetch error, using local profile:', error.message);
            const localProfile = getOrCreateLocalProfile(userId);
            set({ profile: localProfile });
        }
    },

    signInAnonymously: async () => {
        try {
            set({ isLoading: true });
            const { data, error } = await supabase.auth.signInAnonymously();
            
            if (error) throw error;
            set({ user: data.user });

            try {
                // 기존 로컬 저장 프로필이 있으면 닉네임 유지하여 upsert
                const existingLocal = getOrCreateLocalProfile(data.user.id);
                const { data: newProfile, error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        nickname: existingLocal.nickname || '안전 라이더',
                        safety_score: existingLocal.safety_score || 100,
                        points: existingLocal.points || 0,
                        total_distance: existingLocal.total_distance || 0,
                        age: existingLocal.age || null,
                        profile_image: existingLocal.profile_image || '',
                    }, { onConflict: 'id', ignoreDuplicates: false })
                    .select()
                    .maybeSingle();

                if (profileError) throw profileError;
                
                if (newProfile) {
                    saveLocalProfile(newProfile);
                    set({ profile: newProfile });
                } else {
                    throw new Error("No profile returned");
                }
            } catch {
                console.warn('[C-Safe] DB Profile creation blocked, using persistent local profile.');
                const localProfile = getOrCreateLocalProfile(data.user.id);
                set({ profile: localProfile });
            }

        } catch (error) {
            console.error('Error signing in anonymously:', error);
            
            // Supabase Auth 실패 시 기기 고유 ID로 로컬 완전 오프라인 모드
            const deviceId = getOrCreateDeviceId();
            const localProfile = getOrCreateLocalProfile(deviceId);
            set({ 
                user: { id: deviceId, is_guest: true },
                profile: localProfile,
                isLoading: false
            });
        } finally {
            set({ isLoading: false });
        }
    },

    updateProfile: async (updates) => {
        const { user, profile } = get();
        if (!profile) return;
        
        // Optimistic UI update + 로컬 영구 저장
        const updatedProfile = { ...profile, ...updates };
        set({ profile: updatedProfile });
        saveLocalProfile(updatedProfile); // 즉시 localStorage에 저장

        try {
            if (!profile.is_guest && user) {
                await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', user.id);
            }
        } catch (error) {
            console.error('Failed to update profile to DB, but local save succeeded:', error);
        }
    },

    /**
     * 관리자 이메일 로그인.
     *
     * 일반 사용자는 익명 로그인만 쓴다. 이메일 자가 가입은 막혀 있고
     * (config.toml [auth.email] enable_signup = false), 계정은 Supabase
     * 대시보드에서 만든 뒤 그 uid를 public.admin_users에 넣어야 실제 권한이 생긴다.
     *
     * ⚠️ 로그인하면 기존 익명 세션이 대체된다. 로그아웃 시 새 익명 uid가
     *    발급되어 이전 익명 계정의 주행 기록과는 분리된다(운영자 기기 전제).
     */
    signInAsAdmin: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, error: error.message };

        set({ user: data.user });
        await get().fetchProfile(data.user.id);
        await get().refreshAdminFlag();

        // 로그인은 됐지만 admin_users에 없는 계정일 수 있다 — 그 경우도 실패로 알린다.
        if (!get().isAdmin) {
            await supabase.auth.signOut();
            set({ user: null, profile: null, isAdmin: false });
            return { ok: false, error: 'not_admin' };
        }
        return { ok: true };
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, isAdmin: false });
    }
}));
