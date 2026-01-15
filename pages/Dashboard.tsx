
import React, { useState, useEffect } from 'react';
import { DASHBOARD_STATS, MOCK_USERS } from '../constants';
import { api } from '../services/api'; 
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
  Legend
} from 'recharts';
import { MessageSquare, Users } from 'lucide-react';

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
  const labels = generateDateLabels(days);
  return labels.map(label => ({
    name: label,
    leads: Math.floor(Math.random() * 50) + 10,
    vendas: Math.floor(Math.random() * 20) + 5
  }));
};

const Dashboard: React.FC = () => {
  const { addToast } = useToast();
  
  // Stats State
  const [stats, setStats] = useState(DASHBOARD_STATS);
  const [loadingStats, setLoadingStats] = useState(true);

  // Chart States
  const [flowRange, setFlowRange] = useState('7');
  const [flowData, setFlowData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
        try {
            setLoadingStats(true);
            const contacts = await api.contacts.list();
            
            const newStats = [...DASHBOARD_STATS];
            
            // Tickets
            const tickets = contacts.filter(c => c.status !== 'saved');
            newStats[0] = { 
                ...newStats[0], 
                value: tickets.length.toString(), 
                change: '+Realtime' 
            }; 

            // Mensagens
            newStats[1] = { 
                ...newStats[1], 
                value: '0', 
                change: '' 
            }; 

            // Conversas Abertas
            const openChats = contacts.filter(c => c.status === 'open').length;
            newStats[2] = { 
                ...newStats[2], 
                value: openChats.toString(), 
                change: 'Status: Aberto' 
            }; 

            // Base Completa
            newStats[3] = { 
                ...newStats[3], 
                value: contacts.length.toString(), 
                change: 'Base Completa' 
            };

            setStats(newStats);
            setLoadingStats(false);
        } catch (error) {
            console.error("Dashboard Load Error", error);
            // Fail silently or show generic toast
            setLoadingStats(false);
        }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const initialUserData = MOCK_USERS.map(user => ({
      name: user.name.split(' ')[0], 
      fullName: user.name,
      tickets: Math.floor(Math.random() * 60) + 10
    }));
    setUserData(initialUserData);
    setFlowData(generateFlowData(flowRange));
  }, [flowRange]);

  return (
    <div className="p-4 md:p-6 overflow-y-auto h-full bg-gray-50">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Visão geral da sua operação hoje (SaaS Cloud).</p>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
    </div>
  );
};

export default Dashboard;
