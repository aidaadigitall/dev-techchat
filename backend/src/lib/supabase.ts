
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Usamos a Service Role Key no backend para ter acesso total (bypass RLS quando necessário)
// Mas vamos implementar RLS checks manuais onde aplicável
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
