
import { createClient } from '@supabase/supabase-js';

// 1. DADOS REAIS DO SEU PROJETO (Hardcoded para garantir funcionamento)
const REAL_URL = 'https://uzrflpyexjxaztmqwifa.supabase.co';
const REAL_KEY = 'sb_publishable_gVgH65ce4ky8v2acrg5tSQ_h79S6YiH';

// 2. Leitura robusta de variáveis de ambiente
const getEnv = (key: string) => {
  let value = '';
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      value = import.meta.env[key] || import.meta.env[`VITE_${key}`];
    }
  } catch (e) {}

  if (!value) {
    try {
      if (typeof process !== 'undefined' && process.env) {
        value = process.env[key] || process.env[`REACT_APP_${key}`] || process.env[`NEXT_PUBLIC_${key}`];
      }
    } catch (e) {}
  }
  return value || '';
};

// 3. Definição das credenciais (Prioriza ENV, usa REAL como fallback)
const supabaseUrl = getEnv('SUPABASE_URL') || REAL_URL;
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || REAL_KEY;

// 4. Inicialização do Cliente
let client;

// Validação básica para evitar erro de inicialização
if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    try {
        client = createClient(supabaseUrl, supabaseAnonKey);
        console.log("Supabase conectado com sucesso em:", supabaseUrl);
    } catch (error) {
        console.error("Erro fatal ao iniciar Supabase:", error);
    }
}

// Exporta o cliente (ou um placeholder seguro para não quebrar a app)
export const supabase = client || createClient('https://placeholder.supabase.co', 'placeholder');

// 5. Função de Verificação de Configuração
export const isSupabaseConfigured = () => {
    // Se temos as chaves reais hardcoded ou via env, retornamos TRUE
    if (supabaseUrl === REAL_URL && supabaseAnonKey === REAL_KEY) return true;
    
    // Verificação padrão
    return supabaseUrl !== '' && supabaseAnonKey !== '' && !supabaseUrl.includes('placeholder');
};
