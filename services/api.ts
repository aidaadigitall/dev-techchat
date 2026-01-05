
import { Contact, Message, MessageType, Pipeline, Campaign, QuickReply, Task, Proposal, KanbanColumn, Tag, Sector, Company, Plan, AIAgent, User } from '../types';

// URL do Backend Node.js em Produção
const API_BASE_URL = 'https://apitechchat.escsistemas.com';

// Helper: Get Tenant ID
const getTenantId = () => {
  return localStorage.getItem('tenant_id') || 'tenant-default-123';
};

// Helper: Fetch Wrapper handling tenantId in Body (POST/PUT) or Query (GET)
const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  const tenantId = getTenantId();
  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers: any = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config: RequestInit = {
    ...options,
    headers
  };

  // Inject tenantId
  if (options.method === 'POST' || options.method === 'PUT') {
      // Inject into Body for mutation requests
      let bodyObj: any = {};
      if (typeof options.body === 'string') {
          try { bodyObj = JSON.parse(options.body); } catch(e) {}
      } else if (typeof options.body === 'object') {
          bodyObj = options.body;
      }
      
      // Merge tenantId (CRITICAL: Backend requires tenantId in BODY)
      bodyObj.tenantId = tenantId;
      config.body = JSON.stringify(bodyObj);
  } else {
      // Inject into Query Params for GET/DELETE
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}tenantId=${tenantId}`;
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Request failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Call Error [${endpoint}]:`, error);
    throw error;
  }
};

