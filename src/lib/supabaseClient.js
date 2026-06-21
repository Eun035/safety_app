import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('[C-Safe] Supabase 환경변수가 설정되지 않았습니다. .env 파일을 확인해 주세요. (Dummy Client 사용 중)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
