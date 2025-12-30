import React, { useState, useEffect } from 'react';
import { Database, Activity, CheckCircle, XCircle, RefreshCw, Shield, Globe, Key } from 'lucide-react';
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
    // Check if env vars are loaded (checking non-empty string)
    // Note: In Vite/React apps we can't read the actual value easily for security, 
    // but we can check the supabase client internals or just assume based on connection success.
    const urlConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL);
    const keyConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY);
    
    setEnvCheck({
        url: urlConfigured,
        key: keyConfigured
    });
    
    handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    setLoading(true);
    setStatus('idle');
    const start = performance.now();

    try {
      // Simple query to check connection (fetch 1 row from a system table or auth)
      // We use auth.getSession because it's always available even without tables created
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
             <Database className="mr-3 text-green-600" size={28} /> Status do Sistema (Supabase)
          </h1>
          <p className="text-gray-500 mt-1">Diagnóstico de conectividade com a nuvem.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Connection Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
           <h3 className="font-bold text-gray-800 mb-6 flex items-center">
              <Activity size={20} className="mr-2 text-purple-600" /> Saúde da Conexão
           </h3>

           <div className="space-y-6">
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
           </div>
        </div>

        {/* Environment Config Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
           <h3 className="font-bold text-gray-800 mb-6 flex items-center">
              <Shield size={20} className="mr-2 text-blue-600" /> Configuração de Ambiente
           </h3>

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

              <div className="mt-4 p-4 bg-blue-50 text-blue-800 text-xs rounded-lg leading-relaxed">
                 <strong className="block mb-1">Nota sobre Credenciais:</strong>
                 O Supabase utiliza autenticação via Token. As variáveis de ambiente são configuradas no momento do build/deploy. 
                 Se você estiver vendo "Ausente" ou erro de conexão, verifique seu arquivo <code>.env</code>.
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdminDatabase;