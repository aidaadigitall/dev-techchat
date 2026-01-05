
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env';
import { whatsappRoutes } from './routes/whatsapp.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { aiRoutes } from './routes/ai.routes';

const app = Fastify({ logger: true });

// Configuração de CORS para produção e desenvolvimento local
app.register(cors, {
    origin: [
        'https://tech.escsistemas.com', 
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Registrar Rotas
app.register(whatsappRoutes, { prefix: '/api/whatsapp' });
app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(aiRoutes, { prefix: '/api/ai' });

app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date() };
});

const start = async () => {
    try {
        await app.listen({ port: parseInt(env.PORT), host: '0.0.0.0' });
        console.log(`🚀 Backend Tech Chat running on port ${env.PORT}`);
    } catch (err) {
        app.log.error(err);
        (process as any).exit(1);
    }
};

start();
