// services/whatsapp.ts
import { WhatsAppConfig } from '../types';

// Types for WhatsApp Status
export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'authenticating' | 'connected';

type EventHandler = (data: any) => void;

class WhatsAppService {
  private status: WhatsAppStatus = 'disconnected';
  private qrCode: string | null = null; // Base64 string
  private eventListeners: Map<string, EventHandler[]> = new Map();
  private logs: string[] = [];
  
  // Configuration (defaults to local Docker Evolution API)
  private config: WhatsAppConfig = {
    apiUrl: localStorage.getItem('wa_api_url') || 'http://localhost:8083',
    apiKey: localStorage.getItem('wa_api_key') || '429683C4C977415CAAFCCE10F7D57E11',
    instanceName: localStorage.getItem('wa_instance_name') || 'TechChat_01'
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
      this.addLog('Vá em Configurações > Conexões para configurar a Evolution API.');
      return;
    }

    this.updateStatus('connecting');
    this.logs = [];
    this.addLog(`Iniciando conexão com Evolution API em: ${this.config.apiUrl}`);
    
    try {
      // 1. Check if instance exists, if not create
      this.addLog('Verificando status da instância...');
      const instanceState = await this.fetchApi(`/instance/connectionState/${this.config.instanceName}`);
      
      if (instanceState && instanceState.instance && instanceState.instance.state === 'open') {
         this.updateStatus('connected');
         this.addLog('Instância já está conectada!');
         return;
      }

      // If fetch failed or instance doesn't exist, try to create/connect
      await this.createInstance();
      await this.fetchQrCode();

    } catch (error: any) {
      this.addLog(`Erro ao conectar: ${error.message}`);
      this.updateStatus('disconnected');
    }
  }

  private async createInstance() {
    this.addLog('Criando/Reiniciando instância...');
    // Create instance call (Evolution API specific)
    try {
        await this.fetchApi('/instance/create', 'POST', {
            instanceName: this.config.instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        });
    } catch (e) {
        // Ignore error if instance already exists
        this.addLog('Instância já existente ou erro na criação (prosseguindo).');
    }
  }

  private async fetchQrCode() {
    this.addLog('Solicitando QR Code...');
    try {
        const response = await this.fetchApi(`/instance/connect/${this.config.instanceName}`);
        
        if (response && response.base64) {
            this.qrCode = response.base64;
            this.updateStatus('qr_ready');
            this.emit('qr', this.qrCode);
            this.addLog('QR Code recebido. Aguardando leitura...');
            
            // Start polling for connection status
            this.startStatusPolling();
        } else if (response && response.instance && response.instance.state === 'open') {
            this.updateStatus('connected');
            this.addLog('Conectado automaticamente.');
        } else {
            // Fallback for some API versions
            this.qrCode = response?.code || response?.qrcode?.base64; 
            if(this.qrCode) {
                this.updateStatus('qr_ready');
                this.emit('qr', this.qrCode);
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
                  clearInterval(this.statusInterval);
              } else if (state === 'connecting') {
                  // Keep waiting
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
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || res.statusText);
      }

      return res.json();
  }

  // --- Real-time Simulation (Fallback or Webhook Handler) ---
  // In a real app, this would be replaced by a Socket.io client connected to Evolution API
  public simulateScan(): void {
      this.addLog('Simulação: Para conectar de verdade, use o App do WhatsApp para ler o QR Code.');
  }

  public async sendMessage(to: string, content: string): Promise<void> {
      if (this.status !== 'connected') {
          console.warn('WhatsApp não conectado. Mensagem não enviada para a API.');
          return;
      }
      
      this.addLog(`Enviando mensagem para ${to}...`);
      try {
          await this.fetchApi('/message/sendText/' + this.config.instanceName, 'POST', {
              number: to,
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