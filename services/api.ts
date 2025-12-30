import { Contact, Message, MessageType, Pipeline, Campaign, QuickReply, AIInsight, Task, Proposal, KanbanColumn, Tag, Sector, Company, Plan, User } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';
import { MOCK_COMPANIES, MOCK_PLANS, MOCK_CONTACTS, MOCK_MESSAGES, MOCK_PROPOSALS } from '../constants';

// Robust environment variable accessor
const getEnv = (key: string) => {
  let value = '';
  try {
    // Vite / Modern Browsers
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      value = import.meta.env[key];
    }
  } catch (e) { }

  if (!value) {
    try {
      // Node.js / CRA
      if (typeof process !== 'undefined' && process.env && process.env[key]) {
        value = process.env[key];
      }
    } catch (e) { }
  }
  return value || '';
};

// Lazy initialization of AI Client
let aiClientInstance: GoogleGenAI | null = null;
const getAiClient = () => {
  if (!aiClientInstance) {
    const apiKey = getEnv('API_KEY');
    // If no key provided, we can't really init useful AI, but we handle it in calls
    aiClientInstance = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  }
  return aiClientInstance;
};

// --- Adapters ---

const adaptContact = (data: any): Contact => ({
  id: data.id,
  name: data.name,
  phone: data.phone,
  email: data.email,
  avatar: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
  tags: data.tags || [],
  company: data.custom_fields?.company,
  status: data.status || 'open',
  unreadCount: 0, 
  lastMessage: '',
  lastMessageTime: data.last_message_at ? new Date(data.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
  pipelineValue: data.pipeline_value || 0,
  cpfCnpj: data.custom_fields?.cpfCnpj,
  birthday: data.custom_fields?.birthday,
  source: data.custom_fields?.source,
  role: data.custom_fields?.role,
  strategicNotes: data.custom_fields?.strategicNotes,
  city: data.custom_fields?.city,
  state: data.custom_fields?.state,
  customFields: data.custom_fields
});

const adaptMessage = (data: any): Message => ({
  id: data.id,
  content: data.content,
  senderId: data.is_from_me ? 'me' : data.contact_id, 
  timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  type: (data.type as MessageType) || MessageType.TEXT,
  status: data.status || 'sent',
  channel: 'whatsapp',
  mediaUrl: data.media_url,
  fileName: data.file_name,
  starred: data.is_starred || false
});

const adaptTask = (data: any): Task => ({
  id: data.id,
  title: data.title,
  description: data.description,
  dueDate: data.due_date,
  priority: data.priority,
  projectId: data.project_id || 'inbox',
  completed: data.completed,
  assigneeId: data.assignee_id,
  tags: data.tags || [],
  subtasks: []
});

const adaptProposal = (data: any): Proposal => ({
  id: data.id,
  clientId: data.contact_id,
  clientName: 'Carregando...',
  title: data.title,
  value: data.value,
  status: data.status,
  sentDate: data.sent_date,
  validUntil: data.valid_until,
  pdfUrl: data.pdf_url
});

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- In-Memory Stores (Simulated DB) ---
let companiesStore: Company[] = [...MOCK_COMPANIES];
let plansStore: Plan[] = [...MOCK_PLANS];

// --- API Service ---

export const api = {
  contacts: {
    list: async (): Promise<Contact[]> => {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('last_message_at', { ascending: false });
        
        if (error) throw error;
        return data.map(adaptContact);
      } catch (e) {
        console.warn("API Error (Fallback to Mock):", e);
        return MOCK_CONTACTS;
      }
    },
    getById: async (id: string): Promise<Contact | undefined> => {
      try {
        const { data } = await supabase.from('contacts').select('*').eq('id', id).single();
        return data ? adaptContact(data) : MOCK_CONTACTS.find(c => c.id === id);
      } catch (e) {
        return MOCK_CONTACTS.find(c => c.id === id);
      }
    },
    create: async (contact: Partial<Contact>): Promise<Contact> => {
      try {
        const dbPayload = {
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          tags: contact.tags,
          custom_fields: { 
              company: contact.company,
              cpfCnpj: contact.cpfCnpj,
              birthday: contact.birthday,
              source: contact.source,
              role: contact.role,
              strategicNotes: contact.strategicNotes,
              city: contact.city,
              state: contact.state
          },
          status: contact.status || 'open'
        };
        
        const { data, error } = await supabase.from('contacts').insert(dbPayload).select().single();
        
        if (error) throw error;
        return adaptContact(data);
      } catch (e) {
        console.warn("Create Failed, returning mock");
        await delay(500);
        return { 
            ...MOCK_CONTACTS[0], 
            ...contact, 
            id: `temp_${Date.now()}`,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || '')}&background=random`
        } as Contact;
      }
    },
    update: async (id: string, updates: Partial<Contact>): Promise<Contact> => {
      try {
        const dbPayload: any = {};
        if (updates.name !== undefined) dbPayload.name = updates.name;
        if (updates.phone !== undefined) dbPayload.phone = updates.phone;
        if (updates.email !== undefined) dbPayload.email = updates.email;
        if (updates.status !== undefined) dbPayload.status = updates.status;
        if (updates.tags !== undefined) dbPayload.tags = updates.tags;

        // Simplified custom fields merge for demo
        const customFieldsUpdate: any = {};
        if(updates.company) customFieldsUpdate.company = updates.company;
        if(updates.cpfCnpj) customFieldsUpdate.cpfCnpj = updates.cpfCnpj;
        
        if(Object.keys(customFieldsUpdate).length > 0) {
            dbPayload.custom_fields = customFieldsUpdate; 
        }

        const { data, error } = await supabase.from('contacts').update(dbPayload).eq('id', id).select().single();
        if (error) throw error;
        return adaptContact(data);
      } catch (e) {
        console.warn("Update Failed, returning mock");
        const existing = MOCK_CONTACTS.find(c => c.id === id) || MOCK_CONTACTS[0];
        return { ...existing, ...updates };
      }
    }
  },

  chat: {
    getMessages: async (contactId: string): Promise<Message[]> => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        return data.map(adaptMessage);
      } catch (e) {
        return MOCK_MESSAGES;
      }
    },
    sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT): Promise<Message> => {
      try {
        const payload = {
          contact_id: contactId,
          content,
          type,
          is_from_me: true,
          status: 'sent'
        };
        const { data, error } = await supabase.from('messages').insert(payload).select().single();
        if (error) throw error;
        return adaptMessage(data);
      } catch (e) {
        return {
            id: Date.now().toString(),
            content,
            senderId: 'me',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type,
            status: 'sent',
            starred: false
        };
      }
    },
    getQuickReplies: async (): Promise<QuickReply[]> => {
      return [
        { id: '1', shortcut: '/oi', content: 'Olá! Tudo bem? Como posso ajudar você hoje?' },
        { id: '2', shortcut: '/pix', content: 'Nossa chave PIX é o CNPJ: 12.345.678/0001-90.' }
      ];
    }
  },

  tasks: {
    list: async (): Promise<Task[]> => {
      try {
        const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
        if (error) throw error;
        return data.map(adaptTask);
      } catch (e) {
        return [];
      }
    },
    create: async (task: Partial<Task>): Promise<Task> => {
      return { ...task, id: Date.now().toString() } as Task;
    },
    update: async (id: string, updates: Partial<Task>): Promise<Task> => {
      return { id, ...updates } as Task;
    },
    delete: async (id: string): Promise<void> => {}
  },

  crm: {
    getPipelines: async (): Promise<Pipeline[]> => {
      try {
        const { data: pipelines, error } = await supabase
          .from('pipelines')
          .select(`*, columns:kanban_columns(*, cards:kanban_cards(*))`);
        if (error) throw error;
        return pipelines.map((p: any) => ({
          id: p.id,
          name: p.name,
          columns: p.columns.map((col: any) => ({
            id: col.id,
            title: col.title,
            color: col.color,
            cards: col.cards.map((card: any) => ({
              id: card.id,
              title: card.title,
              value: card.value,
              contactName: card.title,
              priority: card.priority,
              tags: [],
              contactId: card.contact_id
            }))
          }))
        }));
      } catch (e) {
        return [{
            id: '1', name: 'Vendas Padrão',
            columns: [
                { id: 'c1', title: 'Novo Lead', color: 'border-blue-500', cards: [{ id: 'cd1', title: 'Elisa Maria', value: 1500, contactId: 'c1', contactName: 'Elisa Maria', priority: 'high', tags: [] }] },
                { id: 'c2', title: 'Negociação', color: 'border-yellow-500', cards: [] },
                { id: 'c3', title: 'Fechado', color: 'border-green-500', cards: [] }
            ]
        }];
      }
    },
    moveCard: async (cardId: string, sourceColId: string, destColId: string) => {
      return true;
    }
  },

  proposals: {
    list: async (): Promise<Proposal[]> => {
        try {
            const { data, error } = await supabase.from('proposals').select(`*, contact:contacts(name)`);
            if (error) throw error;
            return data.map((p: any) => ({ ...adaptProposal(p), clientName: p.contact?.name || 'Cliente' }));
        } catch (e) {
            return MOCK_PROPOSALS;
        }
    },
    create: async (data: Partial<Proposal>): Promise<Proposal> => {
      return { ...data, id: Date.now().toString(), status: 'pending', sentDate: new Date().toISOString() } as Proposal;
    },
    update: async (id: string, updates: Partial<Proposal>): Promise<Proposal> => {
      return {} as Proposal;
    }
  },

  companies: {
    list: async (): Promise<Company[]> => { await delay(300); return companiesStore; },
    create: async (company: Partial<Company>): Promise<Company> => {
      const newCompany = { ...company, id: `comp_${Date.now()}` } as Company;
      companiesStore = [...companiesStore, newCompany];
      return newCompany;
    },
    update: async (id: string, updates: Partial<Company>): Promise<Company> => {
      companiesStore = companiesStore.map(c => c.id === id ? { ...c, ...updates } : c);
      return companiesStore.find(c => c.id === id)!;
    },
    delete: async (id: string): Promise<void> => {
      companiesStore = companiesStore.filter(c => c.id !== id);
    }
  },

  plans: {
    list: async (): Promise<Plan[]> => { await delay(300); return plansStore; },
    save: async (plan: Plan): Promise<Plan> => {
      const exists = plansStore.find(p => p.id === plan.id);
      if (exists) {
        plansStore = plansStore.map(p => p.id === plan.id ? plan : p);
      } else {
        plansStore = [...plansStore, plan];
      }
      return plan;
    }
  },

  users: {
    updateProfile: async (data: { name?: string }) => { return {}; }
  },

  campaigns: {
    list: async (): Promise<Campaign[]> => { return []; },
    create: async (data: any): Promise<Campaign> => { return { id: '123', name: data.name, status: 'scheduled', createdAt: new Date().toISOString(), connectionId: '', stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 } }; }
  },
  
  ai: {
    generateInsight: async (context: 'chat' | 'kanban', data: any): Promise<AIInsight[]> => {
      await delay(1000);
      return [{ type: 'suggestion', content: 'Cliente com alto potencial de compra.', confidence: 0.9 }];
    },
    analyzeConversation: async (messages: Message[]): Promise<string> => {
        return "Análise simulada: O cliente está interessado no produto X.";
    }
  },

  reports: {
    generatePdf: async (html: string): Promise<void> => { window.print(); }
  },

  metadata: {
    getTags: async (): Promise<Tag[]> => { return []; },
    saveTags: async (tags: Tag[]): Promise<void> => {},
    getSectors: async (): Promise<Sector[]> => { return []; },
    saveSectors: async (sectors: Sector[]): Promise<void> => {}
  }
};