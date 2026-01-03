
export interface CreateInstanceResponse {
    id: string;
    qrcode?: string;
    status: string;
}

export interface WhatsAppProvider {
    createInstance(instanceName: string, webhookUrl: string): Promise<CreateInstanceResponse>;
    connectInstance(instanceName: string): Promise<{ qrcode: string, status: string }>;
    disconnectInstance(instanceName: string): Promise<void>;
    deleteInstance(instanceName: string): Promise<void>;
    sendMessage(instanceName: string, to: string, content: string, type: 'text' | 'image' | 'file'): Promise<any>;
    getStatus(instanceName: string): Promise<string>;
}
