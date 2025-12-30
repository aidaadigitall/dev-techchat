import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables that works in both Node (process.env) and some Browser bundlers
const getEnv = (key: string) => {
  try {
    return process.env[key];
  } catch (e) {
    // If process is not defined, return empty string to prevent crash
    return '';
  }
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL') || '';
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY') || '';

// Ensure valid URL format to prevent crash during initialization if env vars are missing
// This allows the app to load (white screen fix), even if API calls will fail later.
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = supabaseAnonKey || 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URLs not found. Check your .env file. Using placeholder to prevent crash.');
}

export const supabase = createClient(validUrl, validKey);