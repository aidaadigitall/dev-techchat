
import { Contact, Message, MessageType, Pipeline, Campaign, Task, Proposal, Plan, User, Company, SaasStats, KanbanColumn } from '../types';

// --- Dynamic URL Detection ---
// Permite que funcione em localhost, IP da VPS ou Domínio sem configuração manual
const getBaseUrl = () => {
    const hostname = window.location.hostname;
    
    // Ambiente Local
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    
    // Ambiente VPS/Produção (Assume backend na porta 3000 do mesmo host)
    // Se estiver usando HTTPS no frontend via Nginx, certifique-se que a API também está proxied ou acessível
    return `${window.location.protocol}//${hostname}:3000`;
};

const API_BASE_URL = getBaseUrl();
console.log('API Endpoint:', API_BASE_URL); // Debug

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

  // Tenant ID Injection Logic
  const tenantId = getTenantId();
  const method = options.method || 'GET';
  let body = options.body;

  if (tenantId) {
      if (['POST', 'PUT', 'DELETE'].includes(method)) {
          if (body && typeof body === 'string') {
              try {
                  const parsed = JSON.parse(body);
                  if (typeof parsed === 'object' && !parsed.tenantId) {
                      parsed.tenantId = tenantId;
                      body = JSON.stringify(parsed);
                  }
              } catch(e) {}
          } else if (!body) {
              body = JSON.stringify({ tenantId });
          }
      } 
  }

  let finalUrl = url;
  if (method === 'GET' && tenantId && !url.includes('tenantId=')) {
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}tenantId=${tenantId}`;
  }

  const config: RequestInit = { ...options, headers, body };

  try {
    const response = await fetch(finalUrl, config);
    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
        // Tenta pegar a mensagem de erro específica do backend
        const errorMessage = responseData.error || responseData.message || `Erro API ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
    }
    return responseData;
  } catch (error: any) {
    console.error(`API Request Failed [${endpoint}]:`, error);
    // Repassa o erro original para ser tratado no frontend (ex: mostrar no toast)
    throw error;
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
          // Adaptar para o payload unificado do SaasController
          const payload = {
              companyName: companyData.name,
              ownerName: adminUserData.name, // Nome do responsável
              email: adminUserData.email,
              password: adminUserData.password
          };

          const response = await fetchClient('/saas/tenants', {
              method: 'POST',
              body: JSON.stringify(payload)
          });
          
          // O backend já retorna o token e usuário logado
          if (response.token) {
              setToken(response.token);
              localStorage.setItem('app_current_user', JSON.stringify(response.user));
              if (response.user.tenantId) localStorage.setItem('tenant_id', response.user.tenantId);
          }

          return response; // { tenant, user, token, message }
      },
      me: async () => {
          const u = localStorage.getItem('app_current_user');
          return u ? JSON.parse(u) : null;
      }
  },

  // --- SaaS Management (Super Admin) ---
  saas: {
      getMetrics: async (): Promise<SaasStats> => fetchClient('/saas/metrics'),
  },

  companies: {
      list: async (): Promise<Company[]> => fetchClient('/saas/tenants'),
      create: async (data: any) => fetchClient('/saas/tenants', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id: string, data: any) => fetchClient(`/saas/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: async (id: string) => fetchClient(`/saas/tenants/${id}`, { method: 'DELETE' })
  },

  plans: {
      list: async (): Promise<Plan[]> => fetchClient('/saas/plans'),
      save: async (plan: any) => fetchClient('/saas/plans', { method: 'POST', body: JSON.stringify(plan) })
  },

  users: {
      list: async (tenantId?: string) => {
          let url = '/saas/users';
          if (tenantId) url += `?tenantId=${tenantId}`;
          return fetchClient(url);
      },
      create: async (data: any) => fetchClient('/saas/users', { method: 'POST', body: JSON.stringify(data) })
  },

  // --- Contacts ---
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

  // --- Modules ---
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
