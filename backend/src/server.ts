
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { whatsappRoutes } from './routes/whatsapp.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { aiRoutes } from './routes/ai.routes';
import { saasRoutes } from './routes/saas/index';

const app = Fastify({ logger: true });

// Configuração de CORS
app.register(cors, {
    origin: [
        'https://tech.escsistemas.com', 
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Registrar JWT (Use uma chave forte em produção)
app.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret_saas_key_change_me'
});

// Registrar Rotas Existentes
app.register(whatsappRoutes, { prefix: '/api/whatsapp' });
app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(aiRoutes, { prefix: '/api/ai' });

// Registrar NOVAS Rotas SaaS
app.register(saasRoutes, { prefix: '/saas' });

app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date() };
});

const start = async () => {
    try {
        await app.listen({ port: parseInt(env.PORT), host: '0.0.0.0' });
        console.log(`🚀 Backend Tech Chat running on port ${env.PORT}`);
        console.log(`✨ SaaS Module Loaded`);
    } catch (err) {
        app.log.error(err);
        (process as any).exit(1);
    }
};

start();
