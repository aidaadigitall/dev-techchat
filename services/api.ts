
import { Contact, Message, MessageType, Pipeline, Campaign, Task, Proposal, Plan, AIAgent, User, Company, SaasStats, KanbanColumn } from '../types';

// URL do Backend Node.js em Produção
const API_BASE_URL = 'https://apitechchat.escsistemas.com';

// --- Auth Helpers ---
export const getToken = () => localStorage.getItem('auth_token');
export const setToken = (token: string) => localStorage.setItem('auth_token', token);
export const clearToken = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('app_current_user');
};
export const getTenantId = () => {
    // Tenta pegar do usuário logado primeiro
    const userStr = localStorage.getItem('app_current_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user.tenantId) return user.tenantId;
    }
    // Fallback
    return localStorage.getItem('tenant_id') || '';
};

// --- HTTP Client Core ---
const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
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

  const config: RequestInit = {
    ...options,
    headers
  };

  // Injeção de Tenant ID (Regra de Negócio SaaS)
  // Se for POST/PUT, injeta no Body. Se for GET, injeta na Query.
  const tenantId = getTenantId();
  
  if (tenantId) {
      if (options.method === 'POST' || options.method === 'PUT') {
          let bodyObj: any = {};
          if (options.body && typeof options.body === 'string') {
              try { bodyObj = JSON.parse(options.body); } catch(e) {}
          } else if (typeof options.body === 'object') {
              bodyObj = options.body;
          }
          
          // Apenas injeta se não for rota de login/publica
          if (!url.includes('/login') && !url.includes('/saas/tenants')) {
               bodyObj.tenantId = tenantId;
               config.body = JSON.stringify(bodyObj);
          }
      } else if (options.method === 'GET' || options.method === 'DELETE') {
          const separator = url.includes('?') ? '&' : '?';
          if (!url.includes('tenantId=')) {
             url = `${url}${separator}tenantId=${tenantId}`;
          }
      }
  }

  try {
    const response = await fetch(url, config);
    
    // Tratamento de Erros Globais
    if (response.status === 401) {
        console.warn("Sessão expirada. Redirecionando...");
        // Opcional: window.location.href = '/'; 
        // (melhor lidar no componente App para não causar refresh loop)
    }

    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
        throw new Error(responseData.error || `Erro na requisição: ${response.status}`);
    }
    return responseData;
  } catch (error) {
    console.error(`API Call Error [${endpoint}]:`, error);
    throw error;
  }
};

