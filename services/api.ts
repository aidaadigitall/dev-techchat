
import { Contact, Message, MessageType, Pipeline, Campaign, Task, Proposal, Plan, User, Company, SaasStats, KanbanColumn } from '../types';

// URL do Backend: Usa a URL de produção ou localhost
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://apitechchat.escsistemas.com';

// --- Auth Helpers ---
export const getToken = () => localStorage.getItem('auth_token');
export const setToken = (token: string) => localStorage.setItem('auth_token', token);
export const clearToken = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('app_current_user');
  localStorage.removeItem('tenant_id');
};

// Recupera o Tenant ID da sessão
export const getTenantId = () => {
    const userStr = localStorage.getItem('app_current_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.tenantId) return user.tenantId;
        } catch(e) {
            console.error("Erro ao ler tenantId do usuario", e);
        }
    }
    // Fallback: tenta ler direto do storage se foi salvo separadamente
    return localStorage.getItem('tenant_id') || '';
};

// --- HTTP Client Core ---
const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // Headers padrão
  const headers: any = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Injeção de JWT
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Injeção de Tenant ID (Obrigatório em SaaS Multi-tenant)
  const tenantId = getTenantId();
  const method = options.method || 'GET';

  let body = options.body;

  if (tenantId) {
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
          // Injeta tenantId no corpo JSON
          if (body && typeof body === 'string') {
              try {
                  const parsed = JSON.parse(body);
                  if (typeof parsed === 'object' && !parsed.tenantId) {
                      parsed.tenantId = tenantId;
                      body = JSON.stringify(parsed);
                  }
              } catch(e) {}
          } else if (!body) {
              // Se não tem body, cria um com tenantId
              body = JSON.stringify({ tenantId });
          }
      } else if (method === 'GET') {
          // Injeta tenantId na Query String
          const separator = url.includes('?') ? '&' : '?';
          if (!url.includes('tenantId=')) {
             // Modificamos a URL da chamada localmente (não a variavel endpoint original)
             // Note: fetch recebe a URL final montada acima, mas aqui precisamos anexar a query
             // Como 'url' é const, vamos criar uma nova string na chamada do fetch
          }
      }
  }

  // Montagem final da URL com Query Params de Tenant se for GET
  let finalUrl = url;
  if (method === 'GET' && tenantId && !url.includes('tenantId=')) {
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}tenantId=${tenantId}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
    body
  };

  try {
    const response = await fetch(finalUrl, config);
    
    // Tratamento de Sessão Expirada
    if (response.status === 401) {
        console.warn("Sessão expirada (401).");
        // Opcional: limpar token e redirecionar
        // clearToken();
        // window.location.href = '/';
    }

    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
        throw new Error(responseData.error || `Erro API ${response.status}: ${response.statusText}`);
    }
    return responseData;
  } catch (error) {
    console.error(`API Request Failed [${endpoint}]:`, error);
    throw error; // Repassa o erro para a tela quebrar/avisar o usuário
  }
};

