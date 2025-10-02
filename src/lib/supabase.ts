import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && 
  supabaseUrl !== 'your-supabase-url' && 
  !supabaseUrl.includes('undefined') &&
  supabaseAnonKey && 
  supabaseAnonKey !== 'your-supabase-anon-key' &&
  !supabaseAnonKey.includes('undefined');

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Storage bucket name for your models
export const MODELS_BUCKET = 'models'

// Helper function to get Supabase storage URL
export const getSupabaseUrl = (path: string) => {
  if (!supabase) {
    return `/models/${path}`; // Fallback to local path
  }
  const { data } = supabase.storage.from(MODELS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};
