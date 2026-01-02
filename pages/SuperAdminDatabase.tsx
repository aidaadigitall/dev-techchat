import React, { useState, useEffect } from 'react';
import { Database, Activity, CheckCircle, XCircle, RefreshCw, Shield, Globe, Key, HelpCircle, ExternalLink, Copy } from 'lucide-react';
import { supabase } from '../services/supabase';

const SuperAdminDatabase: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);
  const [envCheck, setEnvCheck] = useState({
    url: false,
    key: false
  });

  useEffect(() => {
    // Helper to robustly check env vars across different build tools (Vite, CRA, Next.js)
    const checkEnvVar = (keySuffix: string) => {
        let value = '';
        try {
            // Check Vite (import.meta.env)
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env) {
                // @ts-ignore
                value = import.meta.env[`VITE_${keySuffix}`];
            }
        } catch (e) {}

        if (!value) {
            try {
                // Check Node/Webpack (process.env)
                if (typeof process !== 'undefined' && process.env) {
                    value = process.env[`REACT_APP_${keySuffix}`] || process.env[`NEXT_PUBLIC_${keySuffix}`];
                }
            } catch (e) {}
        }
        return !!value && value !== '';
    };

    setEnvCheck({
        url: checkEnvVar('SUPABASE_URL'),
        key: checkEnvVar('SUPABASE_ANON_KEY')
    });
    
    handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    setLoading(true);
    setStatus('idle');
    const start = performance.now();

    try {
      // Simple query to check connection (fetch 1 row from a system table or auth)
      const { error } = await supabase.auth.getSession();
      
      const end = performance.now();
      setLatency(Math.round(end - start));

      if (error) throw error;
      setStatus('success');
    } catch (err) {
      console.error("Supabase Connection Error:", err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
             <Database className="mr-3 text-green-600" size={28} /> Banco de Dados & Ambiente
          </h1>
          <p className="text-gray-500 mt-1">Status da conexão e variáveis de ambiente.</p>
        </div>
        
        <button 
          onClick={handleTestConnection}
          disabled={loading}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Verificando...' : 'Testar Conexão'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Connection Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
           <h3 className="font-bold text-gray-800 mb-6 flex items-center">
              <Activity size={20} className="mr-2 text-purple-600" /> Saúde da Conexão
           </h3>

           <div className="space-y-6 flex-1">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                 <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-4 ${status === 'success' ? 'bg-green-100 text-green-600' : status === 'error' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                       <Globe size={24} />
                    </div>
                    <div>
                       <p className="text-sm font-bold text-gray-900">API Gateway</p>
                       <p className="text-xs text-gray-500">Comunicação HTTPS com Supabase</p>
                    </div>
                 </div>
                 <div className="text-right">
                    {status === 'success' ? (
                       <span className="flex items-center text-green-600 text-sm font-bold"><CheckCircle size={16} className="mr-1"/> Online</span>
                    ) : status === 'error' ? (
                       <span className="flex items-center text-red-600 text-sm font-bold"><XCircle size={16} className="mr-1"/> Erro</span>
                    ) : (
                       <span className="text-gray-400 text-sm">Aguardando...</span>
                    )}
                 </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                 <div className="flex items-center">
                    <div className="p-2 rounded-full mr-4 bg-blue-100 text-blue-600">
                       <Activity size={24} />
                    </div>
                    <div>
                       <p className="text-sm font-bold text-gray-900">Latência</p>
                       <p className="text-xs text-gray-500">Tempo de resposta da API</p>
                    </div>
                 </div>
                 <div className="text-right">
                    {latency !== null ? (
                       <span className={`text-lg font-mono font-bold ${latency < 200 ? 'text-green-600' : latency < 500 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {latency}ms
                       </span>
                    ) : (
                       <span className="text-gray-400">-</span>
                    )}
                 </div>
              </div>
              
              {!envCheck.url && status === 'success' && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex items-start">
                      <HelpCircle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                          <strong>Aviso:</strong> O sistema está conectado usando credenciais de <em>fallback</em> (teste). 
                          Para conectar ao seu banco de dados real, configure o arquivo <code>.env</code> conforme instruções ao lado.
                      </div>
                  </div>
              )}
           </div>
        </div>

        {/* Environment Config Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
           <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-gray-800 flex items-center">
                  <Shield size={20} className="mr-2 text-blue-600" /> Variáveis de Ambiente (.env)
               </h3>
               <a 
                 href="https://supabase.com/dashboard/project/_/settings/api" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-xs text-blue-600 hover:underline flex items-center font-medium"
               >
                 Abrir Supabase <ExternalLink size={10} className="ml-1" />
               </a>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                 <div className="flex items-center">
                    <Globe size={18} className="text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">URL do Projeto (Endpoint)</span>
                 </div>
                 {envCheck.url ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Configurado</span>
                 ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">Ausente</span>
                 )}
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                 <div className="flex items-center">
                    <Key size={18} className="text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">Chave Pública (Anon Key)</span>
                 </div>
                 {envCheck.key ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Configurado</span>
                 ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">Ausente</span>
                 )}
              </div>

              <div className="mt-4 p-4 bg-slate-50 text-slate-700 text-xs rounded-lg leading-relaxed border border-slate-200">
                 <strong className="block mb-2 text-sm text-slate-900 flex items-center">
                    <Key size={14} className="mr-1" /> Onde encontrar esses dados?
                 </strong>
                 <ol className="list-decimal pl-4 space-y-1.5 mb-3">
                    <li>Acesse o painel do Supabase e selecione seu projeto.</li>
                    <li>Vá em <strong>Settings (Engrenagem)</strong> {'>'} <strong>API</strong>.</li>
                    <li>Copie o valor de <strong>Project URL</strong>.</li>
                    <li>Copie o valor de <strong>anon public</strong> key.</li>
                 </ol>
                 <div className="bg-slate-900 text-green-400 font-mono p-3 rounded overflow-x-auto relative group">
                    <div>VITE_SUPABASE_URL=https://seu-projeto.supabase.co</div>
                    <div>VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...</div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500">Exemplo</div>
                 </div>
                 <p className="mt-2 text-slate-500 italic">
                    Copie e envie esses dados para o desenvolvedor ou crie o arquivo <code>.env</code> na raiz.
                 </p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdminDatabase;