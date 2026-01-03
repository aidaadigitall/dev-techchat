
import { WhatsAppProvider } from './providers/WhatsAppProvider';
import { WhatsMeowProvider } from './providers/WhatsMeowProvider';
import { EvolutionProvider } from './providers/EvolutionProvider';
import { supabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';

export class WhatsappService {
    
    private getProvider(engine: 'whatsmeow' | 'evolution' = 'whatsmeow'): WhatsAppProvider {
        if (engine === 'evolution') {
            if (!env.EVOLUTION_API_URL) throw new Error("Evolution API not configured");
            return new EvolutionProvider();
        }
        return new WhatsMeowProvider();
    }

    // --- Métodos Públicos chamados pela API ---

    async createConnection(companyId: string, name: string, engine: 'whatsmeow' | 'evolution') {
        const instanceKey = `inst_${companyId.split('-')[0]}_${Date.now().toString(36)}`;
        const webhookUrl = `${env.API_BASE_URL}/webhooks/whatsapp/${instanceKey}`;

        const provider = this.getProvider(engine);
        await provider.createInstance(instanceKey, webhookUrl);

        // Salva no Supabase
        const { data, error } = await supabaseAdmin
            .from('whatsapp_connections')
            .insert({
                company_id: companyId,
                name: name,
                instance_key: instanceKey,
                instance_name: instanceKey, // Compatibilidade legado
                engine: engine,
                status: 'created'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async connect(connectionId: string) {
        // Busca dados da conexão
        const { data: conn } = await supabaseAdmin.from('whatsapp_connections').select('*').eq('id', connectionId).single();
        if (!conn) throw new Error("Conexão não encontrada");

        const provider = this.getProvider(conn.engine);
        const { qrcode, status } = await provider.connectInstance(conn.instance_key);

        // Atualiza QR no banco
        await supabaseAdmin.from('whatsapp_connections').update({
            qr_code: qrcode,
            status: status
        }).eq('id', connectionId);

        return { qrcode, status };
    }

    // Método Interno usado pela FILA (Queue)
    async sendInternal(instanceKey: string, to: string, content: string, type: any, engine: any) {
        const provider = this.getProvider(engine);
        await provider.sendMessage(instanceKey, to, content, type);
    }
}
