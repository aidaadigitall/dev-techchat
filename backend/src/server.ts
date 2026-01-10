
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { saasRoutes } from './routes/saas.routes';
import { whatsappRoutes } from './routes/whatsapp.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { aiRoutes } from './routes/ai.routes';
import { contactRoutes } from './routes/contact.routes';

const app = Fastify({ logger: true });

// 1. Configuração de CORS (Permissivo para evitar bloqueios na VPS)
app.register(cors, {
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
});

// 2. Registrar JWT
app.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret_saas_key_change_me'
});

// 3. Decorator de Autenticação
app.decorate("authenticate", async function(request: any, reply: any) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.code(401).send({ error: "Unauthorized" });
    }
});

// 4. Registrar Rotas
// --- CAMADA SAAS (CORE) ---
console.log('🔄 Carregando Módulo SaaS...');
app.register(saasRoutes, { prefix: '/api/saas' });

// --- Módulos Funcionais ---
app.register(whatsappRoutes, { prefix: '/api/whatsapp' });
app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(aiRoutes, { prefix: '/api/ai' });
app.register(contactRoutes, { prefix: '/api/contacts' });

// Healthcheck Global
app.get('/health', async () => {
    return { 
        status: 'online', 
        service: 'tech-chat-backend',
        environment: process.env.NODE_ENV, 
        timestamp: new Date() 
    };
});

const start = async () => {
    try {
        // Bind em 0.0.0.0 é obrigatório para Docker
        const port = parseInt(env.PORT || '3000');
        await app.listen({ port, host: '0.0.0.0' });
        
        console.log(`
🚀 SERVER RUNNING ON PORT ${port}
--------------------------------------------------
✅ SaaS Routes Loaded:
   POST /api/saas/auth/login
   POST /api/saas/auth/register
   GET  /api/saas/tenants
   GET  /api/saas/metrics
--------------------------------------------------
🌍 External URL: ${env.API_BASE_URL || 'http://localhost:3000'}
        `);
    } catch (err) {
        app.log.error(err);
        (process as any).exit(1);
    }
};

start();
