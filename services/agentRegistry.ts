import { AgentTemplate, AIAgent, KBVersion } from '../types';

// --- Templates Registry (Simulates Dynamic Modules) ---
const AGENT_TEMPLATES: AgentTemplate[] = [
    {
        id: 'sales_expert',
        name: 'Especialista em Vendas',
        description: 'Focado em conversão, upsell e agendamento de reuniões.',
        baseModel: 'GPT-4 Turbo',
        defaultInstruction: 'Você é um vendedor sênior. Seu objetivo é qualificar leads e agendar demos. Use gatilhos mentais de escassez e autoridade.',
        capabilities: ['crm_integration', 'calendar_booking', 'objection_handling']
    },
    {
        id: 'support_n1',
        name: 'Suporte Técnico N1',
        description: 'Triagem inicial e resolução de dúvidas frequentes baseada em manuais.',
        baseModel: 'GPT-3.5 Turbo',
        defaultInstruction: 'Você é um assistente de suporte técnico. Responda apenas com base na KB fornecida. Se não souber, transfira para humano.',
        capabilities: ['faq_search', 'ticket_creation', 'sentiment_analysis']
    },
    {
        id: 'onboarding_guide',
        name: 'Guia de Onboarding',
        description: 'Acompanha novos clientes passo-a-passo na configuração da conta.',
        baseModel: 'GPT-4 Turbo',
        defaultInstruction: 'Você é um guia amigável. Explique o passo a passo com emojis e clareza. Valide se o usuário completou a etapa antes de avançar.',
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