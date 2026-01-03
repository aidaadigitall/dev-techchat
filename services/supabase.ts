import { createClient } from '@supabase/supabase-js';

// Robust environment variable accessor
const getEnv = (key: string) => {
  let value = '';
  try {
    // Vite / Modern Browsers
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      value = import.meta.env[key] || import.meta.env[`VITE_${key}`];
    }
  } catch (e) {
    // Ignore error
  }

  if (!value) {
    try {
      // Node.js / CRA / Webpack
      if (typeof process !== 'undefined' && process.env) {
        value = process.env[key] || process.env[`REACT_APP_${key}`] || process.env[`NEXT_PUBLIC_${key}`];
      }
    } catch (e) {
      // Ignore error
    }
  }
  return value || '';
};

// Try multiple naming conventions keys directly to be safe
const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

// Ensure valid URL format to prevent crash during initialization if env vars are missing
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : '';
const validKey = supabaseAnonKey || '';

let client;

if (validUrl && validKey) {
    try {
        client = createClient(validUrl, validKey);
    } catch (error) {
        console.error("Supabase Client Init Error:", error);
    }
}

// Export client (might be undefined if config is missing, handled in App)
// We export a dummy client if config is missing to prevent immediate crash on import, 
// but auth calls will fail gracefully handled by Login.tsx checks
export const supabase = client || createClient('https://placeholder.supabase.co', 'placeholder');

// Helper to check if we are running with real config or placeholders
export const isSupabaseConfigured = () => {
    return validUrl !== '' && validKey !== '';
};