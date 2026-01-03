
import axios from 'axios';
import { WhatsAppProvider, CreateInstanceResponse } from './WhatsAppProvider';
import { env } from '../../config/env';

export class WhatsMeowProvider implements WhatsAppProvider {
    private baseUrl: string;

    constructor() {
        this.baseUrl = env.WHATSMEOW_URL;
    }

    async createInstance(instanceName: string, webhookUrl: string): Promise<CreateInstanceResponse> {
        // No WhatsMeow microserviço, criar instância geralmente é apenas registrar o webhook
        // O container Go gerencia a sessão localmente baseada no ID
        try {
            await axios.post(`${this.baseUrl}/instance/init`, {
                id: instanceName,
                webhook: webhookUrl
            });
            return { id: instanceName, status: 'created' };
        } catch (error) {
            console.error('WhatsMeow Create Error:', error);
            throw new Error('Falha ao criar instância WhatsMeow');
        }
    }

    async connectInstance(instanceName: string): Promise<{ qrcode: string; status: string }> {
        const { data } = await axios.get(`${this.baseUrl}/instance/${instanceName}/connect`);
        return {
            qrcode: data.qrcode,
            status: 'qr_ready'
        };
    }

    async disconnectInstance(instanceName: string): Promise<void> {
        await axios.post(`${this.baseUrl}/instance/${instanceName}/logout`);
    }

    async deleteInstance(instanceName: string): Promise<void> {
        await axios.delete(`${this.baseUrl}/instance/${instanceName}`);
    }

    async sendMessage(instanceName: string, to: string, content: string, type: 'text' | 'image' | 'file'): Promise<any> {
        // Normalização do telefone (apenas números)
        const recipient = to.replace(/\D/g, '');
        
        await axios.post(`${this.baseUrl}/message/send`, {
            instance_id: instanceName,
            to: recipient,
            type,
            content
        });
        return { success: true };
    }

    async getStatus(instanceName: string): Promise<string> {
        try {
            const { data } = await axios.get(`${this.baseUrl}/instance/${instanceName}/status`);
            return data.status; // connected, disconnected
        } catch (e) {
            return 'disconnected';
        }
    }
}
