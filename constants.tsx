import React from 'react';
import { AppRoute, User, Plan, Company, SaasStats, Contact, Message, KanbanColumn, Proposal, MessageType } from './types';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Kanban as KanbanIcon, 
  Users, 
  Megaphone, 
  BarChart3, 
  Settings,
  Building,
  CreditCard,
  PieChart,
  Database,
  CheckSquare,
  Workflow,
  FileText
} from 'lucide-react';

export const APP_NAME = "Tech Chat";

export const NAVIGATION_ITEMS = [
  // General Tenant Routes
  { id: AppRoute.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: 'dashboard', type: 'general' },
  { id: AppRoute.CHAT, label: 'Atendimento', icon: <MessageSquare size={20} />, path: 'chat', type: 'general' },
  { id: AppRoute.TASKS, label: 'Minhas Tarefas', icon: <CheckSquare size={20} />, path: 'tasks', type: 'general' },
  { id: AppRoute.KANBAN, label: 'CRM / Kanban', icon: <KanbanIcon size={20} />, path: 'kanban', type: 'general' },
  { id: AppRoute.PROPOSALS, label: 'Propostas', icon: <FileText size={20} />, path: 'proposals', type: 'general' },
  { id: AppRoute.CONTACTS, label: 'Contatos', icon: <Users size={20} />, path: 'contacts', type: 'general' },
  { id: AppRoute.CAMPAIGNS, label: 'Disparos', icon: <Megaphone size={20} />, path: 'campaigns', type: 'general' },
  { id: AppRoute.AUTOMATIONS, label: 'Automações', icon: <Workflow size={20} />, path: 'automations', type: 'general' },
  { id: AppRoute.REPORTS, label: 'Relatórios', icon: <BarChart3 size={20} />, path: 'reports', type: 'general' },
  { id: AppRoute.SETTINGS, label: 'Configurações', icon: <Settings size={20} />, path: 'settings', type: 'general' },
  
  // Super Admin Routes
  { id: AppRoute.ADMIN_DASHBOARD, label: 'Visão Geral SaaS', icon: <PieChart size={20} />, path: 'admin/dashboard', type: 'admin' },
  { id: AppRoute.ADMIN_COMPANIES, label: 'Empresas', icon: <Building size={20} />, path: 'admin/companies', type: 'admin' },
  { id: AppRoute.ADMIN_PLANS, label: 'Planos & Limites', icon: <CreditCard size={20} />, path: 'admin/plans', type: 'admin' },
  { id: AppRoute.ADMIN_DATABASE, label: 'Banco de Dados', icon: <Database size={20} />, path: 'admin/database', type: 'admin' },
];

export const DASHBOARD_STATS = [
  { title: 'Total de entradas', value: '0', change: '', icon: <MessageSquare className="text-purple-600" /> },
  { title: 'Mensagens hoje', value: '0', change: '', icon: <MessageSquare className="text-blue-600" /> },
  { title: 'Conversas abertas', value: '0', change: '', icon: <MessageSquare className="text-orange-600" /> },
  { title: 'Contatos', value: '0', change: '', icon: <Users className="text-gray-600" /> },
];

// --- Mock Data for Fallback ---

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@techchat.com', role: 'super_admin', avatar: '', status: 'active', companyId: 'comp1' },
  { id: '2', name: 'João Silva', email: 'joao@techchat.com', role: 'user', avatar: 'https://ui-avatars.com/api/?name=Joao+Silva&background=random', status: 'active', companyId: 'comp1' },
  { id: '3', name: 'Maria Souza', email: 'maria@techchat.com', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Maria+Souza&background=random', status: 'active', companyId: 'comp1' }
];

