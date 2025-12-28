import { Contact, Message, MessageType, KanbanColumn, Pipeline, Campaign, QuickReply, AIInsight, Task } from '../types';
import { MOCK_CONTACTS, MOCK_MESSAGES, MOCK_KANBAN_COLUMNS } from '../constants';

// Simulated delay to mimic network requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MOCK_QUICK_REPLIES: QuickReply[] = [
  { id: '1', shortcut: '/oi', content: 'Olá! Tudo bem? Como posso ajudar você hoje?' },
  { id: '2', shortcut: '/pix', content: 'Nossa chave PIX é o CNPJ: 12.345.678/0001-90. Favor enviar o comprovante.' },
  { id: '3', shortcut: '/fim', content: 'Agradecemos o contato! Se precisar de mais alguma coisa, estamos à disposição.' },
  { id: '4', shortcut: '/preco', content: 'Nossos planos começam a partir de R$ 199,90. Gostaria de ver a tabela completa?' },
];

let MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Finalizar proposta comercial da Acme Corp',
    description: 'Revisar valores e incluir cláusula de suporte estendido.',
    dueDate: new Date().toISOString().split('T')[0], // Hoje
    priority: 'p1',
    projectId: 'comercial',
    completed: false,
    assigneeId: '1',
    tags: ['Contrato', 'Urgente'],
    subtasks: [
      { id: '1a', title: 'Calcular impostos', priority: 'p2', projectId: 'comercial', completed: true },
      { id: '1b', title: 'Gerar PDF final', priority: 'p4', projectId: 'comercial', completed: false }
    ]
  },
  {
    id: '2',
    title: 'Reunião de alinhamento semanal',
    dueDate: new Date().toISOString().split('T')[0], // Hoje
    priority: 'p3',
    projectId: 'inbox',
    completed: false,
    assigneeId: '2',
    tags: ['Equipe']
  },
  {
    id: '3',
    title: 'Pagar servidor AWS',
    description: 'Vencimento dia 25',
    dueDate: '2024-12-25', // Futuro
    priority: 'p1',
    projectId: 'financeiro',
    completed: false,
    assigneeId: '1'
  },
  {
    id: '4',
    title: 'Criar criativos para Black Friday',
    dueDate: '2024-11-10', // Passado/Atrasado (exemplo)
    priority: 'p2',
    projectId: 'marketing',
    completed: false,
    assigneeId: '4',
    subtasks: [
      { id: '4a', title: 'Briefing com copywriter', priority: 'p3', projectId: 'marketing', completed: false }
    ]
  },
  {
    id: '5',
    title: 'Corrigir bug no login do app',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0], // Amanhã
    priority: 'p1',
    projectId: 'dev',
    completed: false,
    assigneeId: '3',
    tags: ['Bug', 'Mobile']
  }
];

// This service is structured to be easily replaced by Axios calls to your NestJS/Node backend.
export const api = {
  contacts: {
    list: async (): Promise<Contact[]> => {
      await delay(300);
      return MOCK_CONTACTS;
    },
    getById: async (id: string): Promise<Contact | undefined> => {
      await delay(200);
      return MOCK_CONTACTS.find(c => c.id === id);
    },
    create: async (data: Partial<Contact>): Promise<Contact> => {
      await delay(500);
      const newContact = { ...MOCK_CONTACTS[0], ...data, id: Date.now().toString() } as Contact;
      return newContact;
    },
    update: async (id: string, data: Partial<Contact>): Promise<Contact> => {
      await delay(300);
      // Logic to update mock data would go here if we were persisting it better
      const index = MOCK_CONTACTS.findIndex(c => c.id === id);
      if (index !== -1) {
         MOCK_CONTACTS[index] = { ...MOCK_CONTACTS[index], ...data };
         return MOCK_CONTACTS[index];
      }
      return { ...MOCK_CONTACTS[0], ...data } as Contact;
    }
  },

  chat: {
    getMessages: async (contactId: string): Promise<Message[]> => {
      await delay(300);
      return MOCK_MESSAGES; // In real app, filter by contactId
    },
    sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT): Promise<Message> => {
      await delay(300);
      return {
        id: Date.now().toString(),
        content,
        senderId: 'me',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type,
        status: 'sent',
        channel: 'whatsapp'
      };
    },
    getQuickReplies: async (): Promise<QuickReply[]> => {
      await delay(200);
      return MOCK_QUICK_REPLIES;
    }
  },

  tasks: {
    list: async (): Promise<Task[]> => {
      await delay(200);
      return MOCK_TASKS;
    },
    create: async (task: Partial<Task>): Promise<Task> => {
      await delay(200);
      const newTask = { 
        ...task, 
        id: Date.now().toString(), 
        completed: false,
        subtasks: task.subtasks || []
      } as Task;
      MOCK_TASKS = [newTask, ...MOCK_TASKS];
      return newTask;
    },
    update: async (id: string, updates: Partial<Task>): Promise<Task> => {
      await delay(200);
      MOCK_TASKS = MOCK_TASKS.map(t => t.id === id ? { ...t, ...updates } : t);
      return MOCK_TASKS.find(t => t.id === id)!;
    },
    delete: async (id: string): Promise<void> => {
      await delay(200);
      MOCK_TASKS = MOCK_TASKS.filter(t => t.id !== id);
    }
  },

  crm: {
    getPipelines: async (): Promise<Pipeline[]> => {
      await delay(300);
      return [
        { id: 'default', name: 'Comercial', columns: MOCK_KANBAN_COLUMNS },
        { id: 'finance', name: 'Financeiro', columns: [] },
        { id: 'support', name: 'Suporte & Atendimento', columns: [] }
      ];
    },
    moveCard: async (cardId: string, sourceColId: string, destColId: string) => {
      await delay(200);
      return true;
    }
  },

  campaigns: {
    list: async (): Promise<Campaign[]> => {
      await delay(300);
      return [];
    },
    create: async (data: any): Promise<Campaign> => {
      await delay(800);
      return {
        id: Date.now().toString(),
        name: data.name,
        status: data.scheduledFor ? 'scheduled' : 'sending',
        createdAt: new Date().toISOString(),
        connectionId: data.connectionId,
        scheduledFor: data.scheduledFor,
        stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 }
      };
    }
  },
  
  ai: {
    generateInsight: async (context: 'chat' | 'kanban', data: any): Promise<AIInsight[]> => {
      await delay(1500); // Simulate thinking
      if (context === 'chat') {
        return [
          { type: 'sentiment', content: 'O cliente demonstra interesse, mas está cauteloso sobre valores. Tom amigável.', confidence: 0.9 },
          { type: 'suggestion', content: 'Sugira uma demonstração gratuita para aumentar a confiança.', confidence: 0.85 },
          { type: 'risk', content: 'Risco de objeção de preço detectado. Prepare argumentos de ROI.', confidence: 0.7 }
        ];
      }
      return [
        { type: 'crm_action', content: 'Este lead está estagnado em "Novo Lead" há 3 dias. Sugiro contato urgente.', confidence: 0.95 }
      ];
    }
  }
};