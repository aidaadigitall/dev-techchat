
// services/whatsapp.ts
import { MOCK_CONTACTS } from '../constants';

// Types for WhatsApp Status
export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'authenticating' | 'connected';

type EventHandler = (data: any) => void;

class WhatsAppService {
  private status: WhatsAppStatus = 'disconnected';
  private qrCode: string | null = null;
  private eventListeners: Map<string, EventHandler[]> = new Map();
  
  // Timers
  private qrRefreshInterval: number | null = null;
  private incomingMessageInterval: number | null = null;
  
  private logs: string[] = [];

  constructor() {
    // Initialize
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

  // 1. Inicia o processo de conexão
  public connect(): void {
    if (this.status === 'connected' || this.status === 'authenticating') return;

    this.updateStatus('connecting');
    this.logs = []; // Limpa logs anteriores
    this.addLog('Inicializando cliente WPPConnect/Baileys...');
    this.addLog('Estabelecendo conexão segura (WebSocket)...');
    
    // Simula tempo de inicialização do backend
    setTimeout(() => {
      this.generateQrCode();
      // Inicia rotação do QR Code a cada 30s (como o real)
      this.qrRefreshInterval = window.setInterval(() => {
          if (this.status === 'qr_ready') {
              this.addLog('QR Code expirado. Gerando novo...');
              this.generateQrCode();
          }
      }, 30000);
    }, 1500);
  }

  // Gera um QR Code novo (simulado via API pública)
  private generateQrCode() {
      const sessionToken = `TechChat_${Date.now()}`;
      // Adicionamos timestamp para forçar atualização da imagem
      this.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${sessionToken}&bgcolor=ffffff&color=000000&margin=10`;
      
      this.updateStatus('qr_ready');
      this.emit('qr', this.qrCode);
      this.addLog('Aguardando leitura do QR Code pelo celular...');
  }

  // 2. Simula a ação do usuário ler o QR no celular
  public simulateScan(): void {
      if (this.status !== 'qr_ready') return;
      
      // Para a rotação do QR
      if (this.qrRefreshInterval) clearInterval(this.qrRefreshInterval);
      
      this.updateStatus('authenticating');
      this.qrCode = null; // Remove QR da tela
      this.emit('qr', null);
      
      this.addLog('QR Code detectado!');
      this.addLog('Descriptografando chaves de sessão...');
      
      // Simula processo de auth e sync
      setTimeout(() => {
          this.addLog('Autenticado com sucesso.');
          this.addLog('Sincronizando contatos (124 encontrados)...');
          this.addLog('Sincronizando chats (50 recentes)...');
      }, 1000);

      setTimeout(() => {
          this.updateStatus('connected');
          this.addLog('Conexão estabelecida. Serviço pronto.');
          this.startRealTimeSimulation();
      }, 3000);
  }

  // 3. Desconecta
  public disconnect(): void {
    this.stopAllIntervals();
    this.updateStatus('disconnected');
    this.qrCode = null;
    this.logs = [];
    this.addLog('Sessão encerrada pelo usuário.');
    this.addLog('Socket fechado.');
  }

  // --- Real-time Simulation ---

  private startRealTimeSimulation() {
      // Simula recebimento de mensagens a cada X segundos
      // Intervalo aleatório entre 10s e 25s para parecer natural
      const randomInterval = () => Math.floor(Math.random() * (25000 - 10000 + 1) + 10000);

      const loop = () => {
          if (this.status !== 'connected') return;

          // 30% de chance de receber mensagem
          if (Math.random() > 0.3) { 
              this.simulateIncomingMessage();
          }
          
          // Reagendar próximo loop
          this.incomingMessageInterval = window.setTimeout(loop, randomInterval());
      };

      loop();
  }

  private simulateIncomingMessage() {
      // Escolhe um contato aleatório dos mocks
      const randomContact = MOCK_CONTACTS[Math.floor(Math.random() * MOCK_CONTACTS.length)];
      
      // 1. Evento de "Digitando..."
      this.emit('typing', { senderId: randomContact.id });

      // 2. Envia a mensagem após alguns segundos
      setTimeout(() => {
          if (this.status !== 'connected') return;

          const possibleMessages = [
              "Olá, tudo bem?",
              "Pode me enviar o orçamento?",
              "Estou com uma dúvida sobre o contrato.",
              "Obrigado pelo atendimento!",
              "Qual o prazo de entrega?",
              "Gostei da proposta, vamos fechar?",
              "Aguardo seu retorno.",
              "👍",
              "Vocês emitem nota fiscal?"
          ];
          const randomMsg = possibleMessages[Math.floor(Math.random() * possibleMessages.length)];
          
          const messagePayload = {
              senderId: randomContact.id,
              content: randomMsg,
              timestamp: new Date().toISOString(),
              contactName: randomContact.name // Útil para notificações
          };

          this.emit('message', messagePayload);
          console.log(`[WhatsApp Sim] Msg recebida de ${randomContact.name}: ${randomMsg}`);
      }, 2500); 
  }

  public sendMessage(to: string, content: string): void {
      console.log(`[WhatsApp Sim] Enviando para ${to}: ${content}`);
      // Em um app real, aqui chamaria a API REST
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

  private stopAllIntervals() {
      if (this.qrRefreshInterval) clearInterval(this.qrRefreshInterval);
      if (this.incomingMessageInterval) clearTimeout(this.incomingMessageInterval);
  }
}

export const whatsappService = new WhatsAppService();
