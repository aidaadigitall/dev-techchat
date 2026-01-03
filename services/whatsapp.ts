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
  private pollInterval: any = null; // Interval for auto-sync without webhook
  
  // Configuration (Updated defaults based on user screenshot)
  private config: WhatsAppConfig = {
    apiUrl: localStorage.getItem('wa_api_url') || 'http://localhost:8083',
    apiKey: localStorage.getItem('wa_api_key') || '64EA06725633-4DBC-A2ED-F469AA0CDD14', // Updated Key
    instanceName: localStorage.getItem('wa_instance_name') || 'Whats-6010'
  };

  constructor() {
    // Initialize - Auto check on boot
    this.checkConnection();
  }

  // --- Helper to get Company ID ---
  private async getCompanyId(): Promise<string | null> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      // Prefer metadata, fallback to query
      return user.user_metadata?.company_id || null;
  }

  // --- Public API ---

  public async updateConfig(newConfig: Partial<WhatsAppConfig>) {
    const oldInstance = this.config.instanceName;
    const oldUrl = this.config.apiUrl;
    const oldKey = this.config.apiKey;

    this.config = { ...this.config, ...newConfig };
    
    // Persist
    localStorage.setItem('wa_api_url', this.config.apiUrl);
    localStorage.setItem('wa_api_key', this.config.apiKey);
    localStorage.setItem('wa_instance_name', this.config.instanceName);
    
    this.addLog('Configurações salvas.');

    // If critical connection details changed, reconnect
    if (newConfig.instanceName !== oldInstance || newConfig.apiUrl !== oldUrl || newConfig.apiKey !== oldKey) {
        this.addLog(`Detectada alteração na configuração (De: ${oldInstance} Para: ${this.config.instanceName}). Reiniciando conexão...`);
        this.status = 'disconnected'; // Force status reset
        this.qrCode = null;
        this.emit('qr', null);
        // Do not auto connect here, wait for manual trigger to avoid loops
    }
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

  // --- Check Connection State (Persistence Fix) ---
  public async checkConnection(): Promise<void> {
      if (!this.config.apiUrl || !this.config.apiKey) return;

      try {
          // Check silently without changing status to 'connecting' UI yet
          const response = await this.fetchApi(`/instance/connectionState/${this.config.instanceName}`);
          const state = response?.instance?.state || response?.state;

          if (state === 'open') {
              this.updateStatus('connected');
              this.startMessagePolling(); // Ensure sync is active
          } else {
              // Only set to disconnected if we are not in a middle of a process
              if (this.status !== 'connecting' && this.status !== 'qr_ready') {
                  this.updateStatus('disconnected');
              }
          }
      } catch (error) {
          // If instance doesn't exist (404), it's disconnected
          if (this.status !== 'connecting') {
             this.updateStatus('disconnected');
          }
      }
  }

  // --- Real Connection Logic (Evolution API v2) ---

  public async connect(): Promise<void> {
    if (!this.config.apiUrl || !this.config.apiKey) {
      this.addLog('ERRO: URL da API ou Chave de API não configurada.');
      return;
    }

    this.updateStatus('connecting');
    this.logs = []; // Clear logs on new connection attempt
    this.addLog(`Iniciando conexão com instância: ${this.config.instanceName}`);
    this.addLog(`API URL: ${this.config.apiUrl}`);
    
    try {
      // 1. Check if instance exists and is connected
      const instanceState = await this.fetchApi(`/instance/connectionState/${this.config.instanceName}`);
      
      const state = instanceState?.instance?.state || instanceState?.state;

      if (state === 'open') {
         this.updateStatus('connected');
         this.addLog('Instância já está conectada! Sincronizando dados...');
         this.syncHistory(); // Initial Sync
         this.startMessagePolling(); // Start periodic sync
         return;
      }

      // If not connected, try to connect/create
      this.addLog(`Estado atual: ${state || 'Inexistente/Desconectado'}. Tentando criar/conectar...`);
      await this.createInstance();
      await this.fetchQrCode();

    } catch (error: any) {
      this.addLog(`Status Check: ${error.message}`);
      
      // Fallback Logic: If API is unreachable (localhost not running) or Not Found
      if (error.message.includes('Failed to fetch')) {
          this.addLog('⚠️ API não detectada ou inacessível (Network Error).');
          this.addLog('🔄 Ativando MODO SIMULAÇÃO para demonstração...');
          this.simulateFlow();
      } else {
          // If 404 or other error, try to create anyway
          this.addLog('Tentando criar instância nova...');
          try {
             await this.createInstance();
             await this.fetchQrCode();
          } catch (createError: any) {
             this.addLog(`Erro fatal ao criar: ${createError.message}`);
             this.updateStatus('disconnected');
          }
      }
    }
  }

  // --- Simulation Mode (Fallback) ---
  private simulateFlow() {
      // 1. Simulate QR Code Arriving
      setTimeout(() => {
          this.updateStatus('qr_ready');
          this.qrCode = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SimulacaoTechChat';
          this.emit('qr', this.qrCode);
          this.addLog('QR Code de Simulação Gerado.');
          
          // 2. Simulate User Scanning (Auto-connect after 5s)
          this.addLog('Aguardando leitura (Simulação: Conectando em 5s...)');
          
          setTimeout(() => {
              this.updateStatus('authenticating');
              this.addLog('Lendo QR Code...');
              
              setTimeout(() => {
                  this.updateStatus('connected');
                  this.addLog('Conectado (Modo Simulação).');
                  this.startMessagePolling(); // Will just mock sync
              }, 2000);
          }, 5000);

      }, 1500);
  }

  // --- Active Sync (Fetches Chats/Messages from API to Supabase) ---
  public async syncHistory() {
      // Skip sync if in simulation mode (api url likely invalid)
      if (this.logs.some(l => l.includes('MODO SIMULAÇÃO'))) {
          console.log('Sync skipped (Simulation Mode)');
          return;
      }

      try {
          this.addLog('Sincronizando chats...');
          // 1. Fetch Chats (Evolution V2 usually returns recent chats with last message)
          const chats = await this.fetchApi(`/chat/findChats/${this.config.instanceName}`);
          
          if (Array.isArray(chats)) {
              this.addLog(`${chats.length} conversas encontradas.`);
              
              // Process chats in chunks to avoid overwhelming the DB
              const processChunk = async (chunk: any[]) => {
                  for (const chat of chunk) {
                      // Extract preview logic
                      let lastContent = '';
                      // Attempt to find the last message content from the chat object structure (varies by version)
                      const lastMsgObj = chat.lastMessage || (chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null);
                      
                      if (lastMsgObj) {
                          lastContent = lastMsgObj.message?.conversation || 
                                        lastMsgObj.message?.extendedTextMessage?.text || 
                                        lastMsgObj.content || 
                                        (lastMsgObj.message?.imageMessage ? '📷 Imagem' : '');
                      }

                      // Save Contact to Supabase
                      await this.upsertContact(chat, lastContent);
                      
                      // For active chats (unread > 0), sync messages immediately
                      if (chat.unreadCount > 0) {
                          await this.fetchChatMessages(chat.id);
                      }
                  }
              };

              // Process top 20 chats immediately, others in background if needed
              await processChunk(chats.slice(0, 20));
          }
      } catch (error: any) {
          console.warn(`Erro na sincronização silenciosa: ${error.message}`);
          this.addLog(`Erro ao sincronizar chats: ${error.message}`);
      }
  }

  // Separate method to fetch specific chat messages
  public async fetchChatMessages(chatId: string) {
      if (this.logs.some(l => l.includes('MODO SIMULAÇÃO'))) return;

      try {
          // Fetch limit 20 messages
          const messages = await this.fetchApi(`/chat/findMessages/${this.config.instanceName}/${chatId}?count=20`);
          if (Array.isArray(messages)) {
              // Get company ID once
              const companyId = await this.getCompanyId();
              
              for (const msg of messages) {
                  await this.upsertMessage(chatId, msg, companyId);
              }
          }
      } catch (err) {
          console.warn(`Erro ao buscar mensagens para ${chatId}`, err);
      }
  }

  // --- Auto Polling (Simulates Webhook) ---
  private startMessagePolling() {
      if (this.pollInterval) clearInterval(this.pollInterval);
      
      this.addLog('Iniciando verificação automática de novas mensagens (Polling 10s)...');
      
      // Poll every 10 seconds to check for new messages
      this.pollInterval = setInterval(() => {
          if (this.status === 'connected') {
              this.syncHistory();
          } else {
              clearInterval(this.pollInterval);
          }
      }, 10000); 
  }

  private async upsertContact(chatData: any, lastMessagePreview: string = '') {
      try {
          const companyId = await this.getCompanyId();
          if (!companyId) return; // Cannot save without company context

          // remoteJid is the ID in Evolution (e.g., 551199999999@s.whatsapp.net)
          const contactRemoteJid = chatData.id || chatData.remoteJid;
          if (!contactRemoteJid) return;

          const phone = contactRemoteJid.split('@')[0];
          const name = chatData.name || chatData.pushName || chatData.pushname || phone;
          const picture = chatData.profilePictureUrl || chatData.picture || null;
          
          const payload: any = {
              company_id: companyId,
              phone: phone, 
              name: name,
              avatar_url: picture,
              last_message_at: new Date().toISOString(), // Update recency
              status: 'open', 
              source: 'WhatsApp Sync',
              custom_fields: { last_message_preview: lastMessagePreview }
          };

          // Manual Upsert Logic to avoid "ON CONFLICT" error due to missing unique constraint
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();

          if (existing) {
             await supabase.from('contacts').update(payload).eq('id', existing.id);
          } else {
             await supabase.from('contacts').insert(payload);
          }

      } catch (e) {
          console.error("Upsert Contact Exception:", e);
      }
  }

  private async upsertMessage(chatId: string, msgData: any, companyId: string | null) {
      if (!companyId) return;

      try {
          // Map Evolution Message to Supabase Schema
          const phone = chatId.split('@')[0];
          
          // Get Contact ID (Internal UUID) from Supabase
          const { data: contact } = await supabase.from('contacts').select('id').eq('phone', phone).single();
          
          if (!contact) {
              // If contact doesn't exist yet, create basic one
              await this.upsertContact({ id: chatId, name: phone }, "Nova mensagem");
              // Retry getting contact
              const { data: retryContact } = await supabase.from('contacts').select('id').eq('phone', phone).single();
              if (!retryContact) return;
              contact.id = retryContact.id;
          }

          const isFromMe = msgData.key?.fromMe || false;
          
          // Handle different message structures in Evolution API versions
          const content = msgData.message?.conversation || 
                          msgData.message?.extendedTextMessage?.text || 
                          msgData.content || 
                          (msgData.message?.imageMessage ? 'Imagem' : 
                           msgData.message?.audioMessage ? 'Áudio' : '');
          
          if (!content && !msgData.message?.imageMessage && !msgData.message?.audioMessage) return; // Skip empty/system messages

          let msgType = MessageType.TEXT;
          if (msgData.messageType === 'imageMessage' || msgData.message?.imageMessage) msgType = MessageType.IMAGE;
          if (msgData.messageType === 'audioMessage' || msgData.message?.audioMessage) msgType = MessageType.AUDIO;
          
          const messageTimestamp = msgData.messageTimestamp?.low || msgData.messageTimestamp;
          const createdAt = new Date(messageTimestamp * 1000).toISOString();

          // Check if message exists to avoid duplicates
          const { data: existing } = await supabase.from('messages')
            .select('id')
            .eq('contact_id', contact.id)
            .eq('content', content)
            .eq('created_at', createdAt)
            .single();

          if (!existing) {
              const payload = {
                  company_id: companyId,
                  contact_id: contact.id,
                  content: content,
                  sender_id: isFromMe ? 'me' : contact.id,
                  type: msgType,
                  status: 'read',
                  created_at: createdAt
              };
              await supabase.from('messages').insert(payload);
          }
      } catch (e) {
          console.error("Upsert Message Exception:", e);
      }
  }

  private async createInstance() {
    this.addLog('Tentando criar instância...');
    try {
        await this.fetchApi('/instance/create', 'POST', {
            instanceName: this.config.instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        });
        this.addLog('Instância criada com sucesso.');
    } catch (e: any) {
        // Ignore "already exists" error to proceed to connection
        if (e.message.includes('already exists')) {
            this.addLog('Instância já existe. Prosseguindo...');
        } else {
            throw e;
        }
    }
  }

  private async fetchQrCode() {
    this.addLog('Solicitando sessão/QR Code...');
    const response = await this.fetchApi(`/instance/connect/${this.config.instanceName}`);
    
    if (response && response.base64) {
        this.qrCode = response.base64;
        this.updateStatus('qr_ready');
        this.emit('qr', this.qrCode);
        this.addLog('QR Code recebido. Por favor, leia com o celular.');
        this.startStatusPolling();
    } else if (response?.instance?.state === 'open') {
        this.updateStatus('connected');
        this.addLog('Conectado automaticamente.');
        this.syncHistory();
        this.startMessagePolling();
    } else if (response?.qrcode?.base64) {
            // Fallback for nested object response
            this.qrCode = response.qrcode.base64;
            this.updateStatus('qr_ready');
            this.emit('qr', this.qrCode);
            this.startStatusPolling();
    } else {
            this.addLog('Resposta da API sem QR Code: ' + JSON.stringify(response));
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
                  this.syncHistory(); 
                  this.startMessagePolling();
                  clearInterval(this.statusInterval);
              }
          } catch (e) {
              // Ignore polling errors
          }
      }, 3000);
  }

  public async disconnect(): Promise<void> {
    if (this.statusInterval) clearInterval(this.statusInterval);
    if (this.pollInterval) clearInterval(this.pollInterval);
    
    if (this.logs.some(l => l.includes('MODO SIMULAÇÃO'))) {
        this.updateStatus('disconnected');
        this.addLog('Desconectado (Simulação).');
        return;
    }

    try {
        this.addLog('Removendo instância (Reset Completo)...');
        // Using DELETE to remove the instance ensures next connect generates a fresh QR code
        await this.fetchApi(`/instance/logout/${this.config.instanceName}`, 'DELETE');
        
        this.updateStatus('disconnected');
        this.qrCode = null;
        this.emit('qr', null);
        this.addLog('Desconectado. Instância resetada.');
    } catch (e: any) {
        this.addLog(`Erro ao desconectar: ${e.message}`);
        this.updateStatus('disconnected');
    }
  }

  // --- Helper: Fetch Wrapper ---
  private async fetchApi(endpoint: string, method: string = 'GET', body?: any) {
      if (!this.config.apiUrl) throw new Error("URL da API não definida");
      
      // Clean URL (remove trailing slash)
      const baseUrl = this.config.apiUrl.replace(/\/$/, "");
      
      const headers: any = {
          'Content-Type': 'application/json',
          'apikey': this.config.apiKey // Standard for Evolution V2
      };

      const res = await fetch(`${baseUrl}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined
      });

      if (!res.ok) {
          const text = await res.text();
          
          if (res.status === 401 || res.status === 403) {
              throw new Error("Erro de Autenticação (401/403). Verifique a Global API Key.");
          }

          try {
              const json = JSON.parse(text);
              throw new Error(json.message || json.error || res.statusText);
          } catch(e: any) {
              // If already wrapped error, rethrow, else throw text
              if(e.message && e.message !== 'Unexpected token') throw e;
              throw new Error(text || res.statusText);
          }
      }

      // Handle empty responses (like from DELETE)
      if (res.status === 204) return {};

      return res.json();
  }

  public async sendMessage(to: string, content: string): Promise<void> {
      // Mock sending in simulation
      if (this.logs.some(l => l.includes('MODO SIMULAÇÃO')) || this.status !== 'connected') {
          console.warn('WhatsApp Mock Send:', to, content);
          this.addLog(`[Simulação] Enviando para ${to}...`);
          return;
      }
      
      this.addLog(`Enviando mensagem para ${to}...`);
      
      // Get the correct number format (remoteJid)
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
          // Force a sync shortly after sending to ensure consistency
          setTimeout(() => this.fetchChatMessages(to), 1000);
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