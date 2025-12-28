import React from 'react';
import { Contact, KanbanColumn, Message, MessageType, AppRoute, Plan, Company, SaasStats, User } from './types';
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
  CheckSquare
} from 'lucide-react';

export const APP_NAME = "OmniConnect";

export const NAVIGATION_ITEMS = [
  // General Tenant Routes
  { id: AppRoute.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: 'dashboard', type: 'general' },
  { id: AppRoute.CHAT, label: 'Atendimento', icon: <MessageSquare size={20} />, path: 'chat', type: 'general' },
  { id: AppRoute.TASKS, label: 'Minhas Tarefas', icon: <CheckSquare size={20} />, path: 'tasks', type: 'general' },
  { id: AppRoute.KANBAN, label: 'CRM / Kanban', icon: <KanbanIcon size={20} />, path: 'kanban', type: 'general' },
  { id: AppRoute.CONTACTS, label: 'Contatos', icon: <Users size={20} />, path: 'contacts', type: 'general' },
  { id: AppRoute.CAMPAIGNS, label: 'Disparos', icon: <Megaphone size={20} />, path: 'campaigns', type: 'general' },
  { id: AppRoute.REPORTS, label: 'Relatórios', icon: <BarChart3 size={20} />, path: 'reports', type: 'general' },
  { id: AppRoute.SETTINGS, label: 'Configurações', icon: <Settings size={20} />, path: 'settings', type: 'general' },
  
  // Super Admin Routes
  { id: AppRoute.ADMIN_DASHBOARD, label: 'Visão Geral SaaS', icon: <PieChart size={20} />, path: 'admin/dashboard', type: 'admin' },
  { id: AppRoute.ADMIN_COMPANIES, label: 'Empresas', icon: <Building size={20} />, path: 'admin/companies', type: 'admin' },
  { id: AppRoute.ADMIN_PLANS, label: 'Planos & Limites', icon: <CreditCard size={20} />, path: 'admin/plans', type: 'admin' },
  { id: AppRoute.ADMIN_DATABASE, label: 'Banco de Dados', icon: <Database size={20} />, path: 'admin/database', type: 'admin' },
];

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@omniconnect.com', role: 'admin', avatar: '', status: 'active', companyId: 'comp1' },
  { id: '2', name: 'Maria Silva', email: 'maria@omniconnect.com', role: 'user', avatar: '', status: 'active', companyId: 'comp1' },
  { id: '3', name: 'João Santos', email: 'joao@omniconnect.com', role: 'user', avatar: '', status: 'active', companyId: 'comp1' },
  { id: '4', name: 'Ana Costa', email: 'ana@omniconnect.com', role: 'supervisor', avatar: '', status: 'active', companyId: 'comp1' }
];

