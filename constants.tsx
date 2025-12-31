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

// --- Empty Initials for Types safety ---

export const MOCK_USERS: User[] = [];
export const MOCK_CONTACTS: Contact[] = [];
export const MOCK_MESSAGES: Message[] = [];
export const MOCK_KANBAN_COLUMNS: KanbanColumn[] = [];
export const MOCK_PROPOSALS: Proposal[] = [];
export const MOCK_SAAS_STATS: SaasStats = {
  totalCompanies: 0,
  activeUsers: 0,
  mrr: 0,
  churnRate: 0
};
export const MOCK_PLANS: Plan[] = [];
export const MOCK_COMPANIES: Company[] = [];