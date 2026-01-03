
import { Contact, Message, MessageType, Pipeline, Campaign, QuickReply, AIInsight, Task, Proposal, KanbanColumn, Tag, Sector, Company, Plan, User } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';
import { whatsappService } from './whatsapp'; // Integrated WhatsApp Service

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

const adaptCompany = (data: any): Company => ({
    id: data.id,
    name: data.name,
    ownerName: data.owner_name || '',
    email: data.email || '',
    phone: data.phone || '',
    planId: data.plan_id || 'basic',
    status: data.status || 'active',
    subscriptionEnd: data.subscription_end,
    userCount: 0, // Placeholder, would require a join or separate count
    aiUsage: data.ai_usage || 0,
    aiLimit: data.ai_limit || 1000,
    useCustomKey: data.use_custom_key || false,
    features: data.features || { crm: true, campaigns: false, automations: false, reports: true }
});

const adaptPlan = (data: any): Plan => ({
    id: data.id,
    name: data.name,
    price: data.price,
    // Ensure nested objects exist to prevent UI crashes
    limits: data.limits || { users: 1, connections: 1, messages: 1000 },
    features: data.features || { crm: true, campaigns: false, api: false }
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
          
          // 1. Fetch Contact Phone to send real message
          const { data: contact } = await supabase.from('contacts').select('phone').eq('id', cid).single();
          
          if (!contact || !contact.phone) {
              throw new Error("Contato inválido ou sem telefone.");
          }

          // 2. Send via WhatsApp Service
          try {
              await whatsappService.sendMessage(contact.phone, content);
          } catch (e: any) {
              console.error("WhatsApp Send Error:", e);
              // We throw so the UI knows it failed, preventing optimistic update if strict
              throw new Error("Falha ao enviar para o WhatsApp: " + (e.message || "Erro desconhecido"));
          }

          // 3. Save to Database (History)
          const { data } = await supabase.from('messages').insert({
              company_id, contact_id: cid, content, type, sender_id: 'me', status: 'sent'
          }).select().single();
          
          await supabase.from('contacts').update({ last_message_at: new Date() }).eq('id', cid);
          return adaptMessage(data);
      },
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
      list: async(): Promise<Company[]> => {
          const { data } = await supabase.from('companies').select('*');
          return (data || []).map(adaptCompany);
      },
      create: async(c: any): Promise<Company> => {
          const payload: any = {
              name: c.name,
              owner_name: c.ownerName,
              email: c.email,
              phone: c.phone,
              plan_id: c.planId,
              status: c.status,
              subscription_end: c.subscriptionEnd || null,
              ai_limit: c.aiLimit,
              ai_usage: c.aiUsage,
              use_custom_key: c.useCustomKey
          };
          
          // Try including features first
          const payloadFull = { ...payload, features: c.features };

          try {
              const { data, error } = await supabase.from('companies').insert(payloadFull).select().single();
              if (error) throw error;
              return adaptCompany(data);
          } catch (e: any) {
              // Retry without features if schema mismatch (fallback)
              if (e.message?.includes('features') || e.code === 'PGRST204' || e.message?.includes('column')) {
                  console.warn("Features column missing, saving basic company data.");
                  const { data, error } = await supabase.from('companies').insert(payload).select().single();
                  if (error) throw error;
                  return adaptCompany(data);
              }
              throw e;
          }
      },
      update: async(id: string, u: any): Promise<Company> => {
          const payload: any = {};
          if (u.name !== undefined) payload.name = u.name;
          if (u.ownerName !== undefined) payload.owner_name = u.ownerName;
          if (u.email !== undefined) payload.email = u.email;
          if (u.phone !== undefined) payload.phone = u.phone;
          if (u.planId !== undefined) payload.plan_id = u.planId;
          if (u.status !== undefined) payload.status = u.status;
          if (u.subscriptionEnd !== undefined) payload.subscription_end = u.subscriptionEnd || null;
          if (u.aiLimit !== undefined) payload.ai_limit = u.aiLimit;
          if (u.aiUsage !== undefined) payload.ai_usage = u.aiUsage;
          if (u.useCustomKey !== undefined) payload.use_custom_key = u.useCustomKey;
          
          // Try including features
          const payloadFull = { ...payload };
          if (u.features) payloadFull.features = u.features;

          try {
              const { data, error } = await supabase.from('companies').update(payloadFull).eq('id', id).select().single();
              if (error) throw error;
              return adaptCompany(data);
          } catch (e: any) {
               console.warn("Update com features falhou, tentando fallback...", e.message);
               
               // Retry without features if schema mismatch (fallback)
               // Also handles cases where column features is missing
               if (Object.keys(payload).length > 0) {
                   const { data, error } = await supabase.from('companies').update(payload).eq('id', id).select().single();
                   if (error) throw error;
                   return adaptCompany(data);
               } else {
                   // Se só mudou features e o banco não suporta, retornamos o atual
                   const { data } = await supabase.from('companies').select('*').eq('id', id).single();
                   return adaptCompany(data);
               }
          }
      },
      delete: async(id: string) => {
          // Manual Cascade Delete: Delete related records first to avoid Foreign Key Constraint errors
          console.log(`Starting cascade delete for company ${id}...`);
          
          try {
              // 1. Delete Profiles (Users) linked to company
              await supabase.from('profiles').delete().eq('company_id', id);
              
              // 2. Delete Messages (Refer to Contacts)
              await supabase.from('messages').delete().eq('company_id', id);
              
              // 3. Delete Tasks
              await supabase.from('tasks').delete().eq('company_id', id);
              
              // 4. Delete Quick Replies
              await supabase.from('quick_replies').delete().eq('company_id', id);

              // 5. Delete CRM Data (Pipelines -> Columns -> Cards)
              const { data: pipelines } = await supabase.from('pipelines').select('id').eq('company_id', id);
              if (pipelines && pipelines.length > 0) {
                  const pipelineIds = pipelines.map(p => p.id);
                  const { data: columns } = await supabase.from('kanban_columns').select('id').in('pipeline_id', pipelineIds);
                  if (columns && columns.length > 0) {
                      const columnIds = columns.map(c => c.id);
                      await supabase.from('kanban_cards').delete().in('column_id', columnIds);
                      await supabase.from('kanban_columns').delete().in('id', columnIds);
                  }
                  await supabase.from('pipelines').delete().in('id', pipelineIds);
              }

              // 6. Delete Proposals & Campaigns
              await supabase.from('proposals').delete().eq('company_id', id);
              await supabase.from('campaigns').delete().eq('company_id', id);

              // 7. Delete Contacts (Must be after messages/cards/etc)
              await supabase.from('contacts').delete().eq('company_id', id);

              // 8. Finally Delete Company
              const { error } = await supabase.from('companies').delete().eq('id', id);
              
              if (error) {
                  console.error("Error deleting company row:", error);
                  throw error;
              }
          } catch (e) {
              console.error("Cascade delete failed:", e);
              throw e;
          }
      }
  },
  plans: { 
      list: async(): Promise<Plan[]> => {
          const { data } = await supabase.from('plans').select('*');
          return (data || []).map(adaptPlan);
      },
      save: async(p: any): Promise<Plan> => {
          const payload = {
              name: p.name,
              price: p.price,
              limits: p.limits,
              features: p.features
          };
          
          let result;
          if (p.id && !p.id.startsWith('plan_')) {
              // Update existing real plan
              result = await supabase.from('plans').update(payload).eq('id', p.id).select().single();
          } else {
              // Create new
              result = await supabase.from('plans').insert(payload).select().single();
          }
          
          if (result.error) throw result.error;
          return adaptPlan(result.data);
      }
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
