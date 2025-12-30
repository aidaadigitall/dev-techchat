// sdk/agent.ts
import { Message, MessageType } from '../types';

// --- Interfaces ---

export interface AgentContext {
  chatId: string;
  senderName: string;
  senderPhone: string;
  history: Message[];
  // Methods available to the agent
  reply: (content: string) => Promise<void>;
  replyImage: (url: string, caption?: string) => Promise<void>;
  addTag: (tag: string) => Promise<void>;
  transferToSector: (sectorId: string) => Promise<void>;
}

export interface IAgent {
  id: string;
  name: string;
  trigger: string | RegExp; // Command or Regex to trigger the agent
  onMessage: (message: Message, context: AgentContext) => Promise<void>;
}

// --- Base Class for Implementation ---

export abstract class BaseAgent implements IAgent {
  id: string;
  name: string;
  trigger: string | RegExp;

  constructor(id: string, name: string, trigger: string | RegExp = '') {
    this.id = id;
    this.name = name;
    this.trigger = trigger;
  }

  // Abstract method that developer must implement
  abstract onMessage(message: Message, context: AgentContext): Promise<void>;

  // Helper to check if message triggers this agent
  shouldRun(messageContent: string): boolean {
    if (!this.trigger) return true; // Always run if no trigger
    if (this.trigger instanceof RegExp) {
      return this.trigger.test(messageContent);
    }
    return messageContent.toLowerCase().includes(this.trigger.toLowerCase());
  }
}

// --- Example Implementation (Mock) ---

export class SupportAgent extends BaseAgent {
  constructor() {
    super('support_bot_v1', 'Suporte Nível 1', 'ajuda');
  }

  async onMessage(message: Message, context: AgentContext) {
    console.log(`[Agent ${this.name}] Processing message from ${context.senderName}`);
    
    if (message.content.includes('financeiro')) {
      await context.reply('Estou transferindo você para o setor financeiro. Um momento.');
      await context.transferToSector('financeiro');
    } else if (message.content.includes('preço')) {
        await context.reply('Nossos planos começam a partir de R$ 199,90. Gostaria de ver uma tabela?');
    } else {
      await context.reply(`Olá ${context.senderName}, sou o assistente virtual. Como posso ajudar? (Digite "financeiro" ou "preço")`);
    }
  }
}
