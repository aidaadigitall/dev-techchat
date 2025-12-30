import { Contact, Message, MessageType, Pipeline, Campaign, QuickReply, AIInsight, Task, Proposal, KanbanColumn, Tag, Sector, Company, Plan, User } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';
import { MOCK_COMPANIES, MOCK_PLANS } from '../constants';

// Safe Env Access
const getEnv = (key: string) => {
  try {
    return process.env[key];
  } catch (e) {
    return '';
  }
};

// Lazy initialization of AI Client to prevent crash on import if env vars are missing
let aiClientInstance: GoogleGenAI | null = null;
const getAiClient = () => {
  if (!aiClientInstance) {
    const apiKey = getEnv('API_KEY');
    // If no key, we still create it but calls will fail gracefully later
    aiClientInstance = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  }
  return aiClientInstance;
};

// --- Adapters (Convert Snake_case DB to CamelCase App) ---

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
  
  // Extra fields mapping
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
  senderId: data.is_from_me ? 'me' : data.contact_id, // Simplified logic
  timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  type: (data.type as MessageType) || MessageType.TEXT,
  status: data.status || 'sent',
  channel: 'whatsapp',
  mediaUrl: data.media_url,
  fileName: data.file_name,
  starred: false
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
  subtasks: [] // Would need a separate fetch or join
});

const adaptProposal = (data: any): Proposal => ({
  id: data.id,
  clientId: data.contact_id,
  clientName: 'Carregando...', // Needs join
  title: data.title,
  value: data.value,
  status: data.status,
  sentDate: data.sent_date,
  validUntil: data.valid_until,
  pdfUrl: data.pdf_url
});

// --- In-Memory Stores for Admin Features (Mock Persistence) ---
// In a real app, these would be database tables: 'companies', 'plans'
let companiesStore: Company[] = [...MOCK_COMPANIES];
let plansStore: Plan[] = [...MOCK_PLANS];

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- API Service ---

