
import React, { useState, useEffect } from 'react';
import { DASHBOARD_STATS, MOCK_USERS } from '../constants';
import { api } from '../services/api'; // Import API to fetch real data
import { useToast } from '../components/ToastContext';
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
import { Filter, MessageSquare, Users } from 'lucide-react';

// --- Mock Data Generators (keep for charts for now) ---
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
  // ... simple logic
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
  const { addToast } = useToast();
  
  // Stats State (Dynamic now)
  const [stats, setStats] = useState(DASHBOARD_STATS);
  const [loadingStats, setLoadingStats] = useState(true);

  // Chart States
  const [flowRange, setFlowRange] = useState('7');
  const [flowCustomStart, setFlowCustomStart] = useState('');
  const [flowCustomEnd, setFlowCustomEnd] = useState('');
  const [flowData, setFlowData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);

  // --- Fetch Real Data ---
  useEffect(() => {
    const fetchDashboardData = async () => {
        try {
            setLoadingStats(true);
            // 1. Fetch Contacts for "Contatos" card
            const contacts = await api.contacts.list();
            
            // 2. Update Stats Array with REAL numbers (no fake multipliers)
            const newStats = [...DASHBOARD_STATS];
            
            // Total de Entradas (Atendimentos reais = Open + Resolved + Pending)
            // Exclui 'saved' da contagem de tickets
            const tickets = contacts.filter(c => c.status !== 'saved');
            newStats[0] = { 
                ...newStats[0], 
                value: tickets.length.toString(), 
                change: '+Realtime' 
            }; 

            // Mensagens Hoje (Placeholder - needs message API filter)
            newStats[1] = { 
                ...newStats[1], 
                value: '0', // Keep 0 if no real data source yet
                change: '' 
            }; 

            // Conversas Abertas
            const openChats = contacts.filter(c => c.status === 'open').length;
            newStats[2] = { 
                ...newStats[2], 
                value: openChats.toString(), 
                change: 'Status: Aberto' 
            }; 

            // Contatos Totais (Base completa)
            newStats[3] = { 
                ...newStats[3], 
                value: contacts.length.toString(), 
                change: 'Base Completa' 
            };

            setStats(newStats);
            setLoadingStats(false);
        } catch (error) {
            console.error("Dashboard Load Error", error);
            addToast("Erro ao carregar dados do dashboard", 'error');
            setLoadingStats(false);
        }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Initial Load User Data from Registered Users
    const initialUserData = MOCK_USERS.map(user => ({
      name: user.name.split(' ')[0], 
      fullName: user.name,
      tickets: Math.floor(Math.random() * 60) + 10
    }));
    setUserData(initialUserData);
    setFlowData(generateFlowData(flowRange));
    setTimelineData(generateTimelineData(24));
  }, [flowRange]);

  return (
    <div className="p-4 md:p-6 overflow-y-auto h-full bg-gray-50">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Visão geral da sua operação hoje (Conectado ao Supabase).</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            {loadingStats && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><div className="w-4 h-4 border-2 border-purple-600 rounded-full animate-spin border-t-transparent"></div></div>}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <span className={`text-xs font-medium ${stat.change.includes('+') ? 'text-green-600' : 'text-gray-500'} bg-gray-50 px-2 py-0.5 rounded-full mt-2 inline-block`}>
                {stat.change}
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
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-w-0 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Fluxo de Atendimentos</h3>
            <select 
              value={flowRange}
              onChange={(e) => setFlowRange(e.target.value)}
              className="text-sm border-gray-300 rounded-md text-gray-600 bg-white border p-1.5 focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Último Mês</option>
            </select>
          </div>
          
          <div className="h-72 w-full min-w-[300px] overflow-x-auto">
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
                <Tooltip />
                <Area type="monotone" dataKey="leads" name="Atendimentos" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: VENDAS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-w-0 overflow-hidden">
           <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Vendas vs Metas</h3>
          </div>
          <div className="h-72 w-full min-w-[200px]">
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

      {/* SECTION 2: TOTAL DE ATENDIMENTO POR USUÁRIO */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 min-w-0 overflow-hidden">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-lg font-semibold text-gray-800">Total de Atendimento por Usuário</h3>
         </div>

         <div className="h-64 w-full min-w-[300px] overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={userData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4b5563'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <Tooltip />
                  <Bar dataKey="tickets" name="Atendimentos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
