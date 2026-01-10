
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

// 1. Configuração de CORS
app.register(cors, {
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// 2. Registrar JWT (Essencial para SaaS)
app.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret_saas_key_change_me'
});

// 3. Decorator para proteger rotas (Auth Middleware)
app.decorate("authenticate", async function(request: any, reply: any) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.send(err);
    }
});

// 4. Registrar Rotas da Aplicação
app.register(whatsappRoutes, { prefix: '/api/whatsapp' });
app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(aiRoutes, { prefix: '/api/ai' });
app.register(contactRoutes, { prefix: '/api/contacts' });

// === REGISTRO DA CAMADA SAAS REAL ===
// Alterado para /api/saas para consistência
app.register(saasRoutes, { prefix: '/api/saas' });

// Rota padrão de saúde
app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date() };
});

const start = async () => {
    try {
        // Bind 0.0.0.0 para funcionar corretamente dentro do Docker
        await app.listen({ port: parseInt(env.PORT || '3000'), host: '0.0.0.0' });
        console.log(`🚀 Backend SaaS running on port ${env.PORT}`);
        console.log(`✅ Rotas SaaS ativas em: /api/saas/tenants e /api/saas/login`);
    } catch (err) {
        app.log.error(err);
        (process as any).exit(1);
    }
};

start();
