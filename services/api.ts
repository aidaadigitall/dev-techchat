import { Contact, Message, MessageType, Pipeline, Campaign, QuickReply, AIInsight, Task, Proposal, KanbanColumn, Tag, Sector, Company, Plan, User } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';

// Helper: Get Current User Company ID (Robust Version)
const getCompanyId = async () => {
  try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // 1. Try to fetch from profiles
      const { data, error } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
      
      if (data && data.company_id) return data.company_id;

      // 2. Fallback: User Metadata
      if (user.user_metadata?.company_id) return user.user_metadata.company_id;

      // 3. Last Resort: Check if there's ONLY ONE company in the DB (for single-tenant setups or dev)
      const { data: firstCompany } = await supabase.from('companies').select('id').limit(1).maybeSingle();
      if (firstCompany) return firstCompany.id;

      return null;
  } catch (e) {
      console.warn("Error resolving company_id:", e);
      return null;
  }
};

const getEnv = (key: string) => { 
    return ''; 
};
const generateUUID = () => crypto.randomUUID();
let aiClientInstance: GoogleGenAI | null = null;
const getAiClient = () => aiClientInstance;

// --- Adapters ---

const adaptContact = (data: any): Contact => ({
  id: data.id,
  name: data.name,
  avatar: data.avatar_url || '',
  phone: data.phone,
  email: data.email,
  tags: data.tags || [],
  company: data.custom_fields?.company,
  sector: data.custom_fields?.sector,
  status: data.status || 'open',
  lastMessage: data.custom_fields?.last_message_preview,
  lastMessageTime: data.last_message_at ? new Date(data.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : undefined,
  unreadCount: 0, 
  blocked: false,
  source: data.source,
  role: data.custom_fields?.role,
  city: data.custom_fields?.city,
  state: data.custom_fields?.state,
  cpfCnpj: data.custom_fields?.cpfCnpj,
  birthday: data.custom_fields?.birthday,
  strategicNotes: data.custom_fields?.strategicNotes
});

export const adaptMessage = (data: any): Message => ({
  id: data.id,
  content: data.content,
  senderId: data.sender_id,
  timestamp: new Date(data.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
  type: data.type || MessageType.TEXT,
  status: data.status || 'sent',
  mediaUrl: data.media_url,
  channel: 'whatsapp'
});

const adaptTask = (data: any): Task => ({
  id: data.id,
  title: data.title,
  priority: data.priority || 'p4',
  projectId: data.project_id || 'inbox',
  completed: data.completed || false,
  dueDate: data.due_date,
  description: data.description,
  assigneeId: data.assignee_id,
  tags: data.tags,
  subtasks: [] 
});

const adaptProposal = (data: any): Proposal => ({
  id: data.id,
  clientId: data.client_id,
  clientName: data.client_name || 'Cliente',
  title: data.title,
  value: data.value,
  status: data.status,
  sentDate: data.sent_date,
  validUntil: data.valid_until
});

export const api = {
  contacts: {
    list: async (): Promise<Contact[]> => {
      try {
          const { data, error } = await supabase.from('contacts').select('*').order('last_message_at', { ascending: false });
          if (error) throw error;
          return data.map(adaptContact);
      } catch (e) { return []; }
    },
    getById: async (id: string): Promise<Contact | undefined> => {
        try {
            const { data } = await supabase.from('contacts').select('*').eq('id', id).single();
            return data ? adaptContact(data) : undefined;
        } catch(e) { return undefined; }
    },
    create: async (contact: Partial<Contact>): Promise<Contact> => {
      const company_id = await getCompanyId();
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
            state: contact.state,
            birthday: contact.birthday,
            strategicNotes: contact.strategicNotes
        }
      };
      // Upsert logic
      const { data: existing } = await supabase.from('contacts').select('id').eq('phone', cleanPhone).maybeSingle();
      let result;
      if (existing) {
        result = await supabase.from('contacts').update(payload).eq('id', existing.id).select().single();
      } else {
        result = await supabase.from('contacts').insert(payload).select().single();
      }
      if (result.error) throw result.error; 
      return adaptContact(result.data);
    },
    update: async (id: string, updates: Partial<Contact>): Promise<Contact> => {
        const payload:any = {};
        if(updates.name) payload.name = updates.name;
        if(updates.tags) payload.tags = updates.tags;
        if(updates.status) payload.status = updates.status;
        if(updates.blocked !== undefined) payload.blocked = updates.blocked; 
        
        if (updates.company || updates.role || updates.city || updates.strategicNotes || updates.cpfCnpj || updates.birthday) {
             payload.custom_fields = {
                 company: updates.company,
                 role: updates.role,
                 city: updates.city,
                 state: updates.state,
                 cpfCnpj: updates.cpfCnpj,
                 birthday: updates.birthday,
                 strategicNotes: updates.strategicNotes
             };
        }
        
        const { data } = await supabase.from('contacts').update(payload).eq('id', id).select().single();
        return adaptContact(data);
    },
    delete: async (id: string) => { await supabase.from('contacts').delete().eq('id', id); }
  },
  chat: {
      getMessages: async (cid: string) => { 
          const { data } = await supabase.from('messages').select('*').eq('contact_id', cid).order('created_at');
          return (data || []).map(adaptMessage);
      },
      sendMessage: async (cid: string, content: string, type: MessageType = MessageType.TEXT) => {
          const company_id = await getCompanyId();
          const { data } = await supabase.from('messages').insert({
              company_id, contact_id: cid, content, type, sender_id: 'me', status: 'sent'
          }).select().single();
          await supabase.from('contacts').update({ last_message_at: new Date() }).eq('id', cid);
          return adaptMessage(data);
      },
      // Updated Quick Reply Methods
      getQuickReplies: async (): Promise<QuickReply[]> => {
          const { data } = await supabase.from('quick_replies').select('*');
          return (data || []).map((q: any) => ({ id: q.id, shortcut: q.shortcut, content: q.content }));
      },
      createQuickReply: async (shortcut: string, content: string): Promise<QuickReply> => {
          const company_id = await getCompanyId();
          const { data } = await supabase.from('quick_replies').insert({ company_id, shortcut, content }).select().single();
          return { id: data.id, shortcut: data.shortcut, content: data.content };
      }
  },
  tasks: {
      list: async () => { const {data} = await supabase.from('tasks').select('*'); return (data||[]).map(adaptTask); },
      create: async (t: any) => { 
          const cid = await getCompanyId(); 
          const payload = {
              company_id: cid, 
              title: t.title,
              description: t.description,
              due_date: t.dueDate,
              priority: t.priority,
              project_id: t.projectId,
              assignee_id: t.assigneeId,
              tags: t.tags,
              status: 'pending'
          };
          const { data } = await supabase.from('tasks').insert(payload).select().single(); 
          return adaptTask(data); 
      },
      update: async (id: string, u: any) => { 
          const payload: any = {};
          if(u.title) payload.title = u.title;
          if(u.completed !== undefined) payload.completed = u.completed;
          if(u.priority) payload.priority = u.priority;
          if(u.dueDate) payload.due_date = u.dueDate;
          
          await supabase.from('tasks').update(payload).eq('id', id); 
          return {id, ...u} as Task; 
      },
      delete: async (id: string) => { await supabase.from('tasks').delete().eq('id', id); }
  },
  crm: {
    getPipelines: async (): Promise<Pipeline[]> => {
      try {
          const { data: pipelines } = await supabase.from('pipelines').select('*').order('created_at');
          if (!pipelines || pipelines.length === 0) return [];
          const pipeline = pipelines[0];
          const { data: columns } = await supabase.from('kanban_columns').select('*').eq('pipeline_id', pipeline.id).order('order');
          if (!columns) return [];
          
          // Join with contacts to display names on cards
          const { data: cards } = await supabase
            .from('kanban_cards')
            .select('*, contacts(name)')
            .in('column_id', columns.map((c:any) => c.id));
            
          const assembledColumns: KanbanColumn[] = columns.map((col: any) => ({
            id: col.id,
            title: col.title,
            color: col.color || 'border-gray-200',
            cards: (cards || []).filter((card: any) => card.column_id === col.id).map((card: any) => ({
                 id: card.id,
                 title: card.title || 'Sem título',
                 value: card.value || 0,
                 contactId: card.contact_id,
                 contactName: card.contacts?.name || 'Desconhecido', 
                 priority: card.priority || 'medium',
                 tags: card.tags || []
              }))
          }));
          return [{ id: pipeline.id, name: pipeline.name, columns: assembledColumns }];
      } catch(e) { return []; }
    },
    createCard: async (columnId: string, cardData: any) => {
        try {
            const payload = {
                column_id: columnId,
                title: cardData.title,
                value: cardData.value, 
                contact_id: cardData.contactId || null, 
                priority: cardData.priority,
                tags: cardData.tags || []
            };

            const { data, error } = await supabase.from('kanban_cards').insert(payload).select().single();
            if (error) throw error;
            return data;
        } catch (e) { throw e; }
    },
    moveCard: async (cardId: string, s: string, d: string) => {
        await supabase.from('kanban_cards').update({ column_id: d }).eq('id', cardId);
        return true;
    },
    // New Column Management Methods
    createColumn: async (pipelineId: string, title: string, order: number, color: string) => {
        const { data } = await supabase.from('kanban_columns').insert({ pipeline_id: pipelineId, title, order, color }).select().single();
        return data;
    },
    updateColumn: async (id: string, updates: any) => {
        await supabase.from('kanban_columns').update(updates).eq('id', id);
    },
    deleteColumn: async (id: string) => {
        await supabase.from('kanban_columns').delete().eq('id', id);
    }
  },
  proposals: { 
      list: async() => [], 
      create: async(d: any) => d, 
      update: async(id: string, u: any) => u 
  },
  companies: { 
      list: async() => [] as Company[], 
      create: async(c: any) => c, 
      update: async(id: string, u: any) => u, 
      delete: async(id: string) => {} 
  },
  plans: { 
      list: async() => [] as Plan[], 
      save: async(p: any) => p 
  },
  users: { 
      updateProfile: async(d: any) => d 
  },
  campaigns: { 
      list: async() => [] as Campaign[], 
      create: async(d: any) => d 
  },
  ai: { 
      generateInsight: async(type: string, context: any): Promise<AIInsight[]> => [], 
      analyzeConversation: async(messages: Message[]): Promise<string> => "Análise de conversa indisponível no momento." 
  },
  reports: { 
      generatePdf: async() => {} 
  },
  metadata: { 
      getTags: async() => [] as Tag[], 
      saveTags: async() => {}, 
      getSectors: async() => [] as Sector[], 
      saveSectors: async() => {} 
  }
};