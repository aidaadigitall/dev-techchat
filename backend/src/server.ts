
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { whatsappRoutes } from './routes/whatsapp.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { aiRoutes } from './routes/ai.routes';
import { contactRoutes } from './routes/contact.routes';
import { saasRoutes } from './routes/saas.routes';

const app = Fastify({ logger: true });

// Configuração de CORS
app.register(cors, {
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Registrar JWT
app.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret_saas_key_change_me'
});

// Decorator para proteger rotas
app.decorate("authenticate", async function(request: any, reply: any) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.send(err);
    }
});

// Registrar Rotas Principais
app.register(whatsappRoutes, { prefix: '/api/whatsapp' });
app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(aiRoutes, { prefix: '/api/ai' });
app.register(contactRoutes, { prefix: '/api/contacts' });

// Registrar Rotas SaaS (Camada Real)
app.register(saasRoutes, { prefix: '/saas' });

// Placeholders para evitar erros 404 no Frontend enquanto módulos não são implementados no backend
app.get('/api/tasks', async () => []);
app.post('/api/tasks', async (req, reply) => reply.code(201).send({ id: 'real_db_id', ...req.body as any }));
app.get('/api/crm/pipelines', async () => []); 

app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date() };
});

const start = async () => {
    try {
        await app.listen({ port: parseInt(env.PORT), host: '0.0.0.0' });
        console.log(`🚀 Backend Tech Chat running on port ${env.PORT}`);
        console.log(`✨ SaaS Module Loaded (Routes: /saas/tenants, /saas/users, /saas/login)`);
    } catch (err) {
        app.log.error(err);
        (process as any).exit(1);
    }
};

start();
