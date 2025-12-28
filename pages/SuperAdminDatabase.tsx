import React, { useState } from 'react';
import { Database, Server, Save, Activity, CheckCircle, XCircle, RefreshCw, Lock, ShieldAlert } from 'lucide-react';

const SuperAdminDatabase: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [config, setConfig] = useState({
    host: 'postgres-db.internal',
    port: '5432',
    username: 'postgres',
    password: '••••••••',
    database: 'omniconnect_db',
    ssl: true,
    poolSize: 10
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
    setTestStatus('idle'); // Reset status on change
  };

  const handleTestConnection = () => {
    setLoading(true);
    // Simulate API ping
    setTimeout(() => {
      setLoading(false);
      // Simulate success
      setTestStatus('success');
    }, 1500);
  };

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Configurações de banco de dados salvas e serviço reiniciado.');
    }, 1500);
  };

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
             <Database className="mr-3 text-purple-600" size={28} /> Configuração de Banco de Dados
          </h1>
          <p className="text-gray-500 mt-1">Gerencie a conexão com o PostgreSQL principal da aplicação.</p>
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center px-4 py-2 rounded-lg border ${testStatus === 'success' || testStatus === 'idle' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
           <Activity size={18} className="mr-2 animate-pulse" />
           <span className="font-bold text-sm">
             {loading ? 'Testando...' : testStatus === 'success' ? 'Conectado (Latência: 12ms)' : testStatus === 'error' ? 'Falha na Conexão' : 'Online'}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Connection Form */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800 flex items-center">
                    <Server size={18} className="mr-2 text-gray-500" /> Parâmetros de Conexão
                 </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host / Endereço</label>
                    <input 
                      type="text" 
                      name="host"
                      value={config.host}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500 bg-white" 
                      placeholder="ex: db.meusite.com"
                    />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Porta</label>
                    <input 
                      type="number" 
                      name="port"
                      value={config.port}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500 bg-white" 
                      placeholder="5432"
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Banco (DB Name)</label>
                    <input 
                      type="text" 
                      name="database"
                      value={config.database}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500 bg-white" 
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                    <input 
                      type="text" 
                      name="username"
                      value={config.username}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500 bg-white" 
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <div className="relative">
                      <input 
                        type="password" 
                        name="password"
                        value={config.password}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-purple-500 focus:border-purple-500 bg-white" 
                      />
                      <Lock size={16} className="absolute right-3 top-3 text-gray-400" />
                    </div>
                 </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
                 <button 
                   onClick={handleTestConnection}
                   disabled={loading}
                   className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center bg-white ${testStatus === 'success' ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                 >
                   {loading ? <RefreshCw size={16} className="animate-spin mr-2" /> : testStatus === 'success' ? <CheckCircle size={16} className="mr-2" /> : <Activity size={16} className="mr-2" />}
                   {loading ? 'Testando...' : testStatus === 'success' ? 'Conexão OK' : 'Testar Conexão'}
                 </button>

                 <button 
                   onClick={handleSave}
                   className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center font-medium shadow-sm"
                 >
                   <Save size={18} className="mr-2" /> Salvar Configuração
                 </button>
              </div>
           </div>

           {/* Pool Settings */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                 <Activity size={18} className="mr-2 text-gray-500" /> Configurações Avançadas (Pool)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Connections (Pool Size)</label>
                    <input 
                      type="number" 
                      value={config.poolSize}
                      onChange={(e) => setConfig({...config, poolSize: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-white" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Recomendado: 10-20 para instâncias médias.</p>
                 </div>
                 
                 <div className="flex items-center h-full pt-6">
                    <label className="flex items-center cursor-pointer">
                       <input 
                         type="checkbox" 
                         checked={config.ssl} 
                         onChange={(e) => setConfig({...config, ssl: e.target.checked})}
                         className="h-5 w-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 bg-white" 
                       />
                       <span className="ml-2 text-sm text-gray-700 font-medium">Habilitar SSL (Recomendado)</span>
                    </label>
                 </div>
              </div>
           </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
              <h4 className="font-bold text-blue-800 mb-2 flex items-center"><ShieldAlert size={18} className="mr-2"/> Segurança</h4>
              <p className="text-sm text-blue-700 mb-4">
                 Certifique-se de que o endereço IP deste servidor (VPS) esteja na lista de permissões (Allowlist) do seu banco de dados.
              </p>
              <div className="bg-white p-3 rounded border border-blue-100 text-xs font-mono text-gray-600">
                 IP Atual: 45.23.12.98
              </div>
           </div>

           <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-4">Driver Info</h4>
              <ul className="space-y-3 text-sm">
                 <li className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Versão Client</span>
                    <span className="font-mono text-gray-800">pg@8.11.3</span>
                 </li>
                 <li className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">ORM</span>
                    <span className="font-mono text-gray-800">Prisma</span>
                 </li>
                 <li className="flex justify-between pb-2">
                    <span className="text-gray-500">Status Cluster</span>
                    <span className="text-green-600 font-bold">Saudável</span>
                 </li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDatabase;