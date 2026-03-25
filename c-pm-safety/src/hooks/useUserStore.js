import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export const useUserStore = create((set, get) => ({
    user: null,
    profile: null,
    isLoading: true,
    error: null,

    // 사용자 세션 로딩 및 프로필 가져오기
    loadUser: async () => {
        try {
            set({ isLoading: true });
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            if (session?.user) {
                set({ user: session.user });
                await get().fetchProfile(session.user.id);
            } else {
                set({ user: null, profile: null });
            }
        } catch (error) {
            console.error('Error loading user session:', error);
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    // 프로필 데이터 Fetch (mockUserProfile 대체)
    fetchProfile: async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116: no rows returned
                throw error;
            }

            if (data) {
                set({ profile: data });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    },

    // (간단한 데모용) 익명 로그인
    signInAnonymously: async () => {
        try {
            set({ isLoading: true });
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;

            set({ user: data.user });

            // 익명 프로필 생성
            const { data: newProfile, error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    nickname: '천안안전라이더_' + Math.floor(Math.random() * 1000),
                    safety_score: 100,
                    reward_points: 0,
                    carbon_reduction: 0
                })
                .select()
                .single();

            if (profileError) throw profileError;
            set({ profile: newProfile });

        } catch (error) {
            console.error('Error signing in anonymously:', error);
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    }
}));
