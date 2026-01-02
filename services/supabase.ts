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

// Hardcoded fallbacks provided by user
const FALLBACK_URL = 'https://uzrflpyexjxaztmqwifa.supabase.co';
const FALLBACK_KEY = 'sb_publishable_gVgH65ce4ky8v2acrg5tSQ_h79S6YiH';

// Ensure valid URL format to prevent crash during initialization if env vars are missing
// We use the provided fallback URL if env var is missing
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : FALLBACK_URL;
const validKey = supabaseAnonKey || FALLBACK_KEY;

let client;

try {
    client = createClient(validUrl, validKey);
} catch (error) {
    console.error("Supabase Client Init Error:", error);
}

export const supabase = client || createClient(FALLBACK_URL, FALLBACK_KEY);

// Helper to check if we are running with real config or placeholders
export const isSupabaseConfigured = () => {
    // If we have a URL that isn't the generic placeholder, we are configured
    return validUrl !== 'https://placeholder.supabase.co' && validUrl !== '';
};