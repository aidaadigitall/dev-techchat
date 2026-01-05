
// services/whatsapp.ts
import { WhatsAppConfig, MessageType } from '../types';
import { supabase } from './supabase';
import { api } from './api';

// Types for WhatsApp Status
export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'authenticating' | 'connected';

type EventHandler = (data: any) => void;

class WhatsAppService {
  private activeInstance: any = null;
  private eventListeners: Map<string, EventHandler[]> = new Map();
  private logs: string[] = [];
  private realtimeSubscription: any = null;

  constructor() {
    this.checkConnection();
  }

  // --- Helper to get Company ID ---
  private async getCompanyId(): Promise<string | null> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      return user.user_metadata?.company_id || null;
  }

  // --- Public API ---

  // Connect to a specific connection saved in DB
  public async setActiveConnection(connection: any) {
      if(this.realtimeSubscription) supabase.removeChannel(this.realtimeSubscription);
      
      this.activeInstance = connection;
      this.addLog(`Alternado para conexão: ${connection.name}`);
      
      // Update status immediately based on DB
      if (connection.status === 'open' || connection.status === 'connected') {
          this.emit('status', 'connected');
      } else if (connection.status === 'qr_ready') {
          this.emit('status', 'qr_ready');
          if (connection.qr_code) this.emit('qr', connection.qr_code);
      } else {
          this.emit('status', 'disconnected');
      }

      // Subscribe to changes for this connection (QR code updates, status updates)
      this.realtimeSubscription = supabase.channel(`whatsapp-${connection.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'whatsapp_connections', filter: `id=eq.${connection.id}` },
          (payload) => {
             const newData = payload.new;
             // Handle QR Code
             if (newData.qr_code && newData.status === 'qr_ready') {
                 this.emit('status', 'qr_ready');
                 this.emit('qr', newData.qr_code);
                 this.addLog('QR Code recebido via Realtime.');
             }
             // Handle Status
             if (newData.status === 'open' || newData.status === 'connected') {
                 this.emit('status', 'connected');
                 this.emit('qr', null); // Clear QR
                 this.addLog('Conexão estabelecida (Realtime).');
             }
             // Handle Disconnect
             if (newData.status === 'disconnected') {
                 this.emit('status', 'disconnected');
             }
          }
        )
        .subscribe();
  }

  public getStatus(): WhatsAppStatus {
    if (!this.activeInstance) return 'disconnected';
    if (this.activeInstance.status === 'open' || this.activeInstance.status === 'connected') return 'connected';
    return 'disconnected';
  }

  public getQrCode(): string | null {
    return this.activeInstance?.qr_code || null;
  }

  public getLogs(): string[] {
    return this.logs;
  }

  public async checkConnection(): Promise<void> {
      // Logic handled via Realtime and initial load in Settings.tsx
  }

  // --- Actions calling Proxy ---

  public async connect(): Promise<void> {
    if (!this.activeInstance) {
        this.addLog('Nenhuma conexão selecionada.');
        return;
    }

    this.emit('status', 'connecting');
    this.addLog(`Solicitando conexão para: ${this.activeInstance.name}...`);
    
    try {
        await api.whatsapp.connect(this.activeInstance.id);
        this.addLog('Solicitação enviada. Aguardando QR Code...');
    } catch (error: any) {
        this.addLog(`Erro ao conectar: ${error.message}`);
        this.emit('status', 'disconnected');
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.activeInstance) return;

    try {
        this.addLog('Desconectando...');
        await api.whatsapp.logout(this.activeInstance.id);
        this.emit('status', 'disconnected');
        this.addLog('Desconectado.');
    } catch (e: any) {
        this.addLog(`Erro ao desconectar: ${e.message}`);
    }
  }

  public async sendMessage(to: string, content: string): Promise<void> {
      // Note: This should ideally also go through the Proxy to keep API Key hidden.
      // For now, let's assume we implement 'send_message' action in proxy later 
      // OR rely on the existing DB trigger/webhook architecture where creating a message in 'messages' table triggers the sending.
      // But for this refactor, we are focusing on connection security.
      
      // Temporary: Just log, as the `api.chat.sendMessage` logic handles db insertion.
      // Real SaaS architecture usually has a Database Trigger on 'messages' table that calls Edge Function to send.
      console.log(`[WhatsAppService] Message queued for ${to}: ${content}`);
  }

  public async syncHistory() {
      // Sync is now handled by Webhook Receiver in Backend.
      this.addLog('Sincronização é automática via Webhook.');
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