export const api = {
  
  // --- Auth & SaaS Core ---
  auth: {
      login: async (email: string, password: string) => {
          const data = await fetchClient('/saas/login', {
              method: 'POST',
              body: JSON.stringify({ email, password })
          });
          if (data.token) {
              setToken(data.token);
              localStorage.setItem('app_current_user', JSON.stringify(data.user));
              if (data.user.tenantId) localStorage.setItem('tenant_id', data.user.tenantId);
          }
          return data;
      },
      register: async (companyData: any, adminUserData: any) => {
          // 1. Criar Tenant (Empresa)
          const tenant = await fetchClient('/saas/tenants', {
              method: 'POST',
              body: JSON.stringify(companyData)
          });
          
          // 2. Criar Admin User vinculado ao Tenant
          const user = await fetchClient('/saas/users', {
              method: 'POST',
              body: JSON.stringify({
                  ...adminUserData,
                  tenantId: tenant.id,
                  role: 'admin'
              })
          });

          return { tenant, user };
      },
      me: async () => {
          // Recupera dados atualizados do usuário
          const u = localStorage.getItem('app_current_user');
          return u ? JSON.parse(u) : null;
      }
  },

  // --- SaaS Management (Super Admin) ---
  saas: {
      getMetrics: async (): Promise<SaasStats> => fetchClient('/saas/metrics'),
  },

  companies: {
      list: async (): Promise<Company[]> => {
          const data = await fetchClient('/saas/tenants');
          // Adapter simples
          return data.map((t: any) => ({
              id: t.id,
              name: t.name,
              ownerName: t.ownerName,
              email: t.email,
              planId: t.planId || 'basic',
              status: t.status,
              userCount: 1, 
              aiUsage: 0,
              aiLimit: 1000,
              useCustomKey: false
          }));
      },
      create: async (data: any) => fetchClient('/saas/tenants', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id: string, data: any) => fetchClient(`/saas/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: async (id: string) => fetchClient(`/saas/tenants/${id}`, { method: 'DELETE' })
  },

  plans: {
      list: async (): Promise<Plan[]> => fetchClient('/saas/plans'),
      save: async (plan: any) => {
          if (plan.id && !plan.id.startsWith('plan_')) {
               return fetchClient(`/saas/plans/${plan.id}`, { method: 'PUT', body: JSON.stringify(plan) });
          } else {
               return fetchClient('/saas/plans', { method: 'POST', body: JSON.stringify(plan) });
          }
      }
  },

  users: {
      list: async (tenantId?: string) => {
          let url = '/saas/users';
          if (tenantId) url += `?tenantId=${tenantId}`;
          return fetchClient(url);
      },
      create: async (data: any) => fetchClient('/saas/users', { method: 'POST', body: JSON.stringify(data) })
  },

  // --- Contacts (Real DB) ---
  contacts: {
      list: async (): Promise<Contact[]> => fetchClient('/api/contacts'),
      create: async (c: any) => fetchClient('/api/contacts', { method: 'POST', body: JSON.stringify(c) }),
      update: async (id: string, u: any) => fetchClient(`/api/contacts/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
      delete: async (id: string) => fetchClient(`/api/contacts/${id}`, { method: 'DELETE' })
  },

  // --- WhatsApp ---
  whatsapp: {
      list: async () => fetchClient('/api/whatsapp/instances'),
      create: async (name: string, engine = 'whatsmeow') => fetchClient('/api/whatsapp/instances', { method: 'POST', body: JSON.stringify({ name, engine }) }),
      connect: async (id: string) => fetchClient(`/api/whatsapp/instances/${id}/connect`, { method: 'POST' }),
      delete: async (id: string) => fetchClient(`/api/whatsapp/instances/${id}`, { method: 'DELETE' }),
      logout: async (id: string) => fetchClient(`/api/whatsapp/instances/${id}/logout`, { method: 'POST' })
  },

  // --- Chat ---
  chat: {
      getMessages: async (contactId: string) => fetchClient(`/api/chat/${contactId}/messages`),
      sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT) => {
          const payload = { contactId, to: contactId, content, type };
          return fetchClient('/api/whatsapp/send', { method: 'POST', body: JSON.stringify(payload) });
      }
  },

  // --- AI ---
  ai: { 
      generateInsight: async (dataPayload: any, contextType: string = 'tasks_analysis'): Promise<string> => {
          const response = await fetchClient('/api/ai/suggest', { 
              method: 'POST', 
              body: JSON.stringify({ contextType, data: dataPayload }) 
          });
          return response.suggestion || response.text || 'Sem sugestão.';
      },
      saveConfig: async (config: { apiKey: string; provider: string; model?: string; enabled?: boolean }) => {
          return fetchClient('/api/ai/configs', { method: 'POST', body: JSON.stringify(config) });
      },
      getConfig: async () => fetchClient('/api/ai/configs')
  },

  // --- Modulos com Rotas Reais (Sem Mocks) ---
  tasks: { 
      list: async () => fetchClient('/api/tasks'), 
      create: async (t:any) => fetchClient('/api/tasks', { method: 'POST', body: JSON.stringify(t) }), 
      update: async (id:string, u:any) => fetchClient(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(u) }), 
      delete: async (id:string) => fetchClient(`/api/tasks/${id}`, { method: 'DELETE' }) 
  },
  
  crm: { 
      getPipelines: async (): Promise<Pipeline[]> => fetchClient('/api/crm/pipelines'),
      createCard: async (columnId: string, cardData: any) => fetchClient(`/api/crm/cards`, { method: 'POST', body: JSON.stringify({ columnId, ...cardData }) }),
      moveCard: async (cardId: string, sourceColId: string, destColId: string) => fetchClient(`/api/crm/cards/${cardId}/move`, { method: 'POST', body: JSON.stringify({ sourceColId, destColId }) }),
      createColumn: async (pipelineId: string, title: string, order: number, color: string): Promise<KanbanColumn> => fetchClient('/api/crm/columns', { method: 'POST', body: JSON.stringify({ pipelineId, title, order, color }) }),
      updateColumn: async (colId: string, data: any) => fetchClient(`/api/crm/columns/${colId}`, { method: 'PUT', body: JSON.stringify(data) }),
      deleteColumn: async (colId: string) => fetchClient(`/api/crm/columns/${colId}`, { method: 'DELETE' })
  },
  
  proposals: { 
      list: async (): Promise<Proposal[]> => fetchClient('/api/proposals'), 
      create: async (d:any) => fetchClient('/api/proposals', { method: 'POST', body: JSON.stringify(d) }) 
  },
};

// Exporta helper para adaptação de mensagens antigas se necessário
export const adaptMessage = (data: any): Message => ({
  id: data.id,
  content: data.content,
  senderId: data.sender_id === 'me' ? 'me' : data.contact_id || 'unknown',
  timestamp: new Date(data.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
  type: data.type || MessageType.TEXT,
  status: data.status || 'sent',
  channel: 'whatsapp'
});
