import React, { useState } from 'react';
import { 
  BarChart3, Download, Calendar as CalendarIcon, Filter, Target, 
  MessageSquare, Users, Clock, ThumbsUp, TrendingUp, CheckCircle, 
  AlertCircle, FileText, CheckSquare, PieChart, Activity, RefreshCw 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid, Legend, PieChart as RePieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import Modal from '../components/Modal';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('atendimento');
  const [dateRange, setDateRange] = useState('30');
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Mock data for charts
  const attendanceData = [
    { name: '01/12', tickets: 45, avgTime: 5 },
    { name: '05/12', tickets: 52, avgTime: 4 },
    { name: '10/12', tickets: 38, avgTime: 6 },
    { name: '15/12', tickets: 65, avgTime: 4 },
    { name: '20/12', tickets: 48, avgTime: 5 },
    { name: '25/12', tickets: 20, avgTime: 3 },
    { name: '30/12', tickets: 55, avgTime: 5 },
  ];

  const channelData = [
    { name: 'WhatsApp', value: 65, color: '#25D366' },
    { name: 'Instagram', value: 25, color: '#E1306C' },
    { name: 'Web Chat', value: 10, color: '#3B82F6' },
  ];

  const crmData = [
    { name: 'Novo Lead', value: 40 },
    { name: 'Em Progresso', value: 30 },
    { name: 'Proposta', value: 20 },
    { name: 'Fechado', value: 10 },
  ];

  const teamPerformance = [
    { name: 'Maria Silva', tickets: 145, rating: 4.8, avgTime: '4m' },
    { name: 'João Santos', tickets: 122, rating: 4.5, avgTime: '6m' },
    { name: 'Ana Costa', tickets: 98, rating: 4.9, avgTime: '3m' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'atendimento':
        return (
          <div className="space-y-6 animate-fadeIn">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {[
                 { title: 'Total Atendimentos', value: '1,245', sub: '+12% vs anterior', color: 'text-purple-600', icon: <MessageSquare size={20} /> },
                 { title: 'Tempo Médio Resposta', value: '4m 32s', sub: '-30s vs anterior', color: 'text-blue-600', icon: <Clock size={20} /> },
                 { title: 'Resolução 1º Contato', value: '78%', sub: '+2% vs anterior', color: 'text-green-600', icon: <CheckCircle size={20} /> },
                 { title: 'CSAT (Satisfação)', value: '4.8/5.0', sub: '96 avaliações', color: 'text-yellow-600', icon: <ThumbsUp size={20} /> },
               ].map((kpi, i) => (
                 <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                       <div className={`p-2 rounded-lg bg-gray-50 ${kpi.color}`}>{kpi.icon}</div>
                       <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{kpi.sub}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{kpi.value}</h3>
                    <p className="text-gray-500 text-xs font-medium uppercase mt-1">{kpi.title}</p>
                 </div>
               ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-6">Volume de Atendimentos (Diário)</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={attendanceData}>
                         <defs>
                           <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2}/>
                             <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                         <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                         <Area type="monotone" dataKey="tickets" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" />
                       </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-6">Canais de Entrada</h3>
                  <div className="h-72 flex flex-col items-center justify-center">
                     <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={channelData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {channelData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} />
                        </RePieChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* Team Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Performance da Equipe</h3>
               </div>
               <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                     <tr>
                        <th className="px-6 py-3">Atendente</th>
                        <th className="px-6 py-3 text-center">Tickets Resolvidos</th>
                        <th className="px-6 py-3 text-center">Tempo Médio</th>
                        <th className="px-6 py-3 text-right">Avaliação Média</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {teamPerformance.map((member, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                           <td className="px-6 py-4 flex items-center">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs mr-3">
                                 {member.name.charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-gray-900">{member.name}</span>
                           </td>
                           <td className="px-6 py-4 text-center text-sm text-gray-600">{member.tickets}</td>
                           <td className="px-6 py-4 text-center text-sm text-gray-600">{member.avgTime}</td>
                           <td className="px-6 py-4 text-right text-sm font-bold text-yellow-600">
                              ⭐ {member.rating}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        );

      case 'crm':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {[
                 { title: 'Negócios Criados', value: '45', sub: 'R$ 150k pipeline', color: 'text-gray-800', icon: <TrendingUp size={20} /> },
                 { title: 'Taxa de Conversão', value: '18%', sub: '+2% vs mês anterior', color: 'text-purple-600', icon: <Activity size={20} /> },
                 { title: 'Vendas Ganhas', value: '12', sub: 'R$ 45.000,00', color: 'text-green-600', icon: <CheckCircle size={20} /> },
                 { title: 'Ticket Médio', value: 'R$ 3.750', sub: '+R$ 200 vs mês anterior', color: 'text-blue-600', icon: <Target size={20} /> },
               ].map((kpi, i) => (
                 <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                       <div className="p-2 bg-gray-50 rounded-lg text-gray-600">{kpi.icon}</div>
                    </div>
                    <h3 className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</h3>
                    <p className="text-xs text-gray-500 font-medium uppercase mt-1">{kpi.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
                 </div>
               ))}
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="font-semibold text-gray-800 mb-6">Funil de Vendas (Conversão por Etapa)</h3>
               <div className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={crmData} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" fill="#9333ea" radius={[0, 4, 4, 0]} barSize={30}>
                         {crmData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.15)} />
                         ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        );

      case 'propostas':
        return (
           <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full mr-4"><FileText size={24} /></div>
                    <div>
                       <p className="text-sm text-gray-500">Propostas Enviadas</p>
                       <h3 className="text-2xl font-bold text-gray-900">28</h3>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center">
                    <div className="p-3 bg-green-50 text-green-600 rounded-full mr-4"><CheckSquare size={24} /></div>
                    <div>
                       <p className="text-sm text-gray-500">Aceitas</p>
                       <h3 className="text-2xl font-bold text-gray-900">12</h3>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center">
                    <div className="p-3 bg-red-50 text-red-600 rounded-full mr-4"><AlertCircle size={24} /></div>
                    <div>
                       <p className="text-sm text-gray-500">Expiradas / Recusadas</p>
                       <h3 className="text-2xl font-bold text-gray-900">4</h3>
                    </div>
                 </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">Últimas Propostas</h3>
                    <button className="text-xs text-purple-600 font-bold hover:underline">Ver todas</button>
                 </div>
                 <table className="w-full text-left">
                    <thead className="bg-white text-gray-500 text-xs uppercase font-semibold">
                       <tr>
                          <th className="px-6 py-3">Cliente</th>
                          <th className="px-6 py-3">Valor</th>
                          <th className="px-6 py-3">Data Envio</th>
                          <th className="px-6 py-3">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {[
                         { client: 'Tech Corp', val: 'R$ 12.500', date: '20/12/2024', status: 'Aceita', color: 'bg-green-100 text-green-700' },
                         { client: 'Padaria Central', val: 'R$ 3.200', date: '19/12/2024', status: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
                         { client: 'Esc Solutions', val: 'R$ 8.900', date: '18/12/2024', status: 'Recusada', color: 'bg-red-100 text-red-700' },
                       ].map((prop, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                             <td className="px-6 py-4 text-sm font-medium text-gray-900">{prop.client}</td>
                             <td className="px-6 py-4 text-sm text-gray-600">{prop.val}</td>
                             <td className="px-6 py-4 text-sm text-gray-500">{prop.date}</td>
                             <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${prop.color}`}>{prop.status}</span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        );

      case 'tarefas':
        return (
           <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-bold text-gray-800">Tarefas & Follow-ups</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* To Do Column */}
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center justify-between">
                       A Fazer <span className="bg-gray-200 text-gray-700 px-2 rounded-full text-xs">5</span>
                    </h4>
                    <div className="space-y-3">
                       {[1, 2, 3].map(i => (
                          <div key={i} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md cursor-pointer">
                             <div className="flex justify-between mb-1">
                                <span className="text-xs bg-red-50 text-red-600 px-1 rounded font-medium">Alta</span>
                                <span className="text-xs text-gray-400">Hoje</span>
                             </div>
                             <p className="text-sm font-medium text-gray-800">Ligar para fechamento - Cliente X</p>
                          </div>
                       ))}
                    </div>
                 </div>
                 {/* In Progress */}
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center justify-between">
                       Em Andamento <span className="bg-gray-200 text-gray-700 px-2 rounded-full text-xs">2</span>
                    </h4>
                    <div className="space-y-3">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md cursor-pointer">
                             <div className="flex justify-between mb-1">
                                <span className="text-xs bg-blue-50 text-blue-600 px-1 rounded font-medium">Média</span>
                                <span className="text-xs text-gray-400">Amanhã</span>
                             </div>
                             <p className="text-sm font-medium text-gray-800">Preparar contrato Acme Corp</p>
                          </div>
                    </div>
                 </div>
                 {/* Done */}
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center justify-between">
                       Concluído <span className="bg-gray-200 text-gray-700 px-2 rounded-full text-xs">12</span>
                    </h4>
                     <div className="space-y-3 opacity-60">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                             <div className="flex justify-between mb-1">
                                <span className="text-xs bg-green-50 text-green-600 px-1 rounded font-medium">Baixa</span>
                                <span className="text-xs text-gray-400">Ontem</span>
                             </div>
                             <p className="text-sm font-medium text-gray-800 line-through">Reunião de alinhamento</p>
                          </div>
                    </div>
                 </div>
              </div>
           </div>
        );
      
      case 'analytics':
         return (
            <div className="space-y-6 animate-fadeIn">
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-2">Tráfego de Mensagens</h3>
                  <p className="text-sm text-gray-500 mb-6">Volume total de mensagens enviadas e recebidas.</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={attendanceData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="tickets" name="Enviadas" fill="#9333ea" stackId="a" />
                          <Bar dataKey="avgTime" name="Recebidas" fill="#e9d5ff" stackId="a" />
                       </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
         );

      case 'metas':
        return (
          <div className="space-y-6 animate-fadeIn">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { title: 'Meta de Vendas (Q4)', current: 85000, target: 100000, color: 'bg-green-500' },
                  { title: 'Novos Leads (Mensal)', current: 45, target: 60, color: 'bg-blue-500' },
                  { title: 'Atendimentos Resolvidos', current: 120, target: 150, color: 'bg-purple-500' },
                ].map((meta, i) => (
                   <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-end mb-2">
                         <h3 className="font-bold text-gray-800">{meta.title}</h3>
                         <span className="text-sm font-bold text-gray-500">
                            {Math.round((meta.current / meta.target) * 100)}%
                         </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4 mb-2 overflow-hidden">
                         <div className={`h-4 rounded-full ${meta.color}`} style={{ width: `${(meta.current / meta.target) * 100}%` }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                         <span>Atual: {meta.current.toLocaleString()}</span>
                         <span>Meta: {meta.target.toLocaleString()}</span>
                      </div>
                   </div>
                ))}
             </div>
             
             <div className="flex justify-center mt-8">
                <button 
                  onClick={() => setShowGoalModal(true)}
                  className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-black transition-colors flex items-center shadow-lg"
                >
                  <Target size={18} className="mr-2" /> Definir Nova Meta
                </button>
             </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="p-6 h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
           <p className="text-gray-500">Análise completa de atendimentos e vendas.</p>
        </div>
        <div className="flex flex-wrap gap-3">
           <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
              {['7 dias', '30 dias', '90 dias'].map(d => (
                <button 
                  key={d}
                  onClick={() => setDateRange(d.replace(/\D/g, ''))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    dateRange === d.replace(/\D/g, '') 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {d}
                </button>
              ))}
           </div>
           <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 shadow-sm transition-colors">
             <RefreshCw size={16} className="mr-2" /> Atualizar
           </button>
           <button className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black shadow-sm transition-colors">
             <Download size={16} className="mr-2" /> Exportar
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 custom-scrollbar">
         {[
           {id: 'atendimento', label: 'Atendimento', icon: <MessageSquare size={18} />},
           {id: 'crm', label: 'CRM / Funil de Vendas', icon: <TrendingUp size={18} />},
           {id: 'propostas', label: 'Propostas', icon: <FileText size={18} />},
           {id: 'tarefas', label: 'Tarefas', icon: <CheckSquare size={18} />},
           {id: 'analytics', label: 'Analytics', icon: <PieChart size={18} />},
           {id: 'metas', label: 'Metas', icon: <Target size={18} />},
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
               activeTab === tab.id 
                 ? 'bg-purple-600 text-white shadow-md transform scale-[1.02]' 
                 : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-purple-600'
             }`}
           >
             <span className="mr-2 opacity-90">{tab.icon}</span> {tab.label}
           </button>
         ))}
      </div>

      {/* Content */}
      {renderContent()}

      {/* Goal Modal */}
      <Modal 
        isOpen={showGoalModal} 
        onClose={() => setShowGoalModal(false)}
        title="Nova Meta"
        footer={
           <div className="flex justify-end gap-2">
             <button onClick={() => setShowGoalModal(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancelar</button>
             <button onClick={() => setShowGoalModal(false)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">Criar Meta</button>
           </div>
        }
      >
        <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Meta</label>
             <select className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-purple-500 outline-none">
               <option>Deals Ganhos</option>
               <option>Valor em Deals (R$)</option>
               <option>Atendimentos Realizados</option>
             </select>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Valor Alvo</label>
               <input type="number" className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="100" />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
               <select className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-purple-500 outline-none">
                 <option>Mensal</option>
                 <option>Semanal</option>
                 <option>Trimestral</option>
               </select>
             </div>
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default Reports;