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
            // 세션 로드 실패 시에도 앱이 멈추지 않도록 에러만 기록
            set({ error: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    // 프로필 데이터 Fetch (에러 발생 시 게스트 모드 자동 전환)
    fetchProfile: async (userId) => {
        try {
            if (!userId) return;

            // maybeSingle()을 사용하여 데이터가 없거나 권한이 없어도 에러를 던지지 않게 함
            const { data, error, status } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            // 406(Not Acceptable) 또는 403(Forbidden) 등 API 접근 거부 시 게스트 모드
            if (error || status === 406 || status === 403) {
                console.warn(`[C-Safe] Profile fetch restricted (Status: ${status}). Using Guest Mode.`);
                set({ 
                    profile: {
                        id: userId,
                        nickname: '안전 주행자',
                        points: 1000,
                        safety_score: 100,
                        total_distance: 0,
                        is_guest: true
                    }
                });
                return;
            }

            if (data) {
                set({ profile: data });
            } else {
                // 데이터가 없는 경우 (최초 가입 등)
                set({ 
                    profile: {
                        id: userId,
                        nickname: '신규 라이더',
                        points: 0,
                        safety_score: 100,
                        total_distance: 0,
                        is_guest: false
                    }
                });
            }
        } catch (error) {
            console.warn('[C-Safe] Critical profile fetch error, switching to Guest Fallback:', error.message);
            set({ 
                profile: {
                    id: userId || 'guest_id',
                    nickname: '게스트',
                    points: 0,
                    safety_score: 90,
                    total_distance: 0,
                    is_guest: true
                }
            });
        }
    },

    signInAnonymously: async () => {
        try {
            set({ isLoading: true });
            const { data, error } = await supabase.auth.signInAnonymously();
            
            if (error) throw error;
            set({ user: data.user });

            // 프로필 생성 시도 (RLS 정책에 따라 차단될 수 있음)
            try {
                const { data: newProfile, error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        nickname: '천안안전라이더_' + Math.floor(Math.random() * 1000),
                        safety_score: 100,
                        points: 0,
                        total_distance: 0,
                        age: 25 // Default age for testing
                    })
                    .select()
                    .maybeSingle();

                if (profileError) throw profileError;
                
                if (newProfile) {
                    set({ profile: newProfile });
                } else {
                    throw new Error("No profile created");
                }
            } catch (pError) {
                console.warn('[C-Safe] DB Profile creation blocked, using local profile instead.');
                set({
                    profile: {
                        id: data.user.id,
                        nickname: '게스트라이더_' + data.user.id.substring(0, 4),
                        points: 0,
                        safety_score: 100,
                        total_distance: 0,
                        age: 25,
                        is_guest: true
                    }
                });
            }

        } catch (error) {
            console.error('Error signing in anonymously:', error);
            
            // Supabase Auth 설정이 안 되어 있을 경우 (422 등) 로컬 게스트 모드로 강제 진입
            const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
            set({ 
                user: { id: guestId, is_guest: true },
                profile: {
                    id: guestId,
                    nickname: '로컬게스트',
                    points: 0,
                    safety_score: 100,
                    total_distance: 0,
                    age: 25,
                    is_guest: true
                },
                isLoading: false
            });
        } finally {
            set({ isLoading: false });
        }
    },

    updateProfile: async (updates) => {
        const { user, profile } = get();
        if (!profile) return;
        
        // Optimistic UI update
        const updatedProfile = { ...profile, ...updates };
        set({ profile: updatedProfile });

        try {
            if (!profile.is_guest && user) {
                await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', user.id);
            }
        } catch (error) {
            console.error('Failed to update profile to DB:', error);
            // Ignore error for now to keep local state updated
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    }
}));
