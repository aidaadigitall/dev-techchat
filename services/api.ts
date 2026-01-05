
import { Contact, Message, MessageType, Pipeline, Campaign, QuickReply, Task, Proposal, KanbanColumn, Tag, Sector, Company, Plan, AIAgent, User } from '../types';

// URL do Backend Node.js em Produção
const API_BASE_URL = 'https://apitechchat.escsistemas.com';

// Helper: Get Tenant ID (Simulating Context or LocalStorage)
const getTenantId = () => {
  // Em produção, isso viria do login. Usando default para compatibilidade imediata.
  return localStorage.getItem('tenant_id') || 'tenant-default-123';
};

// Helper: Fetch Wrapper handling tenantId
const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  const tenantId = getTenantId();
  let url = `${API_BASE_URL}${endpoint}`;
  
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
      
      // Merge tenantId
      bodyObj.tenantId = tenantId;
      config.body = JSON.stringify(bodyObj);
  } else {
      // Inject into Query Params for GET/DELETE (Browsers don't support Body in GET)
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
  status: 'sent', // Backend typically handles status updates via socket/webhook
  channel: 'whatsapp'
});

export const api = {
  // --- Contacts ---
  contacts: {
      list: async (): Promise<Contact[]> => {
          const data = await fetchClient('/contacts'); // GET uses query param
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
      },
      create: async (c: any) => fetchClient('/contacts', { method: 'POST', body: JSON.stringify(c) }),
      update: async (id: string, u: any) => fetchClient(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
      delete: async (id: string) => fetchClient(`/contacts/${id}`, { method: 'DELETE' })
  },

  // --- WhatsApp / Instances ---
  whatsapp: {
      list: async () => fetchClient('/whatsapp/instances'),
      create: async (name: string) => fetchClient('/whatsapp/instances', { method: 'POST', body: JSON.stringify({ name }) }),
      connect: async (id: string) => fetchClient(`/whatsapp/instances/${id}/connect`, { method: 'POST' }),
      delete: async (id: string) => fetchClient(`/whatsapp/instances/${id}`, { method: 'DELETE' }),
      update: async (id: string, data: any) => fetchClient(`/whatsapp/instances/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      logout: async (id: string) => fetchClient(`/whatsapp/instances/${id}/logout`, { method: 'POST' })
  },

  // --- Chat ---
  chat: {
      getMessages: async (contactId: string) => { 
          const data = await fetchClient(`/chat/${contactId}/messages`);
          return data.map(adaptMessage);
      },
      sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT, extraData?: any) => {
          const payload = { contactId, content, type, ...extraData };
          const data = await fetchClient('/chat/send', { method: 'POST', body: JSON.stringify(payload) });
          return adaptMessage(data);
      },
      getQuickReplies: async () => fetchClient('/chat/quick-replies'),
      createQuickReply: async (shortcut: string, content: string) => fetchClient('/chat/quick-replies', { method: 'POST', body: JSON.stringify({ shortcut, content }) })
  },
  
  // --- Tasks (LOCAL STORAGE ONLY - Opção A) ---
  tasks: { 
      list: async (): Promise<Task[]> => {
          const stored = localStorage.getItem('local_tasks');
          return stored ? JSON.parse(stored) : [];
      }, 
      create: async (t: any) => {
          const stored = localStorage.getItem('local_tasks');
          const tasks = stored ? JSON.parse(stored) : [];
          const newTask = { ...t, id: `local_${Date.now()}` };
          tasks.push(newTask);
          localStorage.setItem('local_tasks', JSON.stringify(tasks));
          return newTask;
      }, 
      update: async (id: string, u: any) => {
          const stored = localStorage.getItem('local_tasks');
          let tasks = stored ? JSON.parse(stored) : [];
          tasks = tasks.map((t: any) => t.id === id ? { ...t, ...u } : t);
          localStorage.setItem('local_tasks', JSON.stringify(tasks));
          return u;
      }, 
      delete: async (id: string) => {
          const stored = localStorage.getItem('local_tasks');
          let tasks = stored ? JSON.parse(stored) : [];
          tasks = tasks.filter((t: any) => t.id !== id);
          localStorage.setItem('local_tasks', JSON.stringify(tasks));
          return id;
      }
  },

  // --- CRM / Kanban ---
  crm: { 
      getPipelines: async () => fetchClient('/crm/pipelines'), 
      createCard: async (columnId: string, card: any) => fetchClient(`/crm/columns/${columnId}/cards`, { method: 'POST', body: JSON.stringify(card) }), 
      moveCard: async (cardId: string, fromColId: string, toColId: string) => fetchClient(`/crm/cards/${cardId}/move`, { method: 'POST', body: JSON.stringify({ fromColId, toColId }) }), 
      createColumn: async (pipelineId: string, title: string, order: number, color: string) => fetchClient(`/crm/pipelines/${pipelineId}/columns`, { method: 'POST', body: JSON.stringify({ title, order, color }) }),
      updateColumn: async (id: string, data: any) => fetchClient(`/crm/columns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      deleteColumn: async (id: string) => fetchClient(`/crm/columns/${id}`, { method: 'DELETE' })
  },

  // --- AI Service ---
  ai: { 
      listAgents: async () => fetchClient('/ai/agents'),
      
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

      getConfig: async () => fetchClient('/ai/configs') // GET might imply fetching current config
  },

  // --- Other modules (Mocked for now) ---
  proposals: { list: async() => [], create: async(d:any) => d, update: async() => {} },
  companies: { list: async() => [], create: async(c:any) => c, update: async(id:string, c:any) => c, delete: async(id: string) => {} },
  plans: { list: async() => [], save: async(p:any) => p },
  users: { updateProfile: async(d:any) => d },
  campaigns: { list: async() => [], create: async(d:any) => d },
  reports: { generatePdf: async() => {} },
  metadata: { getTags: async() => [], saveTags: async() => {}, getSectors: async() => [], saveSectors: async() => {} }
};

export { adaptMessage };
