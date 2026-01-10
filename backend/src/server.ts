
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

// 1. CORS for Production
app.register(cors, {
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
});

// 2. JWT Config
app.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret_saas_key_change_me'
});

app.decorate("authenticate", async function(request: any, reply: any) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.code(401).send({ error: "Unauthorized" });
    }
});

// 3. Register Routes
console.log('🔄 Registering Modules...');
app.register(saasRoutes, { prefix: '/api/saas' });
app.register(whatsappRoutes, { prefix: '/api/whatsapp' });
app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(aiRoutes, { prefix: '/api/ai' });
app.register(contactRoutes, { prefix: '/api/contacts' });

app.get('/health', async () => ({ 
    status: 'online', 
    env: process.env.NODE_ENV,
    host: 'apitechchat.escsistemas.com'
}));

const start = async () => {
    try {
        const port = parseInt(env.PORT || '3000');
        // IMPORTANT: Listen on 0.0.0.0 for Docker
        await app.listen({ port, host: '0.0.0.0' });
        
        console.log(`
🚀 SAAS BACKEND READY
-----------------------------------------
🔌 Port: ${port}
🔑 JWT: Loaded
📡 Routes: /api/saas/* registered
🌍 URL: ${env.API_BASE_URL}
-----------------------------------------
        `);
    } catch (err) {
        app.log.error(err);
        (process as any).exit(1);
    }
};

start();
