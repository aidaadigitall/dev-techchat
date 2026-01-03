
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env';
import { whatsappRoutes } from './routes/whatsapp.routes';
import { webhookRoutes } from './routes/webhook.routes';

const app = Fastify({ logger: true });

app.register(cors, {
    origin: '*' // Configure domains in production
});

// Registrar Rotas
app.register(whatsappRoutes, { prefix: '/api/whatsapp' });
app.register(webhookRoutes, { prefix: '/webhooks' });

app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date() };
});

const start = async () => {
    try {
        await app.listen({ port: parseInt(env.PORT), host: '0.0.0.0' });
        console.log(`🚀 Backend Tech Chat running on port ${env.PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
