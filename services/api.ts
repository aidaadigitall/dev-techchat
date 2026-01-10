
import { Contact, Message, MessageType, Pipeline, Campaign, Task, Proposal, Plan, User, Company, SaasStats, KanbanColumn } from '../types';

// --- PRODUCTION URL HARDCODED ---
// Garante que o frontend sempre aponte para a API de produção na VPS
const API_BASE_URL = 'https://apitechchat.escsistemas.com';

console.log('🔗 API Endpoint:', API_BASE_URL);

// --- Auth Helpers ---
export const getToken = () => localStorage.getItem('auth_token');
export const setToken = (token: string) => localStorage.setItem('auth_token', token);
export const clearToken = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('app_current_user');
  localStorage.removeItem('tenant_id');
};

export const getTenantId = () => {
    const userStr = localStorage.getItem('app_current_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.tenantId) return user.tenantId;
        } catch(e) { console.error(e); }
    }
    return localStorage.getItem('tenant_id') || '';
};

// --- HTTP Client Core ---
const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers: any = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Tenant ID Injection Logic (se não for POST público)
  const tenantId = getTenantId();
  const method = options.method || 'GET';
  let body = options.body;

  if (tenantId) {
      if (['POST', 'PUT', 'DELETE'].includes(method)) {
          if (body && typeof body === 'string') {
              try {
                  const parsed = JSON.parse(body);
                  // Só injeta se for um objeto e não tiver tenantId ainda
                  if (typeof parsed === 'object' && !parsed.tenantId && !url.includes('/auth/')) {
                      parsed.tenantId = tenantId;
                      body = JSON.stringify(parsed);
                  }
              } catch(e) {}
          }
      } 
  }

  const config: RequestInit = { ...options, headers, body };

  try {
    const response = await fetch(url, config);
    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || `Erro API ${response.status}`;
        throw new Error(errorMessage);
    }
    return responseData;
  } catch (error: any) {
    console.error(`API Request Failed [${endpoint}]:`, error);
    throw error;
  }
};

export const api = {
  
  // --- Auth & SaaS Core ---
  auth: {
      login: async (email: string, password: string) => {
          // Rota Fixa: /api/saas/auth/login
          const data = await fetchClient('/api/saas/auth/login', {
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
          // Rota Fixa: /api/saas/auth/register
          const payload = {
              companyName: companyData.name,
              ownerName: adminUserData.name,
              email: adminUserData.email,
              password: adminUserData.password
          };

          const response = await fetchClient('/api/saas/auth/register', {
              method: 'POST',
              body: JSON.stringify(payload)
          });
          
          if (response.token) {
              setToken(response.token);
              localStorage.setItem('app_current_user', JSON.stringify(response.user));
              if (response.user.tenantId) localStorage.setItem('tenant_id', response.user.tenantId);
          }

          return response;
      },
      me: async () => {
          const u = localStorage.getItem('app_current_user');
          return u ? JSON.parse(u) : null;
      }
  },

  // --- SaaS Management (Super Admin) ---
  saas: {
      // Rota Fixa: /api/saas/metrics
      getMetrics: async (): Promise<SaasStats> => fetchClient('/api/saas/metrics'),
  },

  companies: {
      // Rota Fixa: /api/saas/tenants
      list: async (): Promise<Company[]> => fetchClient('/api/saas/tenants'),
      // Implementar create/update/delete conforme necessidade usando endpoints saas
      create: async (data: any) => fetchClient('/api/saas/tenants', { method: 'POST', body: JSON.stringify(data) }), // Mock se backend nao tiver endpoint POST /tenants ainda
      delete: async (id: string) => fetchClient(`/api/saas/tenants/${id}`, { method: 'DELETE' }),
      update: async (id: string, data: any) => fetchClient(`/api/saas/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  plans: {
      list: async (): Promise<Plan[]> => fetchClient('/api/saas/plans'),
      save: async (plan: any) => {
          // Heuristic: If ID starts with 'plan_', it's a temp ID from frontend, so CREATE. Else UPDATE.
          if (plan.id && String(plan.id).startsWith('plan_')) {
              const { id, ...rest } = plan;
              return fetchClient('/api/saas/plans', { method: 'POST', body: JSON.stringify(rest) });
          } else {
              return fetchClient(`/api/saas/plans/${plan.id}`, { method: 'PUT', body: JSON.stringify(plan) });
          }
      }
  },

  users: {
      list: async (tenantId?: string) => {
          let url = '/api/saas/users';
          if (tenantId) url += `?tenantId=${tenantId}`;
          return fetchClient(url);
      },
      create: async (data: any) => fetchClient('/api/saas/users', { method: 'POST', body: JSON.stringify(data) })
  },

  // --- Business Modules (Chat, Contacts, etc) ---
  contacts: {
      list: async (): Promise<Contact[]> => fetchClient('/api/contacts'),
      create: async (c: any) => fetchClient('/api/contacts', { method: 'POST', body: JSON.stringify(c) }),
      update: async (id: string, u: any) => fetchClient(`/api/contacts/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
      delete: async (id: string) => fetchClient(`/api/contacts/${id}`, { method: 'DELETE' })
  },

  whatsapp: {
      list: async () => fetchClient('/api/whatsapp/instances'),
      create: async (name: string, engine = 'whatsmeow') => fetchClient('/api/whatsapp/instances', { method: 'POST', body: JSON.stringify({ name, engine }) }),
      connect: async (id: string) => fetchClient(`/api/whatsapp/instances/${id}/connect`, { method: 'POST' }),
      delete: async (id: string) => fetchClient(`/api/whatsapp/instances/${id}`, { method: 'DELETE' }),
      logout: async (id: string) => fetchClient(`/api/whatsapp/instances/${id}/logout`, { method: 'POST' })
  },

  chat: {
      getMessages: async (contactId: string) => fetchClient(`/api/chat/${contactId}/messages`),
      sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT) => {
          const payload = { contactId, to: contactId, content, type };
          return fetchClient('/api/whatsapp/send', { method: 'POST', body: JSON.stringify(payload) });
      }
  },

  ai: { 
      generateInsight: async (dataPayload: any, contextType: string = 'tasks_analysis'): Promise<string> => {
          const response = await fetchClient('/api/ai/suggest', { 
              method: 'POST', 
              body: JSON.stringify({ contextType, data: dataPayload }) 
          });
          return response.suggestion || response.text || 'Sem sugestão.';
      },
      saveConfig: async (config: any) => {
          return fetchClient('/api/ai/configs', { method: 'POST', body: JSON.stringify(config) });
      },
      getConfig: async () => fetchClient('/api/ai/configs')
  },

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