export const MOCK_CONTACTS: Contact[] = [
  { 
    id: 'c1', 
    name: 'Elisa Maria', 
    phone: '5562994772890', 
    email: 'elisamaria01e@gmail.com', 
    avatar: 'https://ui-avatars.com/api/?name=Elisa+Maria&background=FFE4E1',
    tags: ['Interessado', 'Quente'],
    company: 'Esc Solutions',
    status: 'open',
    unreadCount: 1,
    lastMessage: 'Poderia me informar media de valores?',
    lastMessageTime: '10:30',
    pipelineValue: 1500,
    channel: 'whatsapp'
  },
  { 
    id: 'c2', 
    name: 'Roberto Carlos', 
    phone: '5511999998888', 
    avatar: 'https://ui-avatars.com/api/?name=Roberto+Carlos&background=E0F7FA',
    tags: ['Cliente'],
    company: 'RC Empreendimentos',
    status: 'pending',
    unreadCount: 0,
    lastMessage: 'Aguardando o contrato.',
    lastMessageTime: 'Ontem',
    pipelineValue: 5000,
    channel: 'whatsapp'
  },
  { 
    id: 'c3', 
    name: 'Ana Julia', 
    phone: '5521988887777', 
    avatar: 'https://ui-avatars.com/api/?name=Ana+Julia&background=F3E5F5',
    tags: ['Suporte'],
    company: 'Design Co.',
    status: 'resolved',
    unreadCount: 0,
    lastMessage: 'Obrigada pelo atendimento!',
    lastMessageTime: '22/12',
    channel: 'whatsapp'
  }
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'm1', content: 'Olá, bom dia! Gostaria de saber mais sobre o sistema.', senderId: 'c1', timestamp: '10:00', type: MessageType.TEXT, status: 'read' },
  { id: 'm2', content: 'Olá Elisa! Claro, como posso ajudar?', senderId: 'me', timestamp: '10:05', type: MessageType.TEXT, status: 'read' },
  { id: 'm3', content: 'Poderia me informar media de valores?', senderId: 'c1', timestamp: '10:30', type: MessageType.TEXT, status: 'read' },
];

export const MOCK_KANBAN_COLUMNS: KanbanColumn[] = []; // Populated in API mock logic if needed
export const MOCK_PROPOSALS: Proposal[] = [
  { id: 'p1', clientId: 'c1', clientName: 'Elisa Maria', title: 'Implantação CRM', value: 1500, status: 'pending', sentDate: new Date().toISOString(), validUntil: new Date().toISOString() },
  { id: 'p2', clientId: 'c2', clientName: 'Roberto Carlos', title: 'Renovação Anual', value: 5000, status: 'accepted', sentDate: '2023-12-01', validUntil: '2023-12-30' }
];

// Static Data for Admin/SaaS Logic (Can remain static or move to DB)
export const MOCK_SAAS_STATS: SaasStats = {
  totalCompanies: 124,
  activeUsers: 856,
  mrr: 45200.00,
  churnRate: 2.1
};

export const MOCK_PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Start',
    price: 199.90,
    limits: { users: 2, connections: 1, messages: 5000 },
    features: { crm: true, campaigns: false, api: false }
  },
  {
    id: 'pro',
    name: 'Growth',
    price: 499.90,
    limits: { users: 10, connections: 5, messages: 50000 },
    features: { crm: true, campaigns: true, api: true }
  },
  {
    id: 'enterprise',
    name: 'Scale',
    price: 999.90,
    limits: { users: 999, connections: 20, messages: 999999 },
    features: { crm: true, campaigns: true, api: true }
  }
];

export const MOCK_COMPANIES: Company[] = [
  {
    id: 'comp1',
    name: 'Acme Corp',
    ownerName: 'Roberto Silva',
    email: 'roberto@acme.com',
    phone: '11999999999',
    planId: 'pro',
    status: 'active',
    subscriptionEnd: '2025-01-20',
    userCount: 8,
    aiUsage: 15400,
    aiLimit: 50000,
    useCustomKey: false,
    features: {
      crm: true,
      campaigns: true,
      automations: true,
      reports: true
    }
  }
];