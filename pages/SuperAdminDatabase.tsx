
import React, { useState, useEffect } from 'react';
import { Database, Activity, CheckCircle, XCircle, RefreshCw, Shield, Globe } from 'lucide-react';

const SuperAdminDatabase: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    setLoading(true);
    setStatus('idle');
    const start = performance.now();

    try {
      // Usar a URL base da API definida globalmente ou inferir
      const apiUrl = 'https://apitechchat.escsistemas.com/health';
      
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("API Offline");
      
      const end = performance.now();
      setLatency(Math.round(end - start));

      setStatus('success');
    } catch (err) {
      console.error("Connection Error:", err);
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
             <Database className="mr-3 text-green-600" size={28} /> Banco de Dados & API
          </h1>
          <p className="text-gray-500 mt-1">Status da conexão com a API Node.js e Postgres.</p>
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
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
           <h3 className="font-bold text-gray-800 mb-6 flex items-center">
              <Activity size={20} className="mr-2 text-purple-600" /> Saúde do Backend
           </h3>

           <div className="space-y-6 flex-1">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                 <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-4 ${status === 'success' ? 'bg-green-100 text-green-600' : status === 'error' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                       <Globe size={24} />
                    </div>
                    <div>
                       <p className="text-sm font-bold text-gray-900">API Gateway (Fastify)</p>
                       <p className="text-xs text-gray-500">Conexão HTTPS /health</p>
                    </div>
                 </div>
                 <div className="text-right">
                    {status === 'success' ? (
                       <span className="flex items-center text-green-600 text-sm font-bold"><CheckCircle size={16} className="mr-1"/> Online</span>
                    ) : status === 'error' ? (
                       <span className="flex items-center text-red-600 text-sm font-bold"><XCircle size={16} className="mr-1"/> Offline</span>
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
                       <p className="text-xs text-gray-500">Tempo de resposta</p>
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
           <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-gray-800 flex items-center">
                  <Shield size={20} className="mr-2 text-blue-600" /> Infraestrutura SaaS
               </h3>
           </div>

           <div className="space-y-4 text-sm text-gray-600">
              <p>O sistema está operando em modo <strong>Production Grade</strong>.</p>
              <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Banco de Dados:</strong> PostgreSQL 15 (Docker)</li>
                  <li><strong>ORM:</strong> Prisma Client (Conectado via Socket/TCP)</li>
                  <li><strong>Filas:</strong> Redis + BullMQ (Para envios WhatsApp)</li>
                  <li><strong>Autenticação:</strong> JWT Nativo (Fastify/JWT)</li>
              </ul>
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                 <strong className="block mb-2">Endpoint Público:</strong>
                 <code className="bg-white px-2 py-1 rounded border border-gray-200">https://apitechchat.escsistemas.com</code>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdminDatabase;
