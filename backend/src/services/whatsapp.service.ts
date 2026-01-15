
import { WhatsAppProvider } from './providers/WhatsAppProvider';
import { WhatsMeowProvider } from './providers/WhatsMeowProvider';
import { EvolutionProvider } from './providers/EvolutionProvider';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

export class WhatsappService {
    
    private getProvider(engine: 'whatsmeow' | 'evolution' = 'whatsmeow'): WhatsAppProvider {
        if (engine === 'evolution') {
            if (!env.EVOLUTION_API_URL) throw new Error("Evolution API not configured");
            return new EvolutionProvider();
        }
        return new WhatsMeowProvider();
    }

    // --- Métodos Públicos chamados pela API ---

    async createConnection(tenantId: string, name: string, engine: 'whatsmeow' | 'evolution') {
        // Gera um ID único para a instância
        const instanceKey = `inst_${tenantId.split('-')[0]}_${Date.now().toString(36)}`;
        const webhookUrl = `${env.API_BASE_URL}/webhooks/whatsapp/${instanceKey}`;

        const provider = this.getProvider(engine);
        await provider.createInstance(instanceKey, webhookUrl);

        // Salva no Banco via Prisma (tabela WhatsAppConnection deve existir no schema)
        // Caso a tabela não exista no schema atual, assumiremos que ela mapeia para 'whatsapp_connections'
        // Adaptando para o modelo Prisma padrão
        const connection = await prisma.whatsappConnection.create({
            data: {
                tenantId: tenantId,
                name: name,
                instanceKey: instanceKey,
                engine: engine,
                status: 'created'
            }
        });

        return connection;
    }

    async connect(connectionId: string) {
        // Busca dados da conexão via Prisma
        const conn = await prisma.whatsappConnection.findUnique({ where: { id: connectionId } });
        if (!conn) throw new Error("Conexão não encontrada");

        const provider = this.getProvider(conn.engine as any);
        const { qrcode, status } = await provider.connectInstance(conn.instanceKey);

        // Atualiza QR no banco via Prisma
        await prisma.whatsappConnection.update({
            where: { id: connectionId },
            data: {
                qrCode: qrcode,
                status: status
            }
        });

        return { qrcode, status };
    }

    // Método Interno usado pela FILA (Queue)
    async sendInternal(instanceKey: string, to: string, content: string, type: any, engine: any) {
        const provider = this.getProvider(engine);
        await provider.sendMessage(instanceKey, to, content, type);
    }
}
