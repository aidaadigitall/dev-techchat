import React from 'react';
import { AppRoute, User, Plan, Company, SaasStats, Contact, Message, KanbanColumn, Proposal } from './types';
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

// Initialize empty arrays to prevent build errors in files that import them
// These will now be populated by API calls in the components
export const MOCK_USERS: User[] = [];
export const MOCK_CONTACTS: Contact[] = [];
export const MOCK_MESSAGES: Message[] = [];
export const MOCK_KANBAN_COLUMNS: KanbanColumn[] = [];
export const MOCK_PROPOSALS: Proposal[] = [];

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
    useCustomKey: false
  }
];