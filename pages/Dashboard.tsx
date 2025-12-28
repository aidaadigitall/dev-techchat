import React, { useState, useEffect } from 'react';
import { DASHBOARD_STATS, MOCK_USERS } from '../constants';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Calendar, Filter, Search } from 'lucide-react';

// --- Mock Data Generators ---

const generateDateLabels = (days: number) => {
  const labels = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  }
  return labels;
};

const generateFlowData = (range: string) => {
  let days = 7;
  if (range === '15') days = 15;
  if (range === '30') days = 30;
  if (range === '90') days = 90;
  if (range === '180') days = 180;
  if (range === '365') days = 365;

  const labels = generateDateLabels(days);
  return labels.map(label => ({
    name: label,
    leads: Math.floor(Math.random() * 50) + 10,
    vendas: Math.floor(Math.random() * 20) + 5
  }));
};

const generateTimelineData = (points: number) => {
  const data = [];
  for (let i = 0; i < points; i++) {
    data.push({
      time: i < 24 ? `${i}:00` : `Dia ${i+1}`,
      tickets: Math.floor(Math.random() * 15)
    });
  }
  return data;
};

const Dashboard: React.FC = () => {
  // --- States ---
  
  // 1. Fluxo de Atendimentos Filter
  const [flowRange, setFlowRange] = useState('7');
  const [flowCustomStart, setFlowCustomStart] = useState('');
  const [flowCustomEnd, setFlowCustomEnd] = useState('');
  const [flowData, setFlowData] = useState<any[]>([]);

  // 2. User Stats Filter
  const [userStatsStart, setUserStatsStart] = useState(new Date().toISOString().split('T')[0]);
  const [userStatsEnd, setUserStatsEnd] = useState(new Date().toISOString().split('T')[0]);
  const [userData, setUserData] = useState<any[]>([]);

  // 3. Total Attendance Filter
  const [totalStatsStart, setTotalStatsStart] = useState(new Date().toISOString().split('T')[0]);
  const [totalStatsEnd, setTotalStatsEnd] = useState(new Date().toISOString().split('T')[0]);
  const [timelineData, setTimelineData] = useState<any[]>([]);

  // --- Effects ---

  useEffect(() => {
    // Initial Load User Data from Registered Users
    const initialUserData = MOCK_USERS.map(user => ({
      name: user.name.split(' ')[0], // First name only for chart
      fullName: user.name,
      tickets: Math.floor(Math.random() * 60) + 10
    }));
    setUserData(initialUserData);
  }, []);

  useEffect(() => {
    // Simulate API call for Flow Chart when filter changes
    if (flowRange !== 'custom') {
      setFlowData(generateFlowData(flowRange));
    } else {
      // Logic for custom date would go here
      setFlowData(generateFlowData('7')); // Fallback for mock
    }
  }, [flowRange, flowCustomStart, flowCustomEnd]);

  useEffect(() => {
    // Initial Load for Timeline
    setTimelineData(generateTimelineData(24));
  }, []);

  // --- Handlers ---

  const handleFilterUserStats = () => {
    // Simulate filtering users by date (regenerate random numbers for demo)
    const randomized = MOCK_USERS.map(user => ({
      name: user.name.split(' ')[0],
      fullName: user.name,
      tickets: Math.floor(Math.random() * 80) + 10
    }));
    setUserData(randomized);
  };

  const handleFilterTotalStats = () => {
    // Simulate filtering total timeline
    setTimelineData(generateTimelineData(24));
  };

  return (
    <div className="p-6 overflow-y-auto h-full bg-gray-50">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Visão geral da sua operação hoje.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {DASHBOARD_STATS.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'} bg-gray-50 px-2 py-0.5 rounded-full mt-2 inline-block`}>
                {stat.change} vs ontem
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Fluxo & Vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* CHART 1: FLUXO DE ATENDIMENTOS */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Fluxo de Atendimentos</h3>
            
            <div className="flex flex-wrap items-center gap-2">
              {flowRange === 'custom' && (
                <div className="flex items-center gap-2 animate-fadeIn">
                   <input 
                     type="date" 
                     className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-purple-500 bg-white"
                     value={flowCustomStart}
                     onChange={e => setFlowCustomStart(e.target.value)}
                   />
                   <span className="text-gray-400 text-xs">até</span>
                   <input 
                     type="date" 
                     className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-purple-500 bg-white"
                     value={flowCustomEnd}
                     onChange={e => setFlowCustomEnd(e.target.value)}
                   />
                </div>
              )}
              
              <select 
                value={flowRange}
                onChange={(e) => setFlowRange(e.target.value)}
                className="text-sm border-gray-300 rounded-md text-gray-600 bg-white border p-1.5 focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
              >
                <option value="7">Últimos 7 dias</option>
                <option value="15">Últimos 15 dias</option>
                <option value="30">Último Mês</option>
                <option value="90">Últimos 3 meses</option>
                <option value="180">Últimos 6 meses</option>
                <option value="365">Último Ano</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} dy={10} minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} 
                  itemStyle={{fontSize: '12px', fontWeight: 500}}
                />
                <Area type="monotone" dataKey="leads" name="Atendimentos" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: VENDAS (MANTIDO SIMPLES) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Vendas vs Metas</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData.slice(0, 7)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Legend iconType="circle" />
                <Bar dataKey="vendas" name="Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 2: TOTAL DE ATENDIMENTO POR USUÁRIO (CADASTRADOS NO SISTEMA) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-lg font-semibold text-gray-800">Total de Atendimento por Usuário</h3>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
               <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Data inicial</span>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-40 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                      value={userStatsStart}
                      onChange={e => setUserStatsStart(e.target.value)}
                    />
                  </div>
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Data final</span>
                  <div className="relative">
                     <input 
                        type="date" 
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-40 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                        value={userStatsEnd}
                        onChange={e => setUserStatsEnd(e.target.value)}
                     />
                  </div>
               </div>
               <div className="flex items-end">
                  <button 
                    onClick={handleFilterUserStats}
                    className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm h-[38px]"
                  >
                    <Filter size={16} className="mr-2" /> FILTRAR
                  </button>
               </div>
            </div>
         </div>

         <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={userData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4b5563'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <Tooltip 
                     cursor={{fill: '#f3f4f6'}}
                     contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                     formatter={(value, name, props) => [value, `Atendimentos (${props.payload.fullName})`]}
                  />
                  <Bar dataKey="tickets" name="Atendimentos" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* SECTION 3: TOTAL DE ATENDIMENTOS (VOLUME) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
               <h3 className="text-lg font-semibold text-gray-800">Total de Atendimentos</h3>
               <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {timelineData.reduce((acc, curr) => acc + curr.tickets, 0)}
               </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
               <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Data inicial</span>
                  <input 
                     type="date" 
                     className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                     value={totalStatsStart}
                     onChange={e => setTotalStatsStart(e.target.value)}
                  />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Data final</span>
                  <input 
                     type="date" 
                     className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                     value={totalStatsEnd}
                     onChange={e => setTotalStatsEnd(e.target.value)}
                  />
               </div>
               <div className="flex items-end">
                  <button 
                    onClick={handleFilterTotalStats}
                    className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm h-[38px]"
                  >
                    FILTRAR DATA
                  </button>
               </div>
            </div>
         </div>

         <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
               <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6b7280'}} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <Tooltip 
                     contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb'}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tickets" 
                    name="Tickets" 
                    stroke="#2563eb" 
                    strokeWidth={2} 
                    dot={{r: 3, fill: '#2563eb', strokeWidth: 0}} 
                    activeDot={{r: 6}} 
                  />
               </LineChart>
            </ResponsiveContainer>
         </div>
      </div>
      
      {/* Recent Activity List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
           <h3 className="text-lg font-semibold text-gray-800">Atividades Recentes</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3].map((i) => (
             <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
               <div className="flex items-center">
                 <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm mr-4">
                   JD
                 </div>
                 <div>
                   <p className="text-sm font-medium text-gray-900">John Doe iniciou um novo atendimento</p>
                   <p className="text-xs text-gray-500">Há 5 minutos • WhatsApp</p>
                 </div>
               </div>
               <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Novo Lead</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;