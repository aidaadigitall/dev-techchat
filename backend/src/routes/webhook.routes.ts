
import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';

export async function webhookRoutes(app: FastifyInstance) {
    
    app.post('/whatsapp/:instanceKey', async (req: any, reply) => {
        const { instanceKey } = req.params;
        const payload = req.body;

        console.log(`[Webhook] Event from ${instanceKey}`);

        // 1. Identificar Empresa dona da instância
        const conn = await prisma.whatsappConnection.findFirst({
            where: { instanceKey: instanceKey }
        });

        if (!conn) return reply.code(404).send({ error: 'Connection not found' });

        // 2. Normalizar Payload (Exemplo Genérico baseado em WhatsMeow/Evolution)
        const messageData = payload.data || payload; 
        
        if (messageData.message || (messageData.key && messageData.messageTimestamp)) {
            const remoteJid = messageData.key?.remoteJid || '';
            const phone = remoteJid.split('@')[0];
            const pushName = messageData.pushName || phone;
            const fromMe = messageData.key?.fromMe;

            // Extrair conteúdo (texto simples)
            const content = 
                messageData.message?.conversation || 
                messageData.message?.extendedTextMessage?.text || 
                messageData.message?.imageMessage?.caption ||
                '[Mídia/Outro]';

            if (!phone) return { success: true, ignored: true };

            // 3. Upsert Contact (Prisma)
            // Precisamos garantir que o contato existe
            let contact = await prisma.contact.findFirst({
                where: { 
                    tenantId: conn.tenantId,
                    phone: phone
                }
            });

            if (!contact) {
                contact = await prisma.contact.create({
                    data: {
                        tenantId: conn.tenantId,
                        phone: phone,
                        name: pushName,
                        status: 'open',
                        lastMessageAt: new Date()
                    }
                });
            } else {
                // Atualiza timestamp
                await prisma.contact.update({
                    where: { id: contact.id },
                    data: { lastMessageAt: new Date() }
                });
            }

            // 4. Insert Message (Prisma)
            await prisma.message.create({
                data: {
                    tenantId: conn.tenantId,
                    contactId: contact.id,
                    content: content,
                    senderId: fromMe ? 'me' : contact.id,
                    status: 'received',
                    type: 'text', // Simplificado
                    channel: 'whatsapp'
                }
            });
        }

        return { success: true };
    });
}
