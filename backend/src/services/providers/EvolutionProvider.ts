
import axios from 'axios';
import { WhatsAppProvider, CreateInstanceResponse } from './WhatsAppProvider';
import { env } from '../../config/env';

export class EvolutionProvider implements WhatsAppProvider {
    private baseUrl: string;
    private apiKey: string;

    constructor() {
        this.baseUrl = env.EVOLUTION_API_URL || '';
        this.apiKey = env.EVOLUTION_API_KEY || '';
    }

    private getHeaders() {
        return { 'apikey': this.apiKey, 'Content-Type': 'application/json' };
    }

    async createInstance(instanceName: string, webhookUrl: string): Promise<CreateInstanceResponse> {
        const { data } = await axios.post(`${this.baseUrl}/instance/create`, {
            instanceName,
            qrcode: false, // Pedimos o QR no connect
            integration: 'WHATSAPP-BAILEYS',
            webhook: webhookUrl
        }, { headers: this.getHeaders() });

        return { id: data.instance.instanceName, status: data.instance.status };
    }

    async connectInstance(instanceName: string): Promise<{ qrcode: string; status: string }> {
        const { data } = await axios.get(`${this.baseUrl}/instance/connect/${instanceName}`, { headers: this.getHeaders() });
        return {
            qrcode: data.base64 || data.qrcode?.base64,
            status: 'qr_ready'
        };
    }

    async disconnectInstance(instanceName: string): Promise<void> {
        await axios.delete(`${this.baseUrl}/instance/logout/${instanceName}`, { headers: this.getHeaders() });
    }

    async deleteInstance(instanceName: string): Promise<void> {
        await axios.delete(`${this.baseUrl}/instance/delete/${instanceName}`, { headers: this.getHeaders() });
    }

    async sendMessage(instanceName: string, to: string, content: string, type: 'text' | 'image' | 'file'): Promise<any> {
        const endpoint = type === 'text' ? 'sendText' : 'sendMedia';
        const body = type === 'text' 
            ? { number: to, text: content }
            : { number: to, media: content, mediatype: 'image' }; // Simplificado

        await axios.post(`${this.baseUrl}/message/${endpoint}/${instanceName}`, body, { headers: this.getHeaders() });
        return { success: true };
    }

    async getStatus(instanceName: string): Promise<string> {
        try {
            const { data } = await axios.get(`${this.baseUrl}/instance/connectionState/${instanceName}`, { headers: this.getHeaders() });
            return data.instance.state === 'open' ? 'connected' : 'disconnected';
        } catch (e) {
            return 'disconnected';
        }
    }
}
