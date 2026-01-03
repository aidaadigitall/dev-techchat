import { AgentTemplate, AIAgent, KBVersion } from '../types';

// --- Templates Registry (Simulates Dynamic Modules) ---
const AGENT_TEMPLATES: AgentTemplate[] = [
    {
        id: 'sales_expert',
        name: 'Analista de Vendas',
        description: 'Focado em conversão, upsell, análise de sentimento e sugestão de respostas.',
        baseModel: 'GPT-4o',
        defaultInstruction: 'Atue como um analista de CRM sênior e especialista em vendas. Analise o sentimento do cliente e sugira as melhores respostas para conversão e upsell. Use gatilhos mentais de escassez e autoridade quando apropriado.',
        capabilities: ['crm_integration', 'sentiment_analysis', 'response_suggestion', 'objection_handling']
    },
    {
        id: 'support_n1',
        name: 'Suporte Nível 1',
        description: 'Triagem inicial e resolução de dúvidas frequentes com base em histórico e manuais.',
        baseModel: 'GPT-3.5 Turbo',
        defaultInstruction: 'Você é um assistente de suporte técnico. Responda apenas com base na KB fornecida e consulte o histórico de mensagens para contexto. Se não souber a resposta, transfira para um humano.',
        capabilities: ['faq_search', 'sentiment_analysis', 'history_awareness', 'ticket_creation']
    },
    {
        id: 'onboarding_guide',
        name: 'Guia de Onboarding',
        description: 'Acompanha novos clientes passo-a-passo, monitora progresso e envia materiais.',
        baseModel: 'GPT-4 Turbo',
        defaultInstruction: 'Você é um guia amigável de onboarding. Explique o passo a passo com emojis e clareza. Valide se o usuário completou a etapa (rastreamento de progresso) antes de enviar o próximo material (mídia).',
        capabilities: ['step_tracking', 'media_sending', 'progress_report']
    }
];

// --- Mock KB Storage ---
const KB_VERSIONS_MOCK: Record<string, KBVersion[]> = {};

// --- Service Implementation ---
export const agentRegistry = {
    // 1. Module Loader
    getTemplates: (): AgentTemplate[] => {
        return AGENT_TEMPLATES;
    },

    getTemplateById: (id: string): AgentTemplate | undefined => {
        return AGENT_TEMPLATES.find(t => t.id === id);
    },

    // 2. Factory: Create Agent from Template
    createAgentFromTemplate: (templateId: string, name: string): AIAgent => {
        const template = AGENT_TEMPLATES.find(t => t.id === templateId);
        if (!template) throw new Error("Template not found");

        return {
            id: `agent_${Date.now()}`,
            name: name || template.name,
            model: template.baseModel,
            templateId: template.id,
            status: 'training',
            systemInstruction: template.defaultInstruction,
            sources: { files: 0, links: 0, drive: false },
            kbVersion: 'v0.0',
            kbHistory: []
        };
    },

    // 3. KB Versioning System
    publishKBVersion: (agentId: string, description: string, fileCount: number): KBVersion => {
        // Init storage if not exists
        if (!KB_VERSIONS_MOCK[agentId]) {
            KB_VERSIONS_MOCK[agentId] = [];
        }

        const history = KB_VERSIONS_MOCK[agentId];
        const nextVersionNum = history.length + 1;
        const newVersion: KBVersion = {
            version: `v1.${nextVersionNum}`,
            createdAt: new Date().toISOString(),
            description: description || `Atualização automática #${nextVersionNum}`,
            fileCount: fileCount,
            isActive: true
        };

        // Deactivate others
        history.forEach(v => v.isActive = false);
        
        // Add new (simulated persistence)
        history.unshift(newVersion); // Add to top
        KB_VERSIONS_MOCK[agentId] = history;

        return newVersion;
    },

    getKBHistory: (agentId: string): KBVersion[] => {
        return KB_VERSIONS_MOCK[agentId] || [];
    },

    rollbackKB: (agentId: string, targetVersion: string): KBVersion[] => {
        const history = KB_VERSIONS_MOCK[agentId];
        if (!history) return [];

        const updatedHistory = history.map(v => ({
            ...v,
            isActive: v.version === targetVersion
        }));

        KB_VERSIONS_MOCK[agentId] = updatedHistory;
        return updatedHistory;
    }
};