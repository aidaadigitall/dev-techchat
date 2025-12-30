// services/whatsapp.ts

// Types for WhatsApp Status
export type WhatsAppStatus = 'disconnected' | 'connecting' | 'connected' | 'qr_ready';

type EventHandler = (data: any) => void;

class WhatsAppService {
  private status: WhatsAppStatus = 'disconnected';
  private qrCode: string | null = null;
  private eventListeners: Map<string, EventHandler[]> = new Map();
  private connectionInterval: number | null = null;

  constructor() {
    // Initialize mocks or listeners
  }

  // --- Public API ---

  public getStatus(): WhatsAppStatus {
    return this.status;
  }

  public getQrCode(): string | null {
    return this.qrCode;
  }

  public connect(): void {
    if (this.status === 'connected') return;

    this.updateStatus('connecting');
    
    // Simulate Fetching QR Code from Backend (e.g., Baileys/WPPConnect)
    setTimeout(() => {
      this.qrCode = 'https://chart.googleapis.com/chart?cht=qr&chl=SimulatedWhatsAppConnection&chs=250x250&chld=L|0';
      this.updateStatus('qr_ready');
      this.emit('qr', this.qrCode);

      // Simulate user scanning the code after 5-15 seconds
      this.startConnectionSimulation();
    }, 1500);
  }

  public disconnect(): void {
    if (this.connectionInterval) clearInterval(this.connectionInterval);
    this.updateStatus('disconnected');
    this.qrCode = null;
  }

  // --- Event Handling ---

  public on(event: 'status' | 'qr' | 'message', handler: EventHandler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(handler);
  }

  public off(event: 'status' | 'qr' | 'message', handler: EventHandler) {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      this.eventListeners.set(event, handlers.filter(h => h !== handler));
    }
  }

  // --- Private Helpers (Simulating Backend Logic) ---

  private updateStatus(newStatus: WhatsAppStatus) {
    this.status = newStatus;
    this.emit('status', newStatus);
  }

  private emit(event: string, data: any) {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  private startConnectionSimulation() {
    // This simulates the waiting period for the user to scan the QR
    // In a real app, a WebSocket event would trigger this.
    const waitTime = Math.random() * 5000 + 3000; // 3-8 seconds
    
    this.connectionInterval = window.setTimeout(() => {
      // Simulate success
      this.qrCode = null;
      this.updateStatus('connected');
    }, 8000); 
  }
}

export const whatsappService = new WhatsAppService();
