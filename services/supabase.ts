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
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = supabaseAnonKey || 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URLs not found. Please check your .env file and ensure variables start with VITE_, REACT_APP_ or NEXT_PUBLIC_.');
} else {
  console.log('Supabase Connection Initialized');
}

export const supabase = createClient(validUrl, validKey);