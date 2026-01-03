
import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { WhatsappService } from '../services/whatsapp.service';

const redisConnection = {
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT)
};

export const messageQueue = new Queue('whatsapp-send', { connection: redisConnection });

// Worker: Processa o envio
const worker = new Worker('whatsapp-send', async (job) => {
    const { instanceName, to, content, type, engine } = job.data;
    
    // Instancia o serviço
    const service = new WhatsappService();
    
    // Delay randômico anti-ban (simulado aqui, mas BullMQ tem rate limit nativo)
    const delay = Math.floor(Math.random() * (6000 - 2000 + 1) + 2000); // 2s a 6s
    await new Promise(resolve => setTimeout(resolve, delay));

    console.log(`[Queue] Envia msg para ${to} via ${engine || 'default'}`);
    
    await service.sendInternal(instanceName, to, content, type, engine);

}, { 
    connection: redisConnection,
    limiter: {
        max: 30, // Max 30 mensagens
        duration: 60000 // Por minuto
    }
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
    // Aqui podemos implementar lógica para pausar instância se erro for 429 (Too Many Requests)
});
