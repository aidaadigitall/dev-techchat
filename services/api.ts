import { Contact, Message, MessageType, Pipeline, Campaign, QuickReply, AIInsight, Task, Proposal, KanbanColumn, Tag, Sector, Company, Plan, User } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';

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

// --- UUID Helper (Essential for PostgreSQL compatibility) ---
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
  unreadCount: 0,
  lastMessage: data.custom_fields?.last_message_preview || '', 
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

export const adaptMessage = (data: any): Message => ({
  id: data.id,
  content: data.content,
  senderId: data.sender_id,
  timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  type: (data.type as MessageType) || MessageType.TEXT,
  status: data.status || 'sent',
  channel: 'whatsapp',
  mediaUrl: data.media_url,
  starred: false
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
  subtasks: [] 
});

const adaptProposal = (data: any): Proposal => ({
  id: data.id,
  clientId: data.contact_id,
  clientName: data.contacts?.name || 'Cliente', 
  title: data.title,
  value: data.value,
  status: data.status,
  sentDate: data.sent_date,
  validUntil: data.valid_until,
  pdfUrl: data.pdf_url
});

// Helper: Get Current User Company ID
const getCompanyId = async () => {
  try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Try to fetch from profile
      const { data, error } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      
      if (error || !data) {
          // Fallback to metadata if exists, otherwise return null (do NOT return invalid UUID string)
          return user.user_metadata?.company_id || null;
      }
      return data.company_id;
  } catch (e) {
      return null;
  }
};

