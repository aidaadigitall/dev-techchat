// services/whatsapp.ts
import { WhatsAppConfig, MessageType } from '../types';
import { supabase } from './supabase';

// Types for WhatsApp Status
export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'authenticating' | 'connected';

type EventHandler = (data: any) => void;

class WhatsAppService {
  private status: WhatsAppStatus = 'disconnected';
  private qrCode: string | null = null; // Base64 string
  private eventListeners: Map<string, EventHandler[]> = new Map();
  private logs: string[] = [];
  
  // Configuration (Updated defaults based on user screenshot)
  private config: WhatsAppConfig = {
    apiUrl: localStorage.getItem('wa_api_url') || 'http://localhost:8083',
    apiKey: localStorage.getItem('wa_api_key') || '429683C4C977415CAAFCCE10F7D57E11',
    instanceName: localStorage.getItem('wa_instance_name') || 'Whats-1248'
  };

  constructor() {
    // Initialize
  }

  // --- Public API ---

  public updateConfig(newConfig: Partial<WhatsAppConfig>) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('wa_api_url', this.config.apiUrl);
    localStorage.setItem('wa_api_key', this.config.apiKey);
    localStorage.setItem('wa_instance_name', this.config.instanceName);
    this.addLog('Configurações da API atualizadas.');
  }

  public getStatus(): WhatsAppStatus {
    return this.status;
  }

  public getQrCode(): string | null {
    return this.qrCode;
  }

  public getLogs(): string[] {
    return this.logs;
  }

  // --- Real Connection Logic (Evolution API v2) ---

  public async connect(): Promise<void> {
    if (!this.config.apiUrl || !this.config.apiKey) {
      this.addLog('ERRO: URL da API ou Chave de API não configurada.');
      return;
    }

    this.updateStatus('connecting');
    this.logs = [];
    this.addLog(`Conectando à instância: ${this.config.instanceName}...`);
    
    try {
      // 1. Check if instance exists and is connected
      const instanceState = await this.fetchApi(`/instance/connectionState/${this.config.instanceName}`);
      
      const state = instanceState?.instance?.state || instanceState?.state;

      if (state === 'open') {
         this.updateStatus('connected');
         this.addLog('Instância conectada! Iniciando sincronização de conversas...');
         this.syncHistory(); // Start pulling data
         return;
      }

      // If not connected, try to connect/create
      await this.createInstance();
      await this.fetchQrCode();

    } catch (error: any) {
      this.addLog(`Erro ao conectar: ${error.message}`);
      // Fallback: assume disconnected but let user retry
      this.updateStatus('disconnected');
    }
  }

  // --- Active Sync (Fetches Chats/Messages from API to Supabase) ---
  public async syncHistory() {
      try {
          this.addLog('Buscando conversas recentes...');
          // 1. Fetch Chats
          const chats = await this.fetchApi(`/chat/findChats/${this.config.instanceName}`);
          
          if (Array.isArray(chats)) {
              this.addLog(`${chats.length} conversas encontradas. Sincronizando...`);
              
              for (const chat of chats) {
                  // Save Contact to Supabase
                  await this.upsertContact(chat);
                  
                  // 2. Fetch Messages for this chat (limit 20)
                  // Note: Evolution API endpoint might vary slightly by version, using common v2 path
                  try {
                      const messages = await this.fetchApi(`/chat/findMessages/${this.config.instanceName}/${chat.id}?count=20`);
                      if (Array.isArray(messages)) {
                          for (const msg of messages) {
                              await this.upsertMessage(chat.id, msg);
                          }
                      }
                  } catch (err) {
                      console.warn(`Erro ao buscar mensagens para ${chat.id}`, err);
                  }
              }
              this.addLog('Sincronização concluída.');
          }
      } catch (error: any) {
          this.addLog(`Erro na sincronização: ${error.message}`);
      }
  }

  private async upsertContact(chatData: any) {
      // remoteJid is the ID in Evolution
      const contactId = chatData.id; 
      const name = chatData.name || chatData.pushName || chatData.id.split('@')[0];
      const picture = chatData.profilePictureUrl || null;
      
      // Upsert into Supabase
      const { error } = await supabase.from('contacts').upsert({
          phone: contactId.split('@')[0], // Extract number
          name: name,
          avatar_url: picture,
          last_message_at: new Date().toISOString(), // Update recency
          status: 'open',
          source: 'WhatsApp Sync'
      }, { onConflict: 'phone' });

      if (error && error.code !== '23505') { // Ignore unique constraint if handled
          console.error('Error syncing contact:', error);
      }
  }

  private async upsertMessage(contactId: string, msgData: any) {
      // Map Evolution Message to Supabase Schema
      const { data: contact } = await supabase.from('contacts').select('id').eq('phone', contactId.split('@')[0]).single();
      
      if (!contact) return; // Can't link message without contact

      const isFromMe = msgData.key?.fromMe || false;
      const content = msgData.message?.conversation || msgData.message?.extendedTextMessage?.text || msgData.content || '';
      const msgType = msgData.messageType === 'imageMessage' ? MessageType.IMAGE : MessageType.TEXT; // Simplification
      
      const payload = {
          contact_id: contact.id,
          content: content,
          sender_id: isFromMe ? 'me' : contact.id,
          type: msgType,
          status: 'read',
          created_at: new Date(msgData.messageTimestamp * 1000).toISOString()
      };

      // Check if message exists (by simple content/time heuristic if no ID match)
      // For a robust system, store the external WA ID.
      await supabase.from('messages').insert(payload);
  }

  private async createInstance() {
    this.addLog('Verificando instância...');
    try {
        // Try creating. If exists, it might throw or return existing.
        await this.fetchApi('/instance/create', 'POST', {
            instanceName: this.config.instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        });
    } catch (e) {
        // Usually safe to ignore "Instance already exists"
    }
  }

  private async fetchQrCode() {
    this.addLog('Solicitando Sessão...');
    try {
        const response = await this.fetchApi(`/instance/connect/${this.config.instanceName}`);
        
        if (response && response.base64) {
            this.qrCode = response.base64;
            this.updateStatus('qr_ready');
            this.emit('qr', this.qrCode);
            this.addLog('QR Code recebido. Aguardando leitura...');
            this.startStatusPolling();
        } else if (response?.instance?.state === 'open') {
            this.updateStatus('connected');
            this.addLog('Conectado automaticamente.');
            this.syncHistory();
        } else {
             // Fallback for older versions
             if (response?.base64 || response?.qrcode?.base64) {
                 this.qrCode = response.base64 || response.qrcode.base64;
                 this.updateStatus('qr_ready');
                 this.emit('qr', this.qrCode);
                 this.startStatusPolling();
             }
        }
    } catch (error: any) {
        this.addLog(`Erro ao buscar QR: ${error.message}`);
    }
  }

  private statusInterval: any = null;

  private startStatusPolling() {
      if (this.statusInterval) clearInterval(this.statusInterval);
      
      this.statusInterval = setInterval(async () => {
          if (this.status === 'connected') {
              clearInterval(this.statusInterval);
              return;
          }

          try {
              const res = await this.fetchApi(`/instance/connectionState/${this.config.instanceName}`);
              const state = res?.instance?.state || res?.state;
              
              if (state === 'open') {
                  this.updateStatus('connected');
                  this.addLog('Dispositivo conectado com sucesso!');
                  this.qrCode = null;
                  this.emit('qr', null);
                  this.syncHistory(); // Trigger sync
                  clearInterval(this.statusInterval);
              }
          } catch (e) {
              // Ignore polling errors
          }
      }, 3000);
  }

  public async disconnect(): Promise<void> {
    if (this.statusInterval) clearInterval(this.statusInterval);
    
    try {
        this.addLog('Desconectando instância...');
        await this.fetchApi(`/instance/logout/${this.config.instanceName}`, 'DELETE');
        this.updateStatus('disconnected');
        this.qrCode = null;
        this.emit('qr', null);
        this.addLog('Desconectado.');
    } catch (e: any) {
        this.addLog(`Erro ao desconectar: ${e.message}`);
    }
  }

  // --- Helper: Fetch Wrapper ---
  private async fetchApi(endpoint: string, method: string = 'GET', body?: any) {
      if (!this.config.apiUrl) throw new Error("URL da API não definida");
      
      // Clean URL (remove trailing slash)
      const baseUrl = this.config.apiUrl.replace(/\/$/, "");
      
      const headers: any = {
          'Content-Type': 'application/json',
          'apikey': this.config.apiKey
      };

      const res = await fetch(`${baseUrl}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined
      });

      if (!res.ok) {
          // If 404, it might mean instance not found or endpoint diff
          const text = await res.text();
          try {
              const json = JSON.parse(text);
              throw new Error(json.message || json.error || res.statusText);
          } catch(e) {
              throw new Error(text || res.statusText);
          }
      }

      return res.json();
  }

  public async sendMessage(to: string, content: string): Promise<void> {
      if (this.status !== 'connected') {
          console.warn('WhatsApp não conectado. Tentando reconexão rápida...');
          await this.connect(); // Try to auto-reconnect if session exists but state is stale
      }
      
      this.addLog(`Enviando mensagem para ${to}...`);
      
      // Get the correct number format (remoteJid)
      // Evolution usually expects number@s.whatsapp.net. 
      // If we have just the number, append the suffix.
      const remoteJid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

      try {
          await this.fetchApi('/message/sendText/' + this.config.instanceName, 'POST', {
              number: remoteJid,
              options: {
                  delay: 1200,
                  presence: "composing",
                  linkPreview: false
              },
              textMessage: {
                  text: content
              }
          });
          this.addLog('Mensagem enviada via API.');
      } catch (e: any) {
          this.addLog(`Erro ao enviar mensagem: ${e.message}`);
          throw e;
      }
  }

  // --- Event Handling System ---

  public on(event: 'status' | 'qr' | 'message' | 'typing' | 'log', handler: EventHandler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(handler);
  }

  public off(event: 'status' | 'qr' | 'message' | 'typing' | 'log', handler: EventHandler) {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      this.eventListeners.set(event, handlers.filter(h => h !== handler));
    }
  }

  // --- Private Helpers ---

  private updateStatus(newStatus: WhatsAppStatus) {
    this.status = newStatus;
    this.emit('status', newStatus);
  }

  private addLog(message: string) {
    const log = `> ${message}`;
    this.logs.push(log);
    this.emit('log', log);
  }

  private emit(event: string, data: any) {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}

export const whatsappService = new WhatsAppService();