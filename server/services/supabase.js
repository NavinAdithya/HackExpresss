const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jdmvqjtdiimugwuvcddd.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase Admin client:', err.message);
  }
}

module.exports = {
  supabaseAdmin,
  isSupabaseConfigured: () => Boolean(supabaseAdmin),
};