// --- API Service (REAL MODE ONLY with Mock Fallback) ---

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
          console.warn("API Error (Contacts):", e);
          return []; // Return empty for graceful degradation
      }
    },
    getById: async (id: string): Promise<Contact | undefined> => {
      try {
          const { data, error } = await supabase.from('contacts').select('*').eq('id', id).single();
          if (error) throw error;
          return adaptContact(data);
      } catch (e) { return undefined; }
    },
    create: async (contact: Partial<Contact>): Promise<Contact> => {
      const company_id = await getCompanyId();
      
      // Ensure phone is clean only digits
      const cleanPhone = contact.phone ? contact.phone.replace(/\D/g, '') : '';
      
      const payload = {
        company_id, 
        name: contact.name,
        phone: cleanPhone,
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
      
      // Using UPSERT based on phone to prevent duplicates during import
      const { data, error } = await supabase
        .from('contacts')
        .upsert(payload, { onConflict: 'phone' })
        .select()
        .single();

      if (error) throw error; 
      return adaptContact(data);
    },
    update: async (id: string, updates: Partial<Contact>): Promise<Contact> => {
      try {
          const payload: any = {};
          if (updates.name) payload.name = updates.name;
          if (updates.phone) payload.phone = updates.phone;
          if (updates.email) payload.email = updates.email;
          if (updates.status) payload.status = updates.status;
          if (updates.tags) payload.tags = updates.tags;
          
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
      } catch(e) {
          return { id, ...updates } as Contact;
      }
    },
    delete: async (id: string): Promise<void> => {
      try { await supabase.from('contacts').delete().eq('id', id); } catch(e) {}
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
      } catch(e) { return []; }
    },
    sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT): Promise<Message> => {
      try {
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
          
          // Update last message timestamp on contact
          await supabase.from('contacts').update({ last_message_at: new Date() }).eq('id', contactId);
          
          return adaptMessage(data);
      } catch(e) {
          return { id: generateUUID(), content, type, senderId: 'me', timestamp: new Date().toLocaleTimeString(), status: 'sent' };
      }
    },
    getQuickReplies: async (): Promise<QuickReply[]> => {
        try {
            const { data } = await supabase.from('quick_replies').select('*');
            return (data || []).map((q: any) => ({ id: q.id, shortcut: q.shortcut, content: q.content }));
        } catch(e) { return []; }
    }
  },

  tasks: {
    list: async (): Promise<Task[]> => {
      try {
          const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
          if (error) return [];
          return data.map(adaptTask);
      } catch (e) { return []; }
    },
    create: async (task: Partial<Task>): Promise<Task> => {
      try {
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
      } catch (e) { return { ...task, id: generateUUID() } as Task; }
    },
    update: async (id: string, updates: Partial<Task>): Promise<Task> => {
      try {
          const payload: any = {};
          if (updates.title) payload.title = updates.title;
          if (updates.completed !== undefined) payload.status = updates.completed ? 'completed' : 'pending';
          if (updates.priority) payload.priority = updates.priority;
          
          const { data, error } = await supabase.from('tasks').update(payload).eq('id', id).select().single();
          if (error) throw error;
          return adaptTask(data);
      } catch (e) { return { id, ...updates } as Task; }
    },
    delete: async (id: string): Promise<void> => {
      try { await supabase.from('tasks').delete().eq('id', id); } catch(e) {}
    }
  },

  crm: {
    getPipelines: async (): Promise<Pipeline[]> => {
      try {
          // Fetch Pipelines
          const { data: pipelines, error: pipeError } = await supabase
            .from('pipelines')
            .select('*')
            .order('created_at');

          if (pipeError) throw pipeError;
          if (!pipelines || pipelines.length === 0) return [];

          const pipeline = pipelines[0];
          
          const { data: columns, error: colError } = await supabase
            .from('kanban_columns')
            .select('*')
            .eq('pipeline_id', pipeline.id)
            .order('order');

          if (colError) return [];

          // Fetch Cards for these columns
          const { data: cards, error: cardError } = await supabase
            .from('kanban_cards')
            .select('*, contacts(name)') // Join with contacts to get name
            .in('column_id', columns.map((c:any) => c.id));

          if (cardError) return [];

          // Assemble structure
          const assembledColumns: KanbanColumn[] = columns.map((col: any) => ({
            id: col.id,
            title: col.title,
            color: col.color || 'border-gray-200',
            cards: cards
              .filter((card: any) => card.column_id === col.id)
              .map((card: any) => ({
                 id: card.id,
                 title: card.title || 'Sem título',
                 value: card.value || 0,
                 contactId: card.contact_id,
                 contactName: card.contacts?.name || 'Desconhecido',
                 priority: card.priority || 'medium',
                 tags: card.tags || []
              }))
          }));

          return [{
            id: pipeline.id,
            name: pipeline.name,
            columns: assembledColumns
          }];
      } catch(e) { return []; }
    },
    createCard: async (columnId: string, cardData: any) => {
        try {
            const company_id = await getCompanyId();
            const { data, error } = await supabase.from('kanban_cards').insert({
                company_id,
                column_id: columnId,
                title: cardData.title,
                value: cardData.value,
                contact_id: cardData.contactId,
                priority: cardData.priority,
                tags: cardData.tags || []
            }).select().single();
            if (error) throw error;
            return data;
        } catch (e) {
            throw e;
        }
    },
    moveCard: async (cardId: string, sourceColId: string, destColId: string) => {
        try {
            const { error } = await supabase.from('kanban_cards').update({ column_id: destColId }).eq('id', cardId);
            if (error) throw error;
            return true;
        } catch(e) { return true; }
    }
  },

  proposals: {
    list: async (): Promise<Proposal[]> => {
        try {
            const { data, error } = await supabase
                .from('proposals')
                .select('*, contacts(name)');
            
            if (error) throw error;
            return data.map(adaptProposal);
        } catch (e) { return []; }
    },
    create: async (data: Partial<Proposal>): Promise<Proposal> => {
        try {
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
        } catch (e) { return { ...data, id: generateUUID() } as Proposal; }
    },
    update: async (id: string, updates: Partial<Proposal>): Promise<Proposal> => {
        try {
            const { data, error } = await supabase.from('proposals').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return adaptProposal(data);
        } catch (e) { return { id, ...updates } as Proposal; }
    }
  },

  companies: {
    list: async (): Promise<Company[]> => { 
        try {
            const { data, error } = await supabase.from('companies').select('*');
            if (error) throw error;
            return data.map((c:any) => ({
                ...c, 
                ownerName: c.owner_name || 'Admin',
                planId: c.plan_id,
                aiLimit: c.ai_limit,
                aiUsage: c.ai_usage,
                userCount: 1 
            }));
        } catch(e) { return []; }
    },
    create: async (company: Partial<Company>): Promise<Company> => {
        try {
            const { data, error } = await supabase.from('companies').insert({
                name: company.name,
                plan_id: company.planId,
                status: company.status
            }).select().single();
            if(error) throw error;
            return data as any;
        } catch(e) { return { ...company, id: generateUUID() } as Company; }
    },
    update: async (id: string, updates: Partial<Company>): Promise<Company> => {
        try {
            const payload:any = {};
            if(updates.aiLimit) payload.ai_limit = updates.aiLimit;
            if(updates.aiUsage !== undefined) payload.ai_usage = updates.aiUsage;
            
            const { data, error } = await supabase.from('companies').update(payload).eq('id', id).select().single();
            if(error) throw error;
            return data as any;
        } catch(e) { return { id, ...updates } as Company; }
    },
    delete: async (id: string): Promise<void> => {
        try { await supabase.from('companies').delete().eq('id', id); } catch(e) {}
    }
  },

  plans: {
    list: async (): Promise<Plan[]> => { 
        try {
            const { data } = await supabase.from('plans').select('*');
            return data || [];
        } catch(e) { return []; }
    },
    save: async (plan: Plan): Promise<Plan> => { return plan; }
  },

  users: {
    updateProfile: async (data: { name?: string, avatar?: string }) => { 
        try {
            const payload: any = {};
            if (data.name) payload.full_name = data.name;
            if (data.avatar) payload.avatar_url = data.avatar;
            
            await supabase.auth.updateUser({ data: payload });
            return {}; 
        } catch(e) { return {}; }
    }
  },

  campaigns: {
    list: async (): Promise<Campaign[]> => { return []; },
    create: async (data: any): Promise<Campaign> => { 
        return { id: generateUUID(), name: data.name, status: 'scheduled', createdAt: new Date().toISOString(), connectionId: '', stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 } }; 
    }
  },
  
  ai: {
    generateInsight: async (context: 'chat' | 'kanban', data: any): Promise<AIInsight[]> => {
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