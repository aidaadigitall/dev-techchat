
import { Contact, Message, MessageType, Pipeline, Campaign, QuickReply, AIInsight, Task, Proposal, KanbanColumn, Tag, Sector, Company, Plan, User, AIAgent } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';
import { whatsappService } from './whatsapp';

// URL do Backend Node.js (Fastify)
const API_BASE_URL = 'https://apitechchat.escsistemas.com/api/whatsapp';

// Helper: Get Current User Company ID
const getCompanyId = async () => {
  try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
      if (data && data.company_id) return data.company_id;
      
      if (user.user_metadata?.company_id) return user.user_metadata.company_id;
      return null;
  } catch (e) { return null; }
};

// --- Adapters (Mantidos iguais ao original) ---
const adaptMessage = (data: any): Message => ({
  id: data.id,
  content: data.content,
  senderId: data.sender_id,
  timestamp: new Date(data.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
  type: data.type || MessageType.TEXT,
  status: data.status || 'sent',
  mediaUrl: data.media_url,
  channel: 'whatsapp',
  location: data.location_data
});

export const api = {
  contacts: {
      list: async (): Promise<Contact[]> => {
          const { data } = await supabase.from('contacts').select('*');
          return (data || []).map(d => ({
              id: d.id, name: d.name, phone: d.phone, email: d.email, tags: d.tags || [],
              avatar: d.avatar_url || '', status: d.status, lastMessage: d.custom_fields?.last_message_preview,
              company: d.company_name, role: d.role, strategicNotes: d.strategic_notes,
              source: d.source, cpfCnpj: d.cpf_cnpj, birthday: d.birthday,
              city: d.city, state: d.state
          } as Contact));
      },
      create: async (c: any) => { const {data} = await supabase.from('contacts').insert(c).select().single(); return data; },
      update: async (id: string, u: any) => { 
          const {data} = await supabase.from('contacts').update(u).eq('id', id).select().single(); 
          return data as Contact; 
      },
      delete: async (id: string) => { await supabase.from('contacts').delete().eq('id', id); }
  },

  whatsapp: {
      list: async () => {
          // Tenta buscar via API Gateway primeiro para status realtime do container
          try {
              const { data: { session } } = await supabase.auth.getSession();
              // Timeout curto para não travar a UI se o backend estiver dormindo/offline
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos timeout

              const response = await fetch(`${API_BASE_URL}/instances`, {
                  method: 'GET', // Assumindo que criamos um GET route, senão fallback
                  headers: { 
                      'Authorization': `Bearer ${session?.access_token}` 
                  },
                  signal: controller.signal
              });
              clearTimeout(timeoutId);

              if (response.ok) {
                  return await response.json();
              }
              throw new Error("API Response not OK");
          } catch (error) {
              console.warn("Backend API offline ou inalcançável. Usando fallback Supabase direto.", error);
              // Fallback: Busca direto do banco de dados (Mais robusto para UI)
              const { data, error: dbError } = await supabase.from('whatsapp_connections').select('*').order('created_at');
              if (dbError) throw dbError;
              return data;
          }
      },
      create: async (name: string) => {
          try {
              const { data: { session } } = await supabase.auth.getSession();
              const response = await fetch(`${API_BASE_URL}/instances`, {
                  method: 'POST',
                  headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session?.access_token}` 
                  },
                  body: JSON.stringify({ name, engine: 'whatsmeow' }) 
              });
              if (!response.ok) {
                  const err = await response.json();
                  throw new Error(err.message || 'Falha na API');
              }
              return await response.json();
          } catch (e) {
              console.error(e);
              throw new Error('Servidor de API Offline. Verifique se o container Docker está rodando.');
          }
      },
      connect: async (dbId: string, instanceName: string) => { 
          try {
              const { data: { session } } = await supabase.auth.getSession();
              const response = await fetch(`${API_BASE_URL}/instances/${dbId}/connect`, {
                  method: 'POST',
                  headers: { 
                      'Authorization': `Bearer ${session?.access_token}` 
                  }
              });
              if (!response.ok) throw new Error('Falha ao conectar');
              return await response.json();
          } catch (e) {
              throw new Error('Servidor de API Offline. Não é possível gerar QR Code.');
          }
      },
      update: async (id: string, updates: any) => {
          const { data } = await supabase.from('whatsapp_connections').update(updates).eq('id', id).select().single();
          return data;
      },
      logout: async (dbId: string, instanceName?: string) => {
          try {
              // Tenta logout na API mas não bloqueia se falhar
              const { data: { session } } = await supabase.auth.getSession();
              fetch(`${API_BASE_URL}/instances/${dbId}/logout`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${session?.access_token}` }
              }).catch(console.warn);
          } catch(e) {}

          const { error } = await supabase.from('whatsapp_connections').update({ status: 'disconnected', qr_code: null }).eq('id', dbId);
          if (error) throw error;
      },
      delete: async (dbId: string, instanceName?: string) => {
           const { error } = await supabase.from('whatsapp_connections').delete().eq('id', dbId);
           if (error) throw error;
      }
  },

  chat: {
      getMessages: async (cid: string) => { 
          const { data } = await supabase.from('messages').select('*').eq('contact_id', cid).order('created_at');
          return (data || []).map(adaptMessage);
      },
      sendMessage: async (cid: string, content: string, type: MessageType = MessageType.TEXT, extraData?: any) => {
          const company_id = await getCompanyId();
          const { data: { session } } = await supabase.auth.getSession();
          
          // 1. Busca contato para ter o telefone
          const { data: contact } = await supabase.from('contacts').select('phone').eq('id', cid).single();
          if (!contact) throw new Error("Contato inválido");

          // 2. Busca conexão ativa da empresa (simplificado: pega a primeira conectada)
          const { data: connection } = await supabase.from('whatsapp_connections')
              .select('id')
              .eq('company_id', company_id)
              .eq('status', 'connected') // ou 'open'
              .limit(1)
              .single();

          if (!connection) throw new Error("Nenhuma conexão WhatsApp ativa.");

          // 3. Tenta enviar para Fila do Backend
          try {
              const response = await fetch(`${API_BASE_URL}/send`, {
                  method: 'POST',
                  headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session?.access_token}`
                  },
                  body: JSON.stringify({
                      connectionId: connection.id,
                      to: contact.phone,
                      content,
                      type
                  })
              });
              if (!response.ok) throw new Error("API Offline");
          } catch (e) {
              console.warn("Envio via API falhou, salvando apenas no banco local.", e);
              // Em produção, isso deveria ir para uma tabela 'message_queue' no Supabase
              // para ser processada quando o backend voltar.
          }

          // 4. Otimista: Salva no banco local para aparecer na UI imediatamente
          const { data } = await supabase.from('messages').insert({
              company_id, 
              contact_id: cid, 
              content, 
              type, 
              sender_id: 'me', 
              status: 'pending', // Status pendente até webhook confirmar
              location_data: extraData 
          }).select().single();
          
          return adaptMessage(data);
      },
      getQuickReplies: async (): Promise<QuickReply[]> => {
          const { data } = await supabase.from('quick_replies').select('*');
          return data as QuickReply[] || [];
      },
      createQuickReply: async (shortcut: string, content: string): Promise<QuickReply> => {
          const { data } = await supabase.from('quick_replies').insert({ shortcut, content }).select().single();
          return data as QuickReply || {id: 'temp', shortcut, content};
      }
  },
  
  tasks: { 
      list: async (): Promise<Task[]> => {
          const { data } = await supabase.from('tasks').select('*');
          return data as Task[] || [];
      }, 
      create: async (t:any) => {
          const { data } = await supabase.from('tasks').insert(t).select().single();
          return data;
      }, 
      update: async(id:string, u:any) => {
          const { data } = await supabase.from('tasks').update(u).eq('id', id).select().single();
          return data;
      }, 
      delete: async(id: string) => {
          await supabase.from('tasks').delete().eq('id', id);
      } 
  },

  crm: { 
      getPipelines: async (): Promise<Pipeline[]> => {
          // Mock data for now, ideally fetch from supabase 'pipelines' table
          return [
              {
                  id: 'default',
                  name: 'Funil de Vendas',
                  columns: [
                      { id: 'col1', title: 'Novo Lead', color: 'border-blue-500', cards: [] },
                      { id: 'col2', title: 'Em Negociação', color: 'border-yellow-500', cards: [] },
                      { id: 'col3', title: 'Fechado', color: 'border-green-500', cards: [] }
                  ]
              }
          ];
      }, 
      createCard: async(columnId: string, card: any) => {
          // Mock
          console.log('Create card', columnId, card);
      }, 
      moveCard: async(cardId: string, fromColId: string, toColId: string) => {
          // Mock
          console.log('Move card', cardId, fromColId, toColId);
      }, 
      createColumn: async(pipelineId: string, title: string, order: number, color: string): Promise<KanbanColumn> => {
          // Mock return to satisfy type
          return { id: `col_${Date.now()}`, title, color, cards: [] };
      }, 
      updateColumn: async(columnId: string, updates: any) => {
          // Mock
          console.log('Update column', columnId, updates);
      }, 
      deleteColumn: async(columnId: string) => {
          // Mock
          console.log('Delete column', columnId);
      } 
  },

  proposals: { 
      list: async(): Promise<Proposal[]> => [], 
      create: async(d:any) => d, 
      update: async(id: string, d:any) => {} 
  },

  companies: { 
      list: async(): Promise<Company[]> => {
          // Mock list for Super Admin
          return [];
      }, 
      create: async(c:any): Promise<Company> => {
          // Mock create
          return { id: `comp_${Date.now()}`, ...c };
      }, 
      update: async(id: string, updates: any): Promise<Company> => {
          // Mock update
          return { id, ...updates } as Company;
      }, 
      delete: async(id: string) => {
          // Mock delete
          console.log('Deleted company', id);
      } 
  },

  plans: { 
      list: async(): Promise<Plan[]> => [], 
      save: async(p:any) => p 
  },

  ai: { 
      listAgents: async(): Promise<AIAgent[]> => [], 
      generateInsight: async(context: any) => [], 
      analyzeConversation: async(messages: Message[]): Promise<string> => {
          // Mock analysis
          return JSON.stringify({
              sentiment: 'positive',
              summary: 'Conversa produtiva sobre planos.',
              actions: ['Enviar proposta', 'Agendar reunião'],
              opportunity: 'high'
          });
      } 
  },

  users: { updateProfile: async(d:any) => d },
  campaigns: { list: async(): Promise<Campaign[]> => [], create: async(d:any) => d },
  reports: { generatePdf: async() => {} },
  metadata: { getTags: async(): Promise<Tag[]> => [], saveTags: async(tags: any) => {}, getSectors: async(): Promise<Sector[]> => [], saveSectors: async(s: any) => {} }
};

export { adaptMessage };