// --- Adapters ---
const adaptMessage = (data: any): Message => ({
  id: data.id,
  content: data.content,
  senderId: data.from === 'me' ? 'me' : data.contactId || 'unknown',
  timestamp: new Date(data.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
  type: data.type || MessageType.TEXT,
  status: 'sent',
  channel: 'whatsapp'
});

// --- Local Storage Helpers (For Modules without Backend Endpoints) ---
const localDb = {
    get: (key: string) => {
        const data = localStorage.getItem(`db_${key}_${getTenantId()}`);
        return data ? JSON.parse(data) : [];
    },
    save: (key: string, data: any) => {
        localStorage.setItem(`db_${key}_${getTenantId()}`, JSON.stringify(data));
    },
    add: (key: string, item: any) => {
        const list = localDb.get(key);
        const newItem = { ...item, id: `${key}_${Date.now()}` };
        list.push(newItem);
        localDb.save(key, list);
        return newItem;
    },
    update: (key: string, id: string, updates: any) => {
        const list = localDb.get(key);
        const updated = list.map((i: any) => i.id === id ? { ...i, ...updates } : i);
        localDb.save(key, updated);
        return updated.find((i: any) => i.id === id);
    },
    delete: (key: string, id: string) => {
        const list = localDb.get(key);
        const filtered = list.filter((i: any) => i.id !== id);
        localDb.save(key, filtered);
    }
};

export const api = {
  // --- Contacts (Real Backend or Fallback) ---
  contacts: {
      list: async (): Promise<Contact[]> => {
          try {
              // Try fetching from backend
              const data = await fetchClient('/contacts');
              return data.map((d: any) => ({
                  id: d.id, 
                  name: d.name || d.pushName || 'Desconhecido', 
                  phone: d.phone, 
                  email: d.email, 
                  tags: d.tags || [],
                  avatar: d.profilePicUrl || '', 
                  status: d.status || 'open', 
                  lastMessage: d.lastMessage,
                  company: d.company, 
                  role: d.role
              }));
          } catch (e) {
              // Fallback to local if backend is not ready
              console.warn("Using local contacts fallback");
              return localDb.get('contacts');
          }
      },
      create: async (c: any) => {
          try {
              return await fetchClient('/contacts', { method: 'POST', body: JSON.stringify(c) });
          } catch (e) {
              return localDb.add('contacts', c);
          }
      },
      update: async (id: string, u: any) => {
          try {
              return await fetchClient(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(u) });
          } catch (e) {
              return localDb.update('contacts', id, u);
          }
      },
      delete: async (id: string) => {
          try {
              return await fetchClient(`/contacts/${id}`, { method: 'DELETE' });
          } catch (e) {
              return localDb.delete('contacts', id);
          }
      }
  },

  // --- WhatsApp / Instances (Real Backend) ---
  whatsapp: {
      list: async () => fetchClient('/whatsapp/instances'),
      create: async (name: string) => fetchClient('/whatsapp/instances', { method: 'POST', body: JSON.stringify({ name }) }),
      connect: async (id: string) => fetchClient(`/whatsapp/instances/${id}/connect`, { method: 'POST' }),
      delete: async (id: string) => fetchClient(`/whatsapp/instances/${id}`, { method: 'DELETE' }),
      update: async (id: string, data: any) => fetchClient(`/whatsapp/instances/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      logout: async (id: string) => fetchClient(`/whatsapp/instances/${id}/logout`, { method: 'POST' })
  },

  // --- Chat (Real Backend) ---
  chat: {
      getMessages: async (contactId: string) => { 
          try {
              const data = await fetchClient(`/chat/${contactId}/messages`);
              return data.map(adaptMessage);
          } catch(e) {
              return [];
          }
      },
      sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT, extraData?: any) => {
          const payload = { contactId, content, type, ...extraData };
          // This goes to the queue in backend
          const data = await fetchClient('/chat/send', { method: 'POST', body: JSON.stringify(payload) });
          return adaptMessage(data);
      },
      getQuickReplies: async () => localDb.get('quick_replies'),
      createQuickReply: async (shortcut: string, content: string) => localDb.add('quick_replies', { shortcut, content })
  },
  
  // --- Tasks (LOCAL STORAGE ONLY - Opção A) ---
  tasks: { 
      list: async (): Promise<Task[]> => localDb.get('tasks'),
      create: async (t: any) => localDb.add('tasks', t),
      update: async (id: string, u: any) => localDb.update('tasks', id, u),
      delete: async (id: string) => localDb.delete('tasks', id)
  },

  // --- CRM / Kanban (MOCKED LOCAL - Backend not ready) ---
  crm: { 
      getPipelines: async (): Promise<Pipeline[]> => {
          const pipes = localDb.get('pipelines');
          if (pipes.length === 0) {
              // Seed default pipeline
              const defaultPipe = {
                  id: 'default_pipeline',
                  name: 'Funil de Vendas',
                  columns: [
                      { id: 'col1', title: 'Novo Lead', color: 'border-blue-500', cards: [] },
                      { id: 'col2', title: 'Em Contato', color: 'border-yellow-500', cards: [] },
                      { id: 'col3', title: 'Proposta', color: 'border-purple-500', cards: [] },
                      { id: 'col4', title: 'Fechado', color: 'border-green-500', cards: [] }
                  ]
              };
              localDb.save('pipelines', [defaultPipe]);
              return [defaultPipe];
          }
          return pipes;
      },
      createCard: async (columnId: string, card: any) => {
          const pipes = localDb.get('pipelines');
          // Find and update nested card
          // Simplified: Just add to first pipeline for demo
          if(pipes.length > 0) {
              const pipe = pipes[0];
              const col = pipe.columns.find((c: any) => c.id === columnId);
              if(col) {
                  const newCard = { ...card, id: `card_${Date.now()}` };
                  col.cards.push(newCard);
                  localDb.save('pipelines', pipes);
                  return newCard;
              }
          }
          return null;
      },
      moveCard: async (cardId: string, fromColId: string, toColId: string) => {
          const pipes = localDb.get('pipelines');
          if(pipes.length > 0) {
              const pipe = pipes[0];
              const fromCol = pipe.columns.find((c: any) => c.id === fromColId);
              const toCol = pipe.columns.find((c: any) => c.id === toColId);
              if(fromCol && toCol) {
                  const cardIndex = fromCol.cards.findIndex((c: any) => c.id === cardId);
                  if(cardIndex > -1) {
                      const [card] = fromCol.cards.splice(cardIndex, 1);
                      toCol.cards.push(card);
                      localDb.save('pipelines', pipes);
                  }
              }
          }
      },
      createColumn: async (pipelineId: string, title: string, order: number, color: string) => {
          const pipes = localDb.get('pipelines');
          const pipe = pipes.find((p: any) => p.id === pipelineId);
          if(pipe) {
              const newCol = { id: `col_${Date.now()}`, title, order, color, cards: [] };
              pipe.columns.push(newCol);
              localDb.save('pipelines', pipes);
              return newCol;
          }
          return null;
      },
      updateColumn: async (id: string, data: any) => {
          const pipes = localDb.get('pipelines');
          pipes.forEach((p: any) => {
              const col = p.columns.find((c: any) => c.id === id);
              if(col) Object.assign(col, data);
          });
          localDb.save('pipelines', pipes);
      },
      deleteColumn: async (id: string) => {
          const pipes = localDb.get('pipelines');
          pipes.forEach((p: any) => {
              p.columns = p.columns.filter((c: any) => c.id !== id);
          });
          localDb.save('pipelines', pipes);
      }
  },

  // --- AI Service (Real Backend) ---
  ai: { 
      listAgents: async () => localDb.get('ai_agents'),
      
      // Calls POST /ai/suggest
      // Receives local tasks or chat history
      generateInsight: async (dataPayload: any, contextType: string = 'tasks_analysis'): Promise<string> => {
          const response = await fetchClient('/ai/suggest', { 
              method: 'POST', 
              body: JSON.stringify({ 
                  contextType,
                  data: dataPayload
              }) 
          });
          // Backend returns { suggestion: string } or text
          return response.suggestion || response.text || '';
      },

      analyzeConversation: async (messages: Message[]): Promise<string> => {
          const response = await fetchClient('/ai/suggest', {
              method: 'POST',
              body: JSON.stringify({
                  contextType: 'chat_analysis',
                  data: messages
              })
          });
          return JSON.stringify(response);
      },

      // Calls POST /ai/configs
      // Expected Payload: { tenantId, provider, apiKey, model, enabled }
      saveConfig: async (config: { apiKey: string; provider: string; model?: string; enabled?: boolean }) => {
          return fetchClient('/ai/configs', { 
              method: 'POST', 
              body: JSON.stringify(config) 
          });
      },

      getConfig: async () => fetchClient('/ai/configs')
  },

  // --- Other modules (Mocked Local) ---
  proposals: { 
      list: async() => localDb.get('proposals'), 
      create: async(d:any) => localDb.add('proposals', d), 
      update: async() => {} 
  },
  companies: { list: async() => [], create: async(c:any) => c, update: async(id:string, c:any) => c, delete: async(id: string) => {} },
  plans: { list: async() => [], save: async(p:any) => p },
  users: { updateProfile: async(d:any) => d },
  campaigns: { list: async() => localDb.get('campaigns'), create: async(d:any) => localDb.add('campaigns', d) },
  reports: { generatePdf: async() => {} },
  metadata: { getTags: async() => [], saveTags: async() => {}, getSectors: async() => [], saveSectors: async() => {} }
};

export { adaptMessage };
