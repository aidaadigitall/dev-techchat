
import { ReactNode } from 'react';

// --- Shared / Core ---
export enum AppRoute {
  DASHBOARD = 'DASHBOARD',
  CHAT = 'CHAT',
  KANBAN = 'KANBAN',
  CONTACTS = 'CONTACTS',
  CAMPAIGNS = 'CAMPAIGNS',
  PROPOSALS = 'PROPOSALS',
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

export interface Branding {
  appName: string;
  primaryColor: string;
  logoUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // 'super_admin' | 'admin' | 'user'
  tenantId: string;
  avatar?: string;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  ownerName: string;
  planId?: string;
  status: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  active?: boolean;
  limits: {
    users: number;
    connections: number;
    messages: number;
  };
  features: {
    crm: boolean;
    campaigns: boolean;
    api: boolean;
    automations?: boolean;
    reports?: boolean;
  };
}

export interface Company extends Tenant {
  // Frontend extension for Company management table
  userCount: number;
  subscriptionEnd?: string;
  aiUsage: number;
  aiLimit: number;
  useCustomKey: boolean;
  features?: Plan['features'];
}

// ... Rest of the types (Contacts, Messages, etc) remain mostly the same for now ...
// Simplified for brevity, ensuring no breaking changes in other files
export interface Contact {
  id: string;
  name: string;
  avatar?: string;
  phone: string;
  email?: string;
  tags: string[];
  company?: string;
  role?: string;
  status: 'open' | 'pending' | 'resolved' | 'saved';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  channel?: 'whatsapp' | 'instagram';
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT'
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  type: MessageType;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  channel: 'whatsapp';
}

export interface SaasStats {
  totalCompanies: number;
  activeUsers: number;
  mrr: number;
  churnRate: number;
}

export type TaskPriority = 'p1' | 'p2' | 'p3' | 'p4';

export interface WhatsAppConfig {
  id: string;
  name: string;
  status: string;
  qr_code?: string;
  engine?: string;
}

// Keeping UI types to prevent breakages
export interface Pipeline { id: string; name: string; columns: KanbanColumn[] }
export interface KanbanColumn { id: string; title: string; cards: KanbanCard[]; color: string }
export interface KanbanCard { id: string; title: string; value: number; contactId: string; contactName: string; priority: string; }
export interface Campaign { id: string; name: string; status: string; }
export interface Proposal { id: string; clientId: string; clientName: string; title: string; value: number; status: string; sentDate: string; validUntil: string; }
export interface Task { id: string; title: string; completed: boolean; dueDate?: string; priority: string; projectId: string; }
export interface AutomationFlow { id: string; name: string; trigger: string; steps: number; active: boolean; }
export interface AIAgent { id: string; name: string; model: string; status: string; kbVersion: string; knowledgeFiles: any[]; knowledgeLinks: any[]; sources: any; templateId?: string; systemInstruction?: string; kbHistory?: any[]; }
export interface Integration { id: string; name: string; type: string; status: string; icon?: string; lastSync?: string; }
export interface AgentTemplate { id: string; name: string; description: string; baseModel: string; defaultInstruction: string; capabilities: string[]; }
export interface KBVersion { version: string; createdAt: string; description: string; fileCount: number; isActive: boolean; }
