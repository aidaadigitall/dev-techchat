
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { saasRoutes } from './routes/saas.routes';
import { whatsappRoutes } from './routes/whatsapp.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { aiRoutes } from './routes/ai.routes';
import { contactRoutes } from './routes/contact.routes';

const app = Fastify({ 
    logger: true,
    trustProxy: true // Essencial para rodar atrás do Caddy
});

// 1. CORS Production-Ready
// Permite o domínio oficial e localhost para testes se necessário
app.register(cors, {
    origin: ['https://tech.escsistemas.com', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    credentials: true
});

// 2. JWT Configuração
app.register(jwt, {
    secret: process.env.JWT_SECRET || 'techchat_saas_production_secret_key_2024'
});

// Decorator para proteger rotas
app.decorate("authenticate", async function(request: any, reply: any) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.code(401).send({ error: "Unauthorized: Token inválido ou expirado" });
    }
});

// 3. Registro de Rotas (Ordem importa)
console.log('🚀 Inicializando Rotas do Sistema SaaS...');

// Rotas de Saúde (Health Check)
app.get('/health', async () => ({ 
    status: 'online', 
    environment: 'production',
    timestamp: new Date().toISOString()
}));

// Módulos
app.register(saasRoutes, { prefix: '/api/saas' });     // Auth, Tenants, Users
app.register(whatsappRoutes, { prefix: '/api/whatsapp' }); // Conexões
app.register(webhookRoutes, { prefix: '/webhooks' });      // Recebimento de msgs
app.register(aiRoutes, { prefix: '/api/ai' });             // IA
app.register(contactRoutes, { prefix: '/api/contacts' });  // CRM Contatos

const start = async () => {
    try {
        const port = parseInt(env.PORT || '3000');
        // IMPORTANTE: host: '0.0.0.0' é obrigatório para Docker
        await app.listen({ port, host: '0.0.0.0' });
        
        console.log(`
✅ BACKEND ONLINE
-----------------------------------------
🌍 URL: ${env.API_BASE_URL}
🔌 Porta: ${port}
🔐 JWT: Ativo
🐘 Database: Conectado (Pool)
-----------------------------------------
        `);
    } catch (err) {
        app.log.error(err);
        (process as any).exit(1);
    }
};

start();