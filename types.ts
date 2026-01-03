
import { ReactNode } from 'react';

// --- Shared / Core ---
export enum AppRoute {
  DASHBOARD = 'DASHBOARD',
  CHAT = 'CHAT',
  KANBAN = 'KANBAN',
  CONTACTS = 'CONTACTS',
  CAMPAIGNS = 'CAMPAIGNS',
  PROPOSALS = 'PROPOSALS', // Nova rota
  TASKS = 'TASKS',
  AUTOMATIONS = 'AUTOMATIONS',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS',
  
  // Super Admin Routes
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  ADMIN_COMPANIES = 'ADMIN_COMPANIES',
  ADMIN_PLANS = 'ADMIN_PLANS',
  ADMIN_FINANCE = 'ADMIN_FINANCE',
  ADMIN_DATABASE = 'ADMIN_DATABASE'
}

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  type?: 'general' | 'admin';
}

// --- Visual Identity / White Label ---
export interface Branding {
  appName: string;
  primaryColor: string;
  logoUrl?: string;
}

// --- Metadata Entities ---
export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Sector {
  id: string;
  name: string;
  color: string;
}

// --- Chat & Messaging ---
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  TEMPLATE = 'TEMPLATE',
  LOCATION = 'LOCATION'
}

export interface Message {
  id: string;
  content: string;
  senderId: string; // 'me' or contactId
  timestamp: string;
  type: MessageType;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  channel?: 'whatsapp' | 'instagram' | 'telegram';
  mediaUrl?: string; // URL for images/videos/docs
  fileName?: string; // Name for documents
  location?: { lat: number, lng: number };
  starred?: boolean; // Campo para mensagens favoritas
}

export interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email?: string;
  tags: string[];
  company?: string;
  sector?: string; // Setor do atendimento (Comercial, Suporte, etc)
  connectionName?: string; // Nome da conexão (WhatsApp 1, Insta Loja, etc)
  channel?: 'whatsapp' | 'instagram' | 'telegram';
  address?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  status: 'open' | 'pending' | 'resolved' | 'saved'; // 'saved' = Apenas na base, sem ticket
  pipelineStage?: string; // ID of the kanban stage
  pipelineValue?: number;
  notes?: string;
  blocked?: boolean;
  customFields?: Record<string, string>;
  
  // Enhanced Fields for Strategy
  cpfCnpj?: string;
  birthday?: string;
  source?: string; // Origem (Instagram, Google, Indicação)
  role?: string; // Cargo
  strategicNotes?: string; // Notas específicas para estratégia
  city?: string;
  state?: string;
}

// --- WhatsApp API Config ---
export interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string; // Global API Key for Evolution API
  instanceName: string;
}

// --- Kanban / CRM ---
export interface KanbanCard {
  id: string;
  title: string;
  value: number; // Monetary value
  contactId: string;
  contactName: string; // Denormalized for display
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  dueDate?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  color: string;
  cardsCount?: number; // Optional count helper
}

export interface Pipeline {
  id: string;
  name: string;
  columns: KanbanColumn[];
}

// --- Campaigns ---
export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
  createdAt: string;
  scheduledFor?: string;
  connectionId: string;
  stats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

// --- Proposals ---
export interface Proposal {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  value: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  sentDate: string; // ISO Date
  validUntil: string; // ISO Date
  pdfUrl?: string;
}

// --- Tasks ---
export type TaskPriority = 'p1' | 'p2' | 'p3' | 'p4';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO string 'YYYY-MM-DD'
  priority: TaskPriority;
  projectId: string; // 'inbox', 'financeiro', etc
  completed: boolean;
  assigneeId?: string;
  tags?: string[];
  subtasks?: Task[];
  
  // New Fields
  recurrence?: TaskRecurrence;
  reminderTime?: string; // '09:00', '14:30' etc.
}

// --- Automations & AI ---

export interface KBVersion {
  version: string; // v1.0, v1.1
  createdAt: string;
  description: string;
  fileCount: number;
  isActive: boolean;
}

export interface AIAgent {
  id: string;
  name: string;
  model: string;
  templateId?: string; // Link to registry
  status: 'active' | 'training' | 'inactive';
  systemInstruction?: string;
  // Fontes de conhecimento detalhadas
  knowledgeLinks: string[]; // Lista de URLs
  knowledgeFiles: { name: string; size: string; date: string }[]; // Metadados dos arquivos
  sources: {
    files: number; // Mantido para estatísticas rápidas
    links: number;
    drive: boolean;
  };
  kbVersion: string; // Current Active Version
  kbHistory: KBVersion[];
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  baseModel: string;
  defaultInstruction: string;
  capabilities: string[];
}

export interface AutomationFlow {
  id: string;
  name: string;
  trigger: string;
  steps: number;
  active: boolean;
}

export interface Integration {
  id: string;
  name: string;
  type: 'n8n' | 'typebot' | 'make' | 'webhook' | 'openai' | 'google';
  status: 'connected' | 'disconnected';
  icon?: string;
  lastSync?: string;
}

// --- Settings & Auth ---
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user' | 'supervisor';
  avatar: string;
  status: 'active' | 'inactive';
  companyId: string;
}

// --- SaaS / Multi-Tenant Core ---
export interface Plan {
  id: string;
  name: string;
  price: number;
  limits: {
    users: number;
    connections: number;
    messages: number;
  };
  features: {
    crm: boolean;
    campaigns: boolean;
    api: boolean;
  };
}

export interface Company {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  planId: string;
  status: 'active' | 'trial' | 'suspended' | 'overdue';
  subscriptionEnd: string;
  userCount: number;
  // AI Consumption Fields
  aiUsage: number; // Current tokens used
  aiLimit: number; // Max tokens allowed
  useCustomKey: boolean; // If true, uses tenant's key, ignores limit
  // Custom Feature Flags (Overrides Plan)
  features?: {
    crm: boolean;
    campaigns: boolean;
    automations: boolean;
    reports: boolean;
  };
}

export interface SaasStats {
  totalCompanies: number;
  activeUsers: number;
  mrr: number; // Monthly Recurring Revenue
  churnRate: number;
}

// --- Reports ---
export interface DateRange {
  start: Date;
  end: Date;
}

// --- AI Copilot ---
export interface AIInsight {
  type: 'sentiment' | 'suggestion' | 'crm_action' | 'risk';
  content: string;
  confidence: number;
}

// --- API Response Wrapper ---
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
