
import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';

export async function webhookRoutes(app: FastifyInstance) {
    
    app.post('/whatsapp/:instanceKey', async (req: any, reply) => {
        const { instanceKey } = req.params;
        const payload = req.body;

        // Validar header secreto (Opcional mas recomendado)
        // if (req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) ...

        console.log(`[Webhook] Event from ${instanceKey}`, payload);

        // 1. Identificar Empresa dona da instância
        const { data: conn } = await supabaseAdmin
            .from('whatsapp_connections')
            .select('company_id, id')
            .eq('instance_key', instanceKey)
            .single();

        if (!conn) return reply.code(404).send();

        // 2. Normalizar Payload (Exemplo WhatsMeow)
        // Nota: Payload muda drasticamente entre Evolution e WhatsMeow. 
        // Aqui precisa de um Adapter pattern. Assumindo estrutura genérica:
        const messageData = payload.data || payload; 
        
        if (messageData.message) {
            const phone = messageData.key?.remoteJid?.split('@')[0];
            const content = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text;
            const fromMe = messageData.key?.fromMe;

            // 3. Upsert Contact
            const { data: contact } = await supabaseAdmin
                .from('contacts')
                .upsert({
                    company_id: conn.company_id,
                    phone: phone,
                    name: messageData.pushName || phone,
                    last_message_at: new Date()
                }, { onConflict: 'company_id, phone' })
                .select()
                .single();

            // 4. Insert Message
            if (contact) {
                await supabaseAdmin.from('messages').insert({
                    company_id: conn.company_id,
                    contact_id: contact.id,
                    content: content,
                    sender_id: fromMe ? 'me' : contact.id,
                    status: 'received',
                    type: 'text'
                });
            }
        }

        return { success: true };
    });
}
