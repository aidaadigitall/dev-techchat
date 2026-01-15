
import { api } from './api';

// Types for WhatsApp Status
export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'authenticating' | 'connected';

type EventHandler = (data: any) => void;

class WhatsAppService {
  private activeInstance: any = null;
  private eventListeners: Map<string, EventHandler[]> = new Map();
  private logs: string[] = [];
  private pollingInterval: any = null;

  constructor() {
    //
  }

  // Connect to a specific connection saved in State
  public async setActiveConnection(connection: any) {
      if (this.pollingInterval) clearInterval(this.pollingInterval);
      
      this.activeInstance = connection;
      this.addLog(`Alternado para conexão: ${connection.name}`);
      
      this.updateLocalStatus(connection);

      // Start Polling for status updates (Alternative to Realtime)
      this.pollingInterval = setInterval(async () => {
          if (!this.activeInstance) return;
          try {
              // Fetch fresh list to find current instance
              const instances = await api.whatsapp.list();
              const fresh = instances.find((i: any) => i.id === this.activeInstance.id);
              if (fresh) {
                  // Check for status change or QR code update
                  if (fresh.status !== this.activeInstance.status || fresh.qrCode !== this.activeInstance.qrCode) {
                      this.activeInstance = fresh;
                      this.updateLocalStatus(fresh);
                  }
              }
          } catch (e) {
              console.error("Polling error", e);
          }
      }, 3000); // Poll every 3 seconds
  }

  private updateLocalStatus(connection: any) {
      if (connection.status === 'open' || connection.status === 'connected') {
          this.emit('status', 'connected');
          this.emit('qr', null);
      } else if (connection.status === 'qr_ready') {
          this.emit('status', 'qr_ready');
          // Note: Backend prisma uses camelCase 'qrCode', frontend types might vary. 
          // Adjust based on API response. Assuming API returns Prisma object directly.
          if (connection.qrCode) this.emit('qr', connection.qrCode);
      } else {
          this.emit('status', 'disconnected');
      }
  }

  public getStatus(): WhatsAppStatus {
    if (!this.activeInstance) return 'disconnected';
    if (this.activeInstance.status === 'open' || this.activeInstance.status === 'connected') return 'connected';
    return 'disconnected';
  }

  public getQrCode(): string | null {
    return this.activeInstance?.qrCode || null;
  }

  public getLogs(): string[] {
    return this.logs;
  }

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
        await api.whatsapp.delete(this.activeInstance.id); // Or logout endpoint
        this.emit('status', 'disconnected');
        this.addLog('Desconectado.');
    } catch (e: any) {
        this.addLog(`Erro ao desconectar: ${e.message}`);
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
