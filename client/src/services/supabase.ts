import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jdmvqjtdiimugwuvcddd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Send Phone OTP via Supabase Auth
 */
export async function sendSupabasePhoneOtp(phone: string) {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (error) {
      console.warn('Supabase Phone OTP dispatch warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.warn('Supabase Phone OTP dispatch error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Verify Phone OTP via Supabase Auth
 */
export async function verifySupabasePhoneOtp(phone: string, token: string) {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) {
      console.warn('Supabase Phone OTP verification warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, session: data.session, user: data.user };
  } catch (err: any) {
    console.warn('Supabase Phone OTP verification error:', err);
    return { success: false, error: err.message };
  }
}
