import { createClient } from '@supabase/supabase-js';

// Robust environment variable accessor
const getEnv = (key: string) => {
  let value = '';
  try {
    // Vite / Modern Browsers
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      value = import.meta.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  if (!value) {
    try {
      // Node.js / CRA / Webpack
      if (typeof process !== 'undefined' && process.env && process.env[key]) {
        value = process.env[key];
      }
    } catch (e) {
      // Ignore error
    }
  }
  return value || '';
};

// Try multiple naming conventions
const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL') || '';
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY') || '';

// Ensure valid URL format to prevent crash during initialization if env vars are missing
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = supabaseAnonKey || 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URLs not found. Check your .env file.');
} else {
  console.log('Supabase Connection Initialized with:', validUrl);
}

export const supabase = createClient(validUrl, validKey);