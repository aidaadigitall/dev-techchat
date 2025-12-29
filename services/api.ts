import { Contact, Message, MessageType, KanbanColumn, Pipeline, Campaign, QuickReply, AIInsight, Task } from '../types';
import { supabase } from './supabase';

// Helper to handle Supabase errors
const handleError = (error: any) => {
  if (error) {
    console.error('Supabase Error:', error.message);
    throw error;
  }
};

export const api = {
  contacts: {
    list: async (): Promise<Contact[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true });
      
      handleError(error);
      return data as Contact[];
    },
    getById: async (id: string): Promise<Contact | undefined> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();
      
      handleError(error);
      return data as Contact;
    },
    create: async (data: Partial<Contact>): Promise<Contact> => {
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert([data])
        .select()
        .single();
      
      handleError(error);
      return newContact as Contact;
    },
    update: async (id: string, data: Partial<Contact>): Promise<Contact> => {
      const { data: updatedContact, error } = await supabase
        .from('contacts')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      handleError(error);
      return updatedContact as Contact;
    }
  },

  chat: {
    getMessages: async (contactId: string): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('timestamp', { ascending: true });
      
      handleError(error);
      return data as Message[];
    },
    sendMessage: async (contactId: string, content: string, type: MessageType = MessageType.TEXT): Promise<Message> => {
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([{
          contact_id: contactId,
          content,
          type,
          sender_id: 'me', // In a real app, this would be the logged-in user's ID
          status: 'sent',
          timestamp: new Date().toISOString()
        }])
        .select()
        .single();
      
      handleError(error);
      return newMessage as Message;
    },
    getQuickReplies: async (): Promise<QuickReply[]> => {
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*');
      
      handleError(error);
      return data as QuickReply[];
    }
  },

  tasks: {
    list: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });
      
      handleError(error);
      return data as Task[];
    },
    create: async (task: Partial<Task>): Promise<Task> => {
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert([task])
        .select()
        .single();
      
      handleError(error);
      return newTask as Task;
    },
    update: async (id: string, updates: Partial<Task>): Promise<Task> => {
      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      handleError(error);
      return updatedTask as Task;
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      handleError(error);
    }
  },

  crm: {
    getPipelines: async (): Promise<Pipeline[]> => {
      // This assumes a more complex structure where pipelines and columns are related
      const { data, error } = await supabase
        .from('pipelines')
        .select(`
          *,
          columns:kanban_columns(*)
        `);
      
      handleError(error);
      return data as Pipeline[];
    },
    moveCard: async (cardId: string, sourceColId: string, destColId: string) => {
      const { error } = await supabase
        .from('kanban_cards')
        .update({ column_id: destColId })
        .eq('id', cardId);
      
      handleError(error);
      return true;
    }
  },

  campaigns: {
    list: async (): Promise<Campaign[]> => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*');
      
      handleError(error);
      return data as Campaign[];
    },
    create: async (data: any): Promise<Campaign> => {
      const { data: newCampaign, error } = await supabase
        .from('campaigns')
        .insert([{
          name: data.name,
          status: data.scheduledFor ? 'scheduled' : 'sending',
          connection_id: data.connectionId,
          scheduled_for: data.scheduledFor,
          stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 }
        }])
        .select()
        .single();
      
      handleError(error);
      return newCampaign as Campaign;
    }
  },
  
  ai: {
    generateInsight: async (context: 'chat' | 'kanban', data: any): Promise<AIInsight[]> => {
      // AI insights would typically call an Edge Function or external API
      // For now, we keep the simulation but it could be integrated with Supabase Edge Functions
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (context === 'chat') {
        return [
          { type: 'sentiment', content: 'O cliente demonstra interesse, mas está cauteloso sobre valores.', confidence: 0.9 },
          { type: 'suggestion', content: 'Sugira uma demonstração gratuita.', confidence: 0.85 }
        ];
      }
      return [
        { type: 'crm_action', content: 'Lead estagnado há 3 dias. Sugiro contato.', confidence: 0.95 }
      ];
    }
  }
};
