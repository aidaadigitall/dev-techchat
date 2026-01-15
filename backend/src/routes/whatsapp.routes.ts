
import { FastifyInstance } from 'fastify';
import { WhatsappService } from '../services/whatsapp.service';
import { messageQueue } from '../queues/message.queue';
import { prisma } from '../lib/prisma';

export async function whatsappRoutes(app: FastifyInstance) {
    const service = new WhatsappService();

    // Middleware de Auth
    app.addHook('preHandler', async (req: any, reply) => {
        try {
            await req.jwtVerify();
        } catch (err) {
            reply.code(401).send({ error: "Unauthorized" });
        }
    });

    // Listar Instâncias
    app.get('/instances', async (req: any, reply) => {
        const tenantId = req.user.tenantId;
        const instances = await prisma.whatsappConnection.findMany({
            where: { tenantId }
        });
        return instances;
    });

    app.post('/instances', async (req: any, reply) => {
        const { name, engine = 'whatsmeow' } = req.body;
        const tenantId = req.user.tenantId;
        
        const result = await service.createConnection(tenantId, name, engine);
        return result;
    });

    app.delete('/instances/:id', async (req: any, reply) => {
        const { id } = req.params;
        // Todo: Adicionar lógica de desconexão no provider
        await prisma.whatsappConnection.delete({ where: { id } });
        return { success: true };
    });

    app.post('/instances/:id/connect', async (req: any, reply) => {
        const result = await service.connect(req.params.id);
        return result;
    });

    app.post('/send', async (req: any, reply) => {
        const { connectionId, to, content, type = 'text' } = req.body;
        
        // Busca conexão via Prisma
        const conn = await prisma.whatsappConnection.findUnique({
            where: { id: connectionId },
            select: { instanceKey: true, engine: true }
        });

        if (!conn) return reply.code(404).send({ error: 'Connection not found' });

        // Adicionar na Fila BullMQ
        await messageQueue.add('send-message', {
            instanceName: conn.instanceKey,
            to,
            content,
            type,
            engine: conn.engine
        });

        return { success: true, status: 'queued' };
    });
}