export const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Elisa Maria',
    avatar: 'https://ui-avatars.com/api/?name=Elisa+Maria&background=9333ea&color=fff',
    phone: '+55 62 99477-2890',
    tags: ['Cliente', 'VIP'],
    company: 'Tech Corp',
    sector: 'Comercial',
    connectionName: 'WhatsApp 1',
    channel: 'whatsapp',
    lastMessage: 'Sim, pode encaminhar',
    lastMessageTime: '10:38',
    unreadCount: 0,
    status: 'open',
    email: 'elisa@example.com',
    pipelineValue: 1500.00
  },
  {
    id: '2',
    name: 'Esc Solutions',
    avatar: 'https://ui-avatars.com/api/?name=Esc+Solutions&background=0d9488&color=fff',
    phone: '+55 11 98888-8888',
    tags: ['Lead'],
    company: 'Logística SA',
    sector: 'Pré-Vendas',
    connectionName: 'WhatsApp 1',
    channel: 'whatsapp',
    lastMessage: 'Bom dia, gostaria de um orçamento',
    lastMessageTime: '09:21',
    unreadCount: 1,
    status: 'pending',
    email: 'contato@escsolutions.com',
    pipelineValue: 5000.00
  },
  {
    id: '3',
    name: 'Fernanda Lima',
    avatar: 'https://ui-avatars.com/api/?name=Fernanda+Lima&background=db2777&color=fff',
    phone: '+55 21 97777-7777',
    tags: ['Suporte'],
    company: 'Retail Group',
    sector: 'Suporte',
    connectionName: 'Instagram',
    channel: 'instagram',
    lastMessage: 'Resolvido, obrigado!',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    status: 'resolved',
    email: 'fernanda@retail.com'
  }
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1',
    content: 'Poderia me informar se é seguro?',
    senderId: '1',
    timestamp: '10:29',
    type: MessageType.TEXT,
    status: 'read'
  },
  {
    id: 'm2',
    content: 'Sim, o Nextcloud é uma solução muito segura. Ele é projetado como uma nuvem privada e profissional, o que significa que você tem controle total sobre os dados, diferente de serviços públicos.\n\nA segurança é garantida por diversos fatores:\nControle e segurança dos dados: Você tem permissões detalhadas, auditoria completa e histórico de arquivos.\nImplantação profissional pela ESC Informática: Inclui configuração completa com SSL (criptografia), backups regulares e outras medidas de segurança.\nSegurança corporativa: Utilizamos firewall e políticas de acesso rigorosas para proteger seus dados.\n\nIsso garante que suas informações estejam protegidas e acessíveis apenas por quem você autoriza.',
    senderId: 'me',
    timestamp: '10:30',
    type: MessageType.TEXT,
    status: 'read'
  },
  {
    id: 'm3',
    content: 'poderia me informar media de valores?',
    senderId: '1',
    timestamp: '10:33',
    type: MessageType.TEXT,
    status: 'read'
  },
  {
    id: 'm4',
    content: 'O valor do Nextcloud depende muito das necessidades específicas da sua organização, como o volume de armazenamento, o número de usuários e as funcionalidades adicionais que podem ser necessárias. Por isso, não consigo te dar um valor médio sem mais detalhes.\n\nPara te dar uma proposta mais assertiva, posso te encaminhar para um consultor que entenderá suas necessidades e montará um plano ideal para sua empresa.\n\nGostaria de ser encaminhado para um consultor agora? Se sim, posso coletar seu nome, telefone e, se for para uma empresa, o nome dela.',
    senderId: 'me',
    timestamp: '10:37',
    type: MessageType.TEXT,
    status: 'read'
  },
  {
    id: 'm5',
    content: 'sim, pode encaminhar',
    senderId: '1',
    timestamp: '10:38',
    type: MessageType.TEXT,
    status: 'read'
  }
];

export const MOCK_KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'col1',
    title: 'Novo Lead',
    color: 'border-yellow-400',
    cards: [
      { id: 'c1', title: 'Elisa Maria', value: 1500.00, contactName: 'Elisa Maria', contactId: '1', priority: 'medium', tags: [] },
    ]
  },
  {
    id: 'col2',
    title: 'Em Progresso',
    color: 'border-blue-500',
    cards: []
  },
  {
    id: 'col3',
    title: 'Proposta',
    color: 'border-purple-500',
    cards: []
  },
  {
    id: 'col4',
    title: 'Fechado',
    color: 'border-green-500',
    cards: []
  },
  {
    id: 'col5',
    title: 'Perdido',
    color: 'border-red-500',
    cards: []
  },
  {
    id: 'col6',
    title: 'Retornar',
    color: 'border-gray-500',
    cards: []
  }
];

export const DASHBOARD_STATS = [
  { title: 'Total de entradas', value: '0', change: '', icon: <MessageSquare className="text-purple-600" /> },
  { title: 'Mensagens hoje', value: '0', change: '', icon: <MessageSquare className="text-blue-600" /> },
  { title: 'Conversas abertas', value: '0', change: '', icon: <MessageSquare className="text-orange-600" /> },
  { title: 'Contatos', value: '1', change: '', icon: <Users className="text-gray-600" /> },
];

// --- SaaS MOCK DATA ---

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
    userCount: 8
  },
  {
    id: 'comp2',
    name: 'Padaria Central',
    ownerName: 'Maria Oliveira',
    email: 'maria@padaria.com',
    phone: '11888888888',
    planId: 'basic',
    status: 'overdue',
    subscriptionEnd: '2024-12-15',
    userCount: 2
  },
  {
    id: 'comp3',
    name: 'Startup X',
    ownerName: 'João Dev',
    email: 'joao@x.com',
    phone: '11777777777',
    planId: 'enterprise',
    status: 'active',
    subscriptionEnd: '2025-06-01',
    userCount: 45
  }
];