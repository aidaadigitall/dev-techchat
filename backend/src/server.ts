
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { saasRoutes } from './routes/saas.routes';
// Importar outras rotas conforme necessário (whatsapp, webhooks, etc) mantendo a estrutura existente
import { whatsappRoutes } from './routes/whatsapp.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { aiRoutes } from './routes/ai.routes';
import { contactRoutes } from './routes/contact.routes';

const app = Fastify({ logger: true });

// 1. Configuração de CORS (Permissivo para evitar bloqueios na VPS)
app.register(cors, {
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
        reply.send(err);
    }
});

// 4. Registrar Rotas
// Rotas funcionais do sistema
app.register(whatsappRoutes, { prefix: '/api/whatsapp' });
app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(aiRoutes, { prefix: '/api/ai' });
app.register(contactRoutes, { prefix: '/api/contacts' });

// === ROTA CRÍTICA: SAAS ===
console.log('🔄 Registrando rotas SaaS em /api/saas ...');
app.register(saasRoutes, { prefix: '/api/saas' });

// Healthcheck Global
app.get('/health', async () => {
    return { 
        status: 'online', 
        environment: process.env.NODE_ENV, 
        timestamp: new Date() 
    };
});

const start = async () => {
    try {
        // Bind em 0.0.0.0 é obrigatório para Docker
        await app.listen({ port: parseInt(env.PORT || '3000'), host: '0.0.0.0' });
        
        console.log(`
🚀 SERVER RUNNING ON PORT ${env.PORT}
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