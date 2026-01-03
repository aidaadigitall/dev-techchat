
import { FastifyInstance } from 'fastify';
import { WhatsappService } from '../services/whatsapp.service';
import { messageQueue } from '../queues/message.queue';
import { supabaseAdmin } from '../lib/supabase';

export async function whatsappRoutes(app: FastifyInstance) {
    const service = new WhatsappService();

    // Middleware de Auth (Simplificado para o exemplo, usar JWT validation real)
    app.addHook('preHandler', async (req, reply) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) return reply.code(401).send({ error: 'Unauthorized' });
        // Validar token do Supabase aqui
    });

    app.post('/instances', async (req: any, reply) => {
        const { name, engine = 'whatsmeow' } = req.body;
        // Mock: extrair company_id do token JWT
        const companyId = req.user?.company_id || req.body.company_id; 
        
        const result = await service.createConnection(companyId, name, engine);
        return result;
    });

    app.post('/instances/:id/connect', async (req: any, reply) => {
        const result = await service.connect(req.params.id);
        return result;
    });

    app.post('/send', async (req: any, reply) => {
        const { connectionId, to, content, type = 'text' } = req.body;
        
        // Buscar detalhes da conexão para saber a engine e instance_key
        const { data: conn } = await supabaseAdmin
            .from('whatsapp_connections')
            .select('instance_key, engine')
            .eq('id', connectionId)
            .single();

        if (!conn) return reply.code(404).send({ error: 'Connection not found' });

        // Adicionar na Fila BullMQ (Anti-ban logic happens inside worker)
        await messageQueue.add('send-message', {
            instanceName: conn.instance_key,
            to,
            content,
            type,
            engine: conn.engine
        });

        // Salvar mensagem no banco como 'sending'
        // ... (Logica de insert na tabela messages)

        return { success: true, status: 'queued' };
    });
}