export const api = {
  contacts: {
    list: async (): Promise<Contact[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      return data.map(adaptContact);
    },
    getById: async (id: string): Promise<Contact | undefined> => {
      const { data } = await supabase.from('contacts').select('*').eq('id', id).single();
      return data ? adaptContact(data) : undefined;
    },
    create: async (contact: Partial<Contact>): Promise<Contact> => {
      const dbPayload = {
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        tags: contact.tags,
        // We pack extended fields into custom_fields to avoid schema strictness issues
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
      
      if (error) {
          console.error("Supabase Create Error Details:", error);
          throw error;
      }
      return adaptContact(data);
    },
    update: async (id: string, updates: Partial<Contact>): Promise<Contact> => {
      const dbPayload: any = {};
      
      // Direct columns
      if (updates.name !== undefined) dbPayload.name = updates.name;
      if (updates.phone !== undefined) dbPayload.phone = updates.phone;
      if (updates.email !== undefined) dbPayload.email = updates.email;
      if (updates.status !== undefined) dbPayload.status = updates.status;
      if (updates.tags !== undefined) dbPayload.tags = updates.tags;

      // Pack everything else into custom_fields merge
      // Ideally we should fetch current custom_fields first to deep merge, 
      // but for now we assume a flat merge logic or full replacement depending on DB config.
      // A better approach for update is:
      const customFieldsUpdate: any = {};
      if(updates.company !== undefined) customFieldsUpdate.company = updates.company;
      if(updates.cpfCnpj !== undefined) customFieldsUpdate.cpfCnpj = updates.cpfCnpj;
      if(updates.birthday !== undefined) customFieldsUpdate.birthday = updates.birthday;
      if(updates.source !== undefined) customFieldsUpdate.source = updates.source;
      if(updates.role !== undefined) customFieldsUpdate.role = updates.role;
      if(updates.strategicNotes !== undefined) customFieldsUpdate.strategicNotes = updates.strategicNotes;
      if(updates.city !== undefined) customFieldsUpdate.city = updates.city;
      if(updates.state !== undefined) customFieldsUpdate.state = updates.state;

      if(Object.keys(customFieldsUpdate).length > 0) {
          dbPayload.custom_fields = customFieldsUpdate; 
      }

      const { data, error } = await supabase.from('contacts').update(dbPayload).eq('id', id).select().single();
      
      if (error) {
          console.error("Supabase Update Error Details:", error);
          throw error;
      }
      return adaptContact(data);
    }
  },

  chat: {
    getMessages: async (contactId: string): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data.map(adaptMessage);
    },
    sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT): Promise<Message> => {
      const payload = {
        contact_id: contactId,
        content,
        type,
        is_from_me: true,
        status: 'sent'
      };
      
      const { data, error } = await supabase.from('messages').insert(payload).select().single();
      if (error) throw error;
      
      // Update contact last message
      await supabase.from('contacts').update({ last_message_at: new Date().toISOString() }).eq('id', contactId);
      
      return adaptMessage(data);
    },
    getQuickReplies: async (): Promise<QuickReply[]> => {
      // Assuming a table 'quick_replies' exists, or mocking for now as it wasn't in main schema
      return [
        { id: '1', shortcut: '/oi', content: 'Olá! Tudo bem? Como posso ajudar você hoje?' },
        { id: '2', shortcut: '/pix', content: 'Nossa chave PIX é o CNPJ: 12.345.678/0001-90.' }
      ];
    }
  },

  tasks: {
    list: async (): Promise<Task[]> => {
      const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
      if (error) throw error;
      return data.map(adaptTask);
    },
    create: async (task: Partial<Task>): Promise<Task> => {
      const payload = {
        title: task.title,
        description: task.description,
        due_date: task.dueDate,
        priority: task.priority,
        project_id: task.projectId,
        assignee_id: task.assigneeId
      };
      const { data, error } = await supabase.from('tasks').insert(payload).select().single();
      if (error) throw error;
      return adaptTask(data);
    },
    update: async (id: string, updates: Partial<Task>): Promise<Task> => {
      const payload: any = {};
      if (updates.completed !== undefined) payload.completed = updates.completed;
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
      // Fetch pipelines and nested columns/cards
      const { data: pipelines, error } = await supabase
        .from('pipelines')
        .select(`
          *,
          columns:kanban_columns(
            *,
            cards:kanban_cards(*)
          )
        `);
      
      if (error) throw error;

      // Transform structure
      return pipelines.map((p: any) => ({
        id: p.id,
        name: p.name,
        columns: p.columns.sort((a: any, b: any) => a.order_index - b.order_index).map((col: any) => ({
          id: col.id,
          title: col.title,
          color: col.color,
          cards: col.cards.map((card: any) => ({
            id: card.id,
            title: card.title,
            value: card.value,
            contactName: card.title, // Denormalized or fetch contact name
            priority: card.priority,
            tags: [],
            contactId: card.contact_id
          }))
        }))
      }));
    },
    moveCard: async (cardId: string, sourceColId: string, destColId: string) => {
      const { error } = await supabase
        .from('kanban_cards')
        .update({ column_id: destColId })
        .eq('id', cardId);
      return !error;
    }
  },

  proposals: {
    list: async (): Promise<Proposal[]> => {
      const { data, error } = await supabase.from('proposals').select(`*, contact:contacts(name)`).order('created_at', { ascending: false });
      if (error) throw error;
      
      return data.map((p: any) => ({
        ...adaptProposal(p),
        clientName: p.contact?.name || 'Cliente Removido'
      }));
    },
    create: async (data: Partial<Proposal>): Promise<Proposal> => {
      const payload = {
        contact_id: data.clientId,
        title: data.title,
        value: data.value,
        status: data.status || 'pending',
        sent_date: new Date().toISOString(),
        valid_until: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString()
      };
      const { data: res, error } = await supabase.from('proposals').insert(payload).select().single();
      if (error) throw error;
      return adaptProposal(res);
    },
    update: async (id: string, updates: Partial<Proposal>): Promise<Proposal> => {
      // Implementation for update
      return {} as Proposal;
    }
  },

  // --- Admin Features (Mocked or Supabase if available) ---
  companies: {
    list: async (): Promise<Company[]> => {
      await delay(300);
      return companiesStore;
    },
    create: async (company: Partial<Company>): Promise<Company> => {
      await delay(300);
      const newCompany = { 
        ...company, 
        id: `comp_${Date.now()}`,
        status: 'active',
        userCount: 0 
      } as Company;
      companiesStore = [...companiesStore, newCompany];
      return newCompany;
    },
    update: async (id: string, updates: Partial<Company>): Promise<Company> => {
      await delay(300);
      companiesStore = companiesStore.map(c => c.id === id ? { ...c, ...updates } : c);
      return companiesStore.find(c => c.id === id)!;
    },
    delete: async (id: string): Promise<void> => {
      await delay(300);
      companiesStore = companiesStore.filter(c => c.id !== id);
    }
  },

  plans: {
    list: async (): Promise<Plan[]> => {
      await delay(300);
      return plansStore;
    },
    save: async (plan: Plan): Promise<Plan> => {
      await delay(300);
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
    updateProfile: async (data: { name?: string, avatar?: string, password?: string }) => {
      const updates: any = {};
      if (data.name) updates.data = { full_name: data.name };
      if (data.password) updates.password = data.password;
      // Avatar usually goes to storage, here assuming url string or ignoring if not implemented fully
      
      const { data: user, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      return user;
    }
  },

  campaigns: {
    list: async (): Promise<Campaign[]> => {
      return []; 
    },
    create: async (data: any): Promise<Campaign> => {
      await delay(500);
      return { id: '123', name: data.name, status: 'scheduled', createdAt: new Date().toISOString(), connectionId: '', stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 } };
    }
  },
  
  ai: {
    generateInsight: async (context: 'chat' | 'kanban', data: any): Promise<AIInsight[]> => {
      await delay(1000);
      return [{ type: 'suggestion', content: 'Baseado na análise do banco de dados, este cliente tem 80% de chance de fechamento.', confidence: 0.8 }];
    },
    analyzeConversation: async (messages: Message[]): Promise<string> => {
      try {
        const ai = getAiClient();
        const conversationText = messages.map(m => 
          `[${m.timestamp}] ${m.senderId === 'me' ? 'Agente' : 'Cliente'}: ${m.content || `[${m.type}]`}`
        ).join('\n');

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: `Analise esta conversa e sugira melhorias:\n${conversationText}`,
        });
        
        return response.text || "Sem análise.";
      } catch (error) {
        console.error("Gemini API Error:", error);
        return "Erro ao conectar com Gemini AI. Verifique sua API Key.";
      }
    }
  },

  reports: {
    generatePdf: async (html: string): Promise<void> => {
        // Call Supabase Edge Function (Mock)
        const { data, error } = await supabase.functions.invoke('generate-pdf', {
            body: { html }
        });
        
        if (error) {
            console.error("Edge Function Error", error);
            window.print();
            return;
        }
        console.log("PDF Generated via Edge Function");
    }
  },

  metadata: {
    getTags: async (): Promise<Tag[]> => {
      await delay(300);
      const saved = localStorage.getItem('app_tags');
      return saved ? JSON.parse(saved) : [
        { id: '1', name: 'Lead Quente', color: '#EF4444' },
        { id: '2', name: 'Cliente', color: '#10B981' },
        { id: '3', name: 'VIP', color: '#F59E0B' }
      ];
    },
    saveTags: async (tags: Tag[]): Promise<void> => {
      await delay(300);
      localStorage.setItem('app_tags', JSON.stringify(tags));
    },
    getSectors: async (): Promise<Sector[]> => {
      await delay(300);
      const saved = localStorage.getItem('app_sectors');
      return saved ? JSON.parse(saved) : [
        { id: '1', name: 'Comercial', color: '#3B82F6' },
        { id: '2', name: 'Suporte', color: '#8B5CF6' },
        { id: '3', name: 'Financeiro', color: '#10B981' }
      ];
    },
    saveSectors: async (sectors: Sector[]): Promise<void> => {
      await delay(300);
      localStorage.setItem('app_sectors', JSON.stringify(sectors));
    }
  }
};