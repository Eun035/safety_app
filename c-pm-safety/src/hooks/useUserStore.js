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

            if (error) {
                if (error.code === 'PGRST116') {
                    // Profile doesn't exist yet, create one
                    const { data: newProfile, error: insertError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: userId,
                            nickname: '라이더_' + Math.floor(Math.random() * 1000),
                            safety_score: 100,
                            points: 0,
                            total_distance: 0
                        })
                        .select()
                        .single();
                        
                    if (!insertError && newProfile) {
                        set({ profile: newProfile });
                        return;
                    }
                }
                throw error;
            }

            if (data) {
                set({ profile: data });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            // Fallback: Create a local temporary profile if DB is unreachable
            set({ 
                profile: {
                    id: userId || 'temp_id',
                    nickname: '임시라이더_' + Math.floor(Math.random() * 100),
                    points: 1000,
                    safety_score: 95,
                    total_distance: 0
                }
            });
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
                    points: 0,
                    total_distance: 0
                })
                .select()
                .single();

            if (profileError) throw profileError;
            set({ profile: newProfile });

        } catch (error) {
            console.error('Error signing in anonymously:', error);
            set({ error: error.message });
            
            // Critical Debug Fix: If Supabase Auth is disabled (422), fallback to LocalGuest Mode
            if (error.status === 422 || error.message.includes('signup')) {
                console.warn('[C-Safe] Supabase Auth disabled. Switching to Local Guest Mode.');
                const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
                const guestUser = { id: guestId, is_guest: true };
                set({ 
                    user: guestUser,
                    profile: {
                        id: guestId,
                        nickname: '게스트라이더',
                        points: 0,
                        safety_score: 100,
                        total_distance: 0
                    },
                    isLoading: false
                });
            }
        } finally {
            set({ isLoading: false });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    }
}));
