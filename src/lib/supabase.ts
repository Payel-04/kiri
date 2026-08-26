import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing or incomplete.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type TranslationHistoryItem = {
  id: string;
  user_id: string;
  gesture_label: string;
  translated_text: string;
  created_at: string;
};

export type CommunityPost = {
  id: string;
  user_id: string;
  author_name: string;
  message: string;
  created_at: string;
};

export type LearningProgress = {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  score: number;
  updated_at: string;
};
