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
    apiKey: localStorage.getItem('wa_api_key') || '429683C4C977415CAAFCCE10F7D57E11',
    instanceName: localStorage.getItem('wa_instance_name') || 'Whats-6010'
  };

  constructor() {
    // Initialize
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
      this.addLog(`Estado atual: ${state || 'Desconhecido'}. Tentando criar/conectar...`);
      await this.createInstance();
      await this.fetchQrCode();

    } catch (error: any) {
      this.addLog(`Erro ao conectar: ${error.message}`);
      
      // Fallback Logic: If API is unreachable (localhost not running) or Not Found
      if (error.message.includes('Failed to fetch') || error.message.includes('not found') || error.message.includes('404')) {
          this.addLog('⚠️ API não detectada ou inacessível.');
          this.addLog('🔄 Ativando MODO SIMULAÇÃO para demonstração...');
          this.simulateFlow();
      } else {
          this.updateStatus('disconnected');
      }
    }
  }

  // --- Simulation Mode (Fallback) ---
  private simulateFlow() {
      // 1. Simulate QR Code Arriving
      setTimeout(() => {
          this.updateStatus('qr_ready');
          // Fake QR Code (Google Logo as placeholder or generic QR base64)
          // A generic QR base64 for visual feedback
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
          // 1. Fetch Chats (Evolution V2 usually returns recent chats with last message)
          const chats = await this.fetchApi(`/chat/findChats/${this.config.instanceName}`);
          
          if (Array.isArray(chats)) {
              for (const chat of chats) {
                  // Save Contact to Supabase
                  await this.upsertContact(chat);
                  
                  // For the active sync loop, we mainly care about updating the contact list
                  // and maybe the last message. To avoid rate limits, we don't fetch deep history
                  // for every chat every time, unless it's the initial sync.
                  
                  // If unread count > 0, fetch messages
                  if (chat.unreadCount > 0) {
                      await this.fetchChatMessages(chat.id);
                  }
              }
          }
      } catch (error: any) {
          console.warn(`Erro na sincronização silenciosa: ${error.message}`);
      }
  }

  // Separate method to fetch specific chat messages
  public async fetchChatMessages(chatId: string) {
      if (this.logs.some(l => l.includes('MODO SIMULAÇÃO'))) return;

      try {
          const messages = await this.fetchApi(`/chat/findMessages/${this.config.instanceName}/${chatId}?count=10`);
          if (Array.isArray(messages)) {
              for (const msg of messages) {
                  await this.upsertMessage(chatId, msg);
              }
          }
      } catch (err) {
          console.warn(`Erro ao buscar mensagens para ${chatId}`, err);
      }
  }

  // --- Auto Polling (Simulates Webhook) ---
  private startMessagePolling() {
      if (this.pollInterval) clearInterval(this.pollInterval);
      
      this.addLog('Iniciando verificação automática de novas mensagens (Polling)...');
      
      // Poll every 10 seconds to check for new messages
      this.pollInterval = setInterval(() => {
          if (this.status === 'connected') {
              this.syncHistory();
          } else {
              clearInterval(this.pollInterval);
          }
      }, 10000); 
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
          // Don't overwrite status if it exists, default to open for new
          status: 'open', 
          source: 'WhatsApp Sync'
      }, { onConflict: 'phone', ignoreDuplicates: false }); // We want to update last_message_at

      if (error && error.code !== '23505') { 
          console.error('Error syncing contact:', error);
      }
  }

  private async upsertMessage(contactId: string, msgData: any) {
      // Map Evolution Message to Supabase Schema
      const { data: contact } = await supabase.from('contacts').select('id').eq('phone', contactId.split('@')[0]).single();
      
      if (!contact) return; 

      const isFromMe = msgData.key?.fromMe || false;
      // Handle different message structures in Evolution API versions
      const content = msgData.message?.conversation || 
                      msgData.message?.extendedTextMessage?.text || 
                      msgData.content || 
                      (msgData.message?.imageMessage ? 'Imagem' : '');
                      
      const msgType = msgData.messageType === 'imageMessage' ? MessageType.IMAGE : MessageType.TEXT;
      
      // Prevent duplicates based on timestamp + content hash approximation or specific ID if stored
      const createdAt = new Date(msgData.messageTimestamp * 1000).toISOString();

      // Check if message exists to avoid duplicates
      const { data: existing } = await supabase.from('messages')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('content', content)
        .eq('created_at', createdAt)
        .single();

      if (!existing) {
          const payload = {
              contact_id: contact.id,
              content: content,
              sender_id: isFromMe ? 'me' : contact.id,
              type: msgType,
              status: 'read',
              created_at: createdAt
          };
          await supabase.from('messages').insert(payload);
      }
  }

  private async createInstance() {
    this.addLog('Tentando criar instância...');
    await this.fetchApi('/instance/create', 'POST', {
        instanceName: this.config.instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
    });
    this.addLog('Instância criada com sucesso.');
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
        this.addLog('Desconectando instância...');
        await this.fetchApi(`/instance/logout/${this.config.instanceName}`, 'DELETE');
        this.updateStatus('disconnected');
        this.qrCode = null;
        this.emit('qr', null);
        this.addLog('Desconectado.');
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
          'apikey': this.config.apiKey
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