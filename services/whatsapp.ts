
// services/whatsapp.ts

// Types for WhatsApp Status
export type WhatsAppStatus = 'disconnected' | 'connecting' | 'connected' | 'qr_ready';

type EventHandler = (data: any) => void;

class WhatsAppService {
  private status: WhatsAppStatus = 'disconnected';
  private qrCode: string | null = null;
  private eventListeners: Map<string, EventHandler[]> = new Map();
  private connectionInterval: number | null = null;
  private incomingMessageInterval: number | null = null;
  private logs: string[] = [];

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

  public getLogs(): string[] {
    return this.logs;
  }

  public connect(): void {
    if (this.status === 'connected') return;

    this.updateStatus('connecting');
    this.addLog('Iniciando instância do cliente...');
    this.addLog('Conectando ao servidor socket...');
    
    // Simulate Fetching QR Code from Backend (e.g., Baileys/WPPConnect)
    setTimeout(() => {
      // Usando api.qrserver.com que é confiável e gratuita
      this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TechChatAuth_${Date.now()}`;
      this.updateStatus('qr_ready');
      this.emit('qr', this.qrCode);
      this.addLog('QR Code gerado. Aguardando leitura...');

      // Simulate user scanning the code after 8 seconds
      this.startConnectionSimulation();
    }, 2000);
  }

  public disconnect(): void {
    if (this.connectionInterval) clearInterval(this.connectionInterval);
    if (this.incomingMessageInterval) clearInterval(this.incomingMessageInterval);
    this.updateStatus('disconnected');
    this.qrCode = null;
    this.logs = [];
    this.addLog('Sessão encerrada.');
  }

  // --- Messaging API (Simulated) ---

  public sendMessage(to: string, content: string): void {
      // In a real app, this would make an API call to the backend
      console.log(`[WhatsApp Service] Sending message to ${to}: ${content}`);
      
      // Simulate "Server Ack" or "Sent" status back to UI via event if needed
      // But usually the UI updates optimistically
  }

  // --- Event Handling ---

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

  // --- Private Helpers (Simulating Backend Logic) ---

  private updateStatus(newStatus: WhatsAppStatus) {
    this.status = newStatus;
    this.emit('status', newStatus);
  }

  private addLog(message: string) {
    const log = `[${new Date().toLocaleTimeString()}] ${message}`;
    this.logs.push(log);
    this.emit('log', log);
  }

  private emit(event: string, data: any) {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  private startConnectionSimulation() {
    // This simulates the waiting period for the user to scan the QR
    
    this.connectionInterval = window.setTimeout(() => {
      // Simulate success
      this.qrCode = null;
      this.updateStatus('connected');
      this.addLog('Autenticado com sucesso!');
      this.addLog('Sincronizando contatos e chats...');
      this.addLog('Pronto para uso.');
      
      // Start receiving messages after connection
      this.startIncomingMessageSimulation();
    }, 8000); // 8 seconds to connect (simulating scan time)
  }

  private startIncomingMessageSimulation() {
      // Simulate receiving a message every 30-60 seconds from a random contact
      // This mimics real-time socket events
      this.incomingMessageInterval = window.setInterval(() => {
          if (Math.random() > 0.7) { // 30% chance to receive
              // Simulate typing first
              const senderId = Math.random() > 0.5 ? 'c1' : 'c2'; // Elisa or Roberto
              
              this.emit('typing', { senderId });

              setTimeout(() => {
                  const possibleMessages = [
                      "Ok, combinado.",
                      "Vou verificar e te aviso.",
                      "Pode me enviar o PDF?",
                      "Obrigado pelo atendimento!",
                      "Qual o prazo de entrega?",
                      "Estou aguardando a proposta."
                  ];
                  const randomMsg = possibleMessages[Math.floor(Math.random() * possibleMessages.length)];
                  
                  this.emit('message', {
                      senderId: senderId,
                      content: randomMsg,
                      timestamp: new Date().toISOString()
                  });
              }, 3000); // Typing for 3 seconds
          }
      }, 15000); // Check loop every 15s
  }
}

export const whatsappService = new WhatsAppService();