// --- Adapters ---
export const adaptMessage = (data: any): Message => ({
  id: data.id,
  content: data.content,
  senderId: data.sender_id === 'me' ? 'me' : data.contact_id || 'unknown', // Ajuste conforme seu backend
  timestamp: new Date(data.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
  type: data.type || MessageType.TEXT,
  status: data.status || 'sent',
  channel: 'whatsapp'
});

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
              // Salva tenantId explicitamente se necessário
              if (data.user.tenantId) localStorage.setItem('tenant_id', data.user.tenantId);
          }
          return data;
      },
      register: async (companyData: any, adminUserData: any) => {
          // 1. Criar Tenant
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
          // Endpoint hipotético ou recupera do localstorage por enquanto
          // Se o backend tiver /saas/me, use-o. Caso contrário, usamos o stored user.
          const u = localStorage.getItem('app_current_user');
          return u ? JSON.parse(u) : null;
      }
  },

  // --- SaaS Management (Super Admin) ---
  saas: {
      getMetrics: async (): Promise<SaasStats> => {
          const data = await fetchClient('/saas/metrics');
          return {
              totalCompanies: data.overview.totalTenants,
              activeUsers: data.overview.activeUsers,
              mrr: data.overview.mrr,
              churnRate: data.churnRate || 0
          };
      }
  },

  companies: {
      list: async (): Promise<Company[]> => {
          const data = await fetchClient('/saas/tenants');
          // Adapter para interface Company do frontend
          return data.map((t: any) => ({
              id: t.id,
              name: t.name,
              ownerName: t.ownerName,
              email: t.email,
              phone: '', // Backend precisa retornar se tiver
              planId: t.planId || 'basic',
              status: t.status,
              subscriptionEnd: t.createdAt, // Placeholder
              userCount: 1, // Backend deveria retornar count real
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
               // Update (se não for ID temporário de frontend)
               // Backend route for update plan not explicitly in prompt list, assuming pattern
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

  // --- Contacts ---
  contacts: {
      list: async (): Promise<Contact[]> => {
          // Fallback para array vazio se der erro (comum em setup inicial)
          try {
            const data = await fetchClient('/contacts'); // Rota precisa existir no backend.ts se não, vai dar 404
            if (!Array.isArray(data)) return [];
            return data.map((d: any) => ({
                id: d.id, 
                name: d.name || d.pushName || 'Sem Nome', 
                phone: d.phone, 
                email: d.email,
                tags: d.tags || [],
                status: d.status || 'open'
            }));
          } catch(e) {
            console.warn("Contacts API failed or empty", e);
            return [];
          }
      },
      create: async (c: any) => fetchClient('/contacts', { method: 'POST', body: JSON.stringify(c) }),
      update: async (id: string, u: any) => fetchClient(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
      delete: async (id: string) => fetchClient(`/contacts/${id}`, { method: 'DELETE' })
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
      getMessages: async (contactId: string) => { 
          try {
             // Ajuste a rota conforme seu backend real
             const data = await fetchClient(`/chat/${contactId}/messages`);
             return Array.isArray(data) ? data.map(adaptMessage) : [];
          } catch { return []; }
      },
      sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT) => {
          // Necessário connectionId. O backend deve inferir ou frontend deve passar.
          // Assumindo que backend infere a conexão ativa do Tenant ou Contact.
          // Se backend precisar de connectionId, precisamos pegar de algum contexto.
          // Por enquanto, enviamos para rota genérica /send
          const payload = { contactId, to: contactId, content, type }; // 'to' geralmente é o telefone
          return fetchClient('/api/whatsapp/send', { method: 'POST', body: JSON.stringify(payload) });
      }
  },

  // --- AI ---
  ai: { 
      // POST /ai/suggest
      generateInsight: async (dataPayload: any, contextType: string = 'tasks_analysis'): Promise<string> => {
          const response = await fetchClient('/api/ai/suggest', { 
              method: 'POST', 
              body: JSON.stringify({ 
                  contextType,
                  data: dataPayload
              }) 
          });
          return response.suggestion || response.text || 'Sem sugestão.';
      },
      
      // POST /ai/configs
      saveConfig: async (config: { apiKey: string; provider: string; model?: string; enabled?: boolean }) => {
          return fetchClient('/api/ai/configs', { 
              method: 'POST', 
              body: JSON.stringify(config) 
          });
      },
      getConfig: async () => {
          // GET /api/ai/configs (se implementado no backend)
          // Se não tiver GET, retornamos null
          try { return await fetchClient('/api/ai/configs'); } catch { return null; }
      }
  },

  // --- Placeholders para módulos ainda não 100% no backend ---
  tasks: { 
      list: async () => [], 
      create: async (t:any) => t, 
      update: async (id:string, u:any) => u, 
      delete: async (id:string) => {} 
  },
  crm: { 
      getPipelines: async (): Promise<Pipeline[]> => [],
      createCard: async (columnId: string, cardData: any) => {
          // Mock creation
          return { id: `card_${Date.now()}`, ...cardData, contactName: 'Novo Card' };
      },
      moveCard: async (cardId: string, sourceColId: string, destColId: string) => {
          // Mock move
      },
      createColumn: async (pipelineId: string, title: string, order: number, color: string): Promise<KanbanColumn> => {
          return { id: `col_${Date.now()}`, title, order: order as any, color, cards: [] } as any;
      },
      updateColumn: async (colId: string, data: any) => {
          // Mock update
      },
      deleteColumn: async (colId: string) => {
          // Mock delete
      }
  },
  proposals: { list: async() => [], create: async(d:any) => d },
};
