import React from 'react';
import { MOCK_SAAS_STATS } from '../constants';
import { 
  Building, 
  Users, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', mrr: 30000 },
  { name: 'Fev', mrr: 35000 },
  { name: 'Mar', mrr: 38000 },
  { name: 'Abr', mrr: 42000 },
  { name: 'Mai', mrr: 45200 },
  { name: 'Jun', mrr: 49000 },
];

const SuperAdminDashboard: React.FC = () => {
  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral do SaaS</h1>
        <p className="text-gray-500">Métricas globais de todas as instâncias e faturamento.</p>
      </header>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-sm font-medium text-gray-500">MRR (Receita Recorrente)</p>
               <h3 className="text-3xl font-bold text-gray-900 mt-2">
                 {MOCK_SAAS_STATS.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
               </h3>
             </div>
             <div className="p-3 bg-green-50 rounded-lg text-green-600">
               <DollarSign size={24} />
             </div>
           </div>
           <div className="flex items-center mt-4 text-sm text-green-600 font-medium">
             <ArrowUpRight size={16} className="mr-1" />
             +12% vs mês anterior
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-sm font-medium text-gray-500">Empresas Ativas</p>
               <h3 className="text-3xl font-bold text-gray-900 mt-2">{MOCK_SAAS_STATS.totalCompanies}</h3>
             </div>
             <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
               <Building size={24} />
             </div>
           </div>
           <div className="flex items-center mt-4 text-sm text-green-600 font-medium">
             <ArrowUpRight size={16} className="mr-1" />
             +5 novas esta semana
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-sm font-medium text-gray-500">Usuários Totais</p>
               <h3 className="text-3xl font-bold text-gray-900 mt-2">{MOCK_SAAS_STATS.activeUsers}</h3>
             </div>
             <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
               <Users size={24} />
             </div>
           </div>
           <div className="flex items-center mt-4 text-sm text-gray-500">
             Média de 6.9 usuários/empresa
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-sm font-medium text-gray-500">Churn Rate</p>
               <h3 className="text-3xl font-bold text-gray-900 mt-2">{MOCK_SAAS_STATS.churnRate}%</h3>
             </div>
             <div className="p-3 bg-red-50 rounded-lg text-red-600">
               <TrendingUp size={24} />
             </div>
           </div>
           <div className="flex items-center mt-4 text-sm text-red-600 font-medium">
             <ArrowDownRight size={16} className="mr-1" />
             +0.5% vs mês anterior
           </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Crescimento de Receita (MRR)</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$ ${value/1000}k`} />
              <Tooltip formatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
              <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
         <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Atividade Recente do Sistema</h3>
            <span className="flex items-center text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-full animate-pulse">
               <Activity size={12} className="mr-1" /> Tempo real
            </span>
         </div>
         <div className="divide-y divide-gray-100">
           {[
             { msg: 'Nova assinatura: Tech Solutions (Plano Pro)', time: '2 min atrás', type: 'sub' },
             { msg: 'Empresa suspensa: Padaria Central (Pagamento pendente)', time: '15 min atrás', type: 'alert' },
             { msg: 'Upgrade: Advogados Associados (Start -> Pro)', time: '1 hora atrás', type: 'upgrade' },
             { msg: 'Novo ticket de suporte aberto por Transportes Silva', time: '2 horas atrás', type: 'support' },
           ].map((log, i) => (
             <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
               <span className="text-sm text-gray-700">{log.msg}</span>
               <span className="text-xs text-gray-400">{log.time}</span>
             </div>
           ))}
         </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;