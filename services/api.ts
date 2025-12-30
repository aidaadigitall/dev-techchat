import { Contact, Message, MessageType, Pipeline, Campaign, QuickReply, AIInsight, Task, Proposal, KanbanColumn, Tag, Sector, Company, Plan, User } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';
import { MOCK_COMPANIES, MOCK_PLANS, MOCK_CONTACTS, MOCK_MESSAGES, MOCK_PROPOSALS } from '../constants';

// --- Environment Helper ---
const getEnv = (key: string) => {
  let value = '';
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
       // @ts-ignore
       value = import.meta.env[key] || import.meta.env[`VITE_${key}`];
    }
  } catch (e) {}
  if (!value && typeof process !== 'undefined' && process.env) {
    value = process.env[key] || process.env[`REACT_APP_${key}`] || process.env[`NEXT_PUBLIC_${key}`];
  }
  return value || '';
};

// --- AI Client ---
let aiClientInstance: GoogleGenAI | null = null;
const getAiClient = () => {
  if (!aiClientInstance) {
    const apiKey = getEnv('API_KEY');
    aiClientInstance = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  }
  return aiClientInstance;
};

// --- Adapters (Convert DB snake_case to Frontend camelCase) ---

const adaptContact = (data: any): Contact => ({
  id: data.id,
  name: data.name,
  phone: data.phone,
  email: data.email,
  avatar: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
  tags: data.tags || [],
  company: data.custom_fields?.company,
  status: data.status || 'open',
  unreadCount: 0, // Real-time count would be a separate query or counter table
  lastMessage: '', // Ideally fetched via join
  lastMessageTime: data.last_message_at ? new Date(data.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
  pipelineValue: 0,
  cpfCnpj: data.custom_fields?.cpfCnpj,
  birthday: data.custom_fields?.birthday,
  source: data.source,
  role: data.custom_fields?.role,
  strategicNotes: data.custom_fields?.strategicNotes,
  city: data.custom_fields?.city,
  state: data.custom_fields?.state,
  customFields: data.custom_fields
});

const adaptMessage = (data: any): Message => ({
  id: data.id,
  content: data.content,
  senderId: data.sender_id,
  timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  type: (data.type as MessageType) || MessageType.TEXT,
  status: data.status || 'sent',
  channel: 'whatsapp',
  mediaUrl: data.media_url,
  starred: false // Could be added to DB
});

const adaptTask = (data: any): Task => ({
  id: data.id,
  title: data.title,
  description: data.description,
  dueDate: data.due_date,
  priority: data.priority,
  projectId: data.project_id || 'inbox',
  completed: data.status === 'completed',
  assigneeId: data.assignee_id,
  tags: data.tags || [],
  subtasks: [] // Fetched separately or via recursive query
});

const adaptProposal = (data: any): Proposal => ({
  id: data.id,
  clientId: data.contact_id,
  clientName: data.contacts?.name || 'Cliente', // Requires join
  title: data.title,
  value: data.value,
  status: data.status,
  sentDate: data.sent_date,
  validUntil: data.valid_until,
  pdfUrl: data.pdf_url
});

// Helper: Get Current User Company (for RLS inserts if not handled by Trigger/Default)
const getCompanyId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
  return data?.company_id;
};

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
        console.warn("Using Mock Contacts (DB Connection Failed)");
        return MOCK_CONTACTS;
      }
    },
    getById: async (id: string): Promise<Contact | undefined> => {
      const { data } = await supabase.from('contacts').select('*').eq('id', id).single();
      return data ? adaptContact(data) : undefined;
    },
    create: async (contact: Partial<Contact>): Promise<Contact> => {
      const company_id = await getCompanyId();
      const payload = {
        company_id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        tags: contact.tags,
        source: contact.source,
        status: contact.status || 'open',
        custom_fields: {
          company: contact.company,
          cpfCnpj: contact.cpfCnpj,
          role: contact.role,
          city: contact.city,
          state: contact.state
        }
      };
      
      const { data, error } = await supabase.from('contacts').insert(payload).select().single();
      if (error) throw error;
      return adaptContact(data);
    },
    update: async (id: string, updates: Partial<Contact>): Promise<Contact> => {
      const payload: any = {};
      if (updates.name) payload.name = updates.name;
      if (updates.phone) payload.phone = updates.phone;
      if (updates.email) payload.email = updates.email;
      if (updates.status) payload.status = updates.status;
      if (updates.tags) payload.tags = updates.tags;
      
      // Merge custom fields logic would go here
      // Simple overwrite for brevity
      if (updates.company || updates.cpfCnpj) {
         payload.custom_fields = {
            company: updates.company,
            cpfCnpj: updates.cpfCnpj,
            role: updates.role
         };
      }

      const { data, error } = await supabase.from('contacts').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return adaptContact(data);
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    }
  },

  chat: {
    getMessages: async (contactId: string): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });
      
      if (error) return MOCK_MESSAGES; // Fallback
      return data.map(adaptMessage);
    },
    sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT): Promise<Message> => {
      const company_id = await getCompanyId();
      const payload = {
        company_id,
        contact_id: contactId,
        content,
        type,
        sender_id: 'me',
        status: 'sent'
      };
      const { data, error } = await supabase.from('messages').insert(payload).select().single();
      if (error) throw error;
      
      // Update contact last_message_at
      await supabase.from('contacts').update({ last_message_at: new Date() }).eq('id', contactId);
      
      return adaptMessage(data);
    },
    getQuickReplies: async (): Promise<QuickReply[]> => {
        // Implementation: Fetch from a 'quick_replies' table (not in schema yet, returning mock)
        return [
            { id: '1', shortcut: '/oi', content: 'Olá! Tudo bem? Como posso ajudar você hoje?' },
            { id: '2', shortcut: '/pix', content: 'Nossa chave PIX é o CNPJ: 12.345.678/0001-90.' }
        ];
    }
  },

  tasks: {
    list: async (): Promise<Task[]> => {
      const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
      if (error) return [];
      
      // Handle subtasks client-side for simplicity in this demo
      const tasks = data.map(adaptTask);
      const rootTasks = tasks.filter(t => !data.find((d:any) => d.id === t.id)?.parent_id);
      // Logic to nest subtasks would be added here
      return rootTasks;
    },
    create: async (task: Partial<Task>): Promise<Task> => {
      const company_id = await getCompanyId();
      const payload = {
        company_id,
        title: task.title,
        description: task.description,
        due_date: task.dueDate,
        priority: task.priority,
        project_id: task.projectId,
        assignee_id: task.assigneeId,
        status: 'pending'
      };
      const { data, error } = await supabase.from('tasks').insert(payload).select().single();
      if (error) throw error;
      return adaptTask(data);
    },
    update: async (id: string, updates: Partial<Task>): Promise<Task> => {
      const payload: any = {};
      if (updates.title) payload.title = updates.title;
      if (updates.completed !== undefined) payload.status = updates.completed ? 'completed' : 'pending';
      if (updates.priority) payload.priority = updates.priority;
      
      const { data, error } = await supabase.from('tasks').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return adaptTask(data);
    },
    delete: async (id: string): Promise<void> => {
      await supabase.from('tasks').delete().eq('id', id);
    }
  },

  crm: {
    getPipelines: async (): Promise<Pipeline[]> => {
      // 1. Get Pipelines
      const { data: pipelinesData, error } = await supabase.from('pipelines').select('*');
      if (error || !pipelinesData.length) return []; // Return mock if fail

      // 2. Get Columns & Cards (This is N+1, better to use Supabase join select `*, kanban_columns(*)`)
      // For this implementation, we assume a joined query structure or client-side assembly
      // Simplified mock return if DB empty to avoid breaking UI during dev
      return [{
          id: '1', name: 'Vendas Padrão',
          columns: [
              { id: 'c1', title: 'Novo Lead', color: 'border-blue-500', cards: [] },
              { id: 'c2', title: 'Negociação', color: 'border-yellow-500', cards: [] },
              { id: 'c3', title: 'Fechado', color: 'border-green-500', cards: [] }
          ]
      }];
    },
    moveCard: async (cardId: string, sourceColId: string, destColId: string) => {
        await supabase.from('kanban_cards').update({ column_id: destColId }).eq('id', cardId);
        return true;
    }
  },

  proposals: {
    list: async (): Promise<Proposal[]> => {
        const { data, error } = await supabase
            .from('proposals')
            .select('*, contacts(name)');
        
        if (error) return MOCK_PROPOSALS;
        return data.map(adaptProposal);
    },
    create: async (data: Partial<Proposal>): Promise<Proposal> => {
        const company_id = await getCompanyId();
        const payload = {
            company_id,
            contact_id: data.clientId,
            title: data.title,
            value: data.value,
            status: 'pending'
        };
        const { data: res, error } = await supabase.from('proposals').insert(payload).select().single();
        if (error) throw error;
        return adaptProposal(res);
    },
    update: async (id: string, updates: Partial<Proposal>): Promise<Proposal> => {
        const { data, error } = await supabase.from('proposals').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return adaptProposal(data);
    }
  },

  companies: {
    list: async (): Promise<Company[]> => { 
        // Only Super Admin should call this
        const { data } = await supabase.from('companies').select('*');
        return data ? data.map((c:any) => ({
            ...c, 
            ownerName: 'Admin', // Would need join with profiles
            planId: c.plan_id,
            aiLimit: c.ai_limit,
            aiUsage: c.ai_usage,
            userCount: 1 // Count query needed
        })) : MOCK_COMPANIES;
    },
    create: async (company: Partial<Company>): Promise<Company> => {
        const { data, error } = await supabase.from('companies').insert({
            name: company.name,
            plan_id: company.planId
        }).select().single();
        if(error) throw error;
        return data as any;
    },
    update: async (id: string, updates: Partial<Company>): Promise<Company> => {
        const payload:any = {};
        if(updates.aiLimit) payload.ai_limit = updates.aiLimit;
        if(updates.aiUsage !== undefined) payload.ai_usage = updates.aiUsage;
        
        const { data, error } = await supabase.from('companies').update(payload).eq('id', id).select().single();
        if(error) throw error;
        return data as any;
    },
    delete: async (id: string): Promise<void> => {
        await supabase.from('companies').delete().eq('id', id);
    }
  },

  plans: {
    list: async (): Promise<Plan[]> => { return MOCK_PLANS; }, // Usually static or from DB
    save: async (plan: Plan): Promise<Plan> => { return plan; }
  },

  users: {
    updateProfile: async (data: { name?: string }) => { 
        const { error } = await supabase.auth.updateUser({ data: { full_name: data.name }});
        if (error) throw error;
        return {}; 
    }
  },

  campaigns: {
    list: async (): Promise<Campaign[]> => { return []; },
    create: async (data: any): Promise<Campaign> => { 
        return { id: '123', name: data.name, status: 'scheduled', createdAt: new Date().toISOString(), connectionId: '', stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 } }; 
    }
  },
  
  ai: {
    generateInsight: async (context: 'chat' | 'kanban', data: any): Promise<AIInsight[]> => {
      // Here we would ideally call a Supabase Edge Function to keep API Key secure
      // For now, we simulate the structure
      return [{ type: 'suggestion', content: 'Cliente com alto potencial de compra baseada no histórico.', confidence: 0.9 }];
    },
    analyzeConversation: async (messages: Message[]): Promise<string> => {
        return "Análise IA: Cliente demonstra interesse em preços e prazos. Sentimento positivo.";
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
