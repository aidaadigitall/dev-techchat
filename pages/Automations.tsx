import React, { useState, useRef } from 'react';
import { 
  Bot, Workflow, Plug, Plus, Search, FileText, Globe, 
  HardDrive, Upload, Trash2, Edit, PlayCircle, PauseCircle, 
  ExternalLink, CheckCircle2, XCircle, BrainCircuit, History, RotateCcw, Save
} from 'lucide-react';
import Modal from '../components/Modal';
import { AIAgent, AutomationFlow, Integration, KBVersion } from '../types';
import { agentRegistry } from '../services/agentRegistry'; // Import Registry
import { useToast } from '../components/ToastContext';

// Mock Data
const MOCK_FLOWS: AutomationFlow[] = [
  { id: '1', name: 'Boas-vindas WhatsApp', trigger: 'Nova Mensagem', steps: 5, active: true },
  { id: '2', name: 'Qualificação de Lead', trigger: 'Keyword: Interesse', steps: 8, active: true },
  { id: '3', name: 'Pesquisa de Satisfação', trigger: 'Ticket Fechado', steps: 3, active: false },
];

const MOCK_INTEGRATIONS: Integration[] = [
  { id: '1', name: 'n8n', type: 'n8n', status: 'connected', icon: 'https://cdn.icon-icons.com/icons2/2699/PNG/512/n8n_logo_icon_169222.png', lastSync: '10 min atrás' },
  { id: '2', name: 'Typebot', type: 'typebot', status: 'connected', icon: 'https://avatars.githubusercontent.com/u/96489376?s=200&v=4', lastSync: '2 horas atrás' },
  { id: '3', name: 'Make (Integromat)', type: 'make', status: 'disconnected', icon: 'https://seeklogo.com/images/M/make-logo-F967909336-seeklogo.com.png' },
  { id: '4', name: 'Webhooks', type: 'webhook', status: 'connected', lastSync: 'Agora' },
];

const Automations: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'agents' | 'flows' | 'integrations'>('agents');
  
  // Agent State
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [agentForm, setAgentForm] = useState<Partial<AIAgent>>({});
  
  // Create Agent Wizard State
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Knowledge Base State
  const [knowledgeTab, setKnowledgeTab] = useState<'files' | 'history'>('files');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [kbHistory, setKbHistory] = useState<KBVersion[]>([]);

  // Integrations State
  const [integrations, setIntegrations] = useState<Integration[]>(MOCK_INTEGRATIONS);

  // --- Handlers for Agents ---
  const handleOpenAgent = (agent: AIAgent) => {
    setAgentForm(agent);
    setSelectedAgent(agent);
    setKbHistory(agentRegistry.getKBHistory(agent.id));
    setKnowledgeTab('files');
  };

  const handleStartCreate = () => {
      setShowCreateWizard(true);
      setSelectedTemplateId(agentRegistry.getTemplates()[0].id);
  };

  const handleCreateFromTemplate = () => {
      if (!selectedTemplateId) return;
      const newAgent = agentRegistry.createAgentFromTemplate(selectedTemplateId, agentForm.name || '');
      setAgents(prev => [...prev, newAgent]);
      setShowCreateWizard(false);
      addToast('Agente criado com sucesso a partir do template!', 'success');
      // Open edit immediately
      handleOpenAgent(newAgent);
  };

  const handleSaveAgent = () => {
    if (!agentForm.name) return;
    if (selectedAgent) {
      setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, ...agentForm } as AIAgent : a));
      addToast('Agente atualizado.', 'success');
    }
    setSelectedAgent(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length && selectedAgent) {
      const fileCount = e.target.files.length;
      
      // Simulate Processing
      setTimeout(() => {
          // Versioning Logic
          const newVersion = agentRegistry.publishKBVersion(
              selectedAgent.id, 
              `Upload: ${e.target.files![0].name} ${fileCount > 1 ? `+ ${fileCount-1} arquivos` : ''}`, 
              (selectedAgent.sources.files + fileCount)
          );
          
          setKbHistory(agentRegistry.getKBHistory(selectedAgent.id));
          
          // Update Agent State
          setAgentForm(prev => ({ 
              ...prev, 
              kbVersion: newVersion.version,
              sources: { ...prev.sources!, files: (prev.sources!.files || 0) + fileCount }
          }));

          addToast(`Base de conhecimento atualizada para ${newVersion.version}`, 'success');
      }, 1500);
    }
  };

  const handleRollback = (version: string) => {
      if (!selectedAgent) return;
      if (confirm(`Restaurar a base de conhecimento para a versão ${version}?`)) {
          const updatedHistory = agentRegistry.rollbackKB(selectedAgent.id, version);
          setKbHistory(updatedHistory);
          setAgentForm(prev => ({ ...prev, kbVersion: version }));
          addToast(`Rollback realizado para ${version}`, 'info');
      }
  };

  // --- Handlers for Integrations ---
  const toggleIntegration = (id: string) => {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'connected' } : i));
  };

  // --- Renderers ---

  const renderAgents = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Agentes de Inteligência Artificial</h2>
        <button onClick={handleStartCreate} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium hover:bg-purple-700">
          <Plus size={16} className="mr-2" /> Criar Agente
        </button>
      </div>

      {agents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <Bot size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Nenhum agente configurado.</p>
              <button onClick={handleStartCreate} className="mt-4 text-purple-600 font-bold hover:underline">Criar meu primeiro agente</button>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map(agent => (
            <div key={agent.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                    <BrainCircuit size={24} />
                </div>
                <div className="flex flex-col items-end">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {agent.status === 'active' ? 'Ativo' : 'Treinando'}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1 font-mono">{agent.kbVersion || 'v0.0'}</span>
                </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{agent.name}</h3>
                <p className="text-xs text-gray-500 mb-4">Modelo: {agent.model}</p>
                
                <div className="space-y-2 border-t border-gray-100 pt-3 mb-4">
                <div className="flex items-center text-xs text-gray-600">
                    <FileText size={14} className="mr-2" /> {agent.sources.files} Arquivos indexados
                </div>
                <div className="flex items-center text-xs text-gray-600">
                    <Globe size={14} className="mr-2" /> {agent.sources.links} Links rastreados
                </div>
                </div>

                <button 
                onClick={() => handleOpenAgent(agent)}
                className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center"
                >
                <Edit size={16} className="mr-2" /> Gerenciar Cérebro
                </button>
            </div>
            ))}
        </div>
      )}
    </div>
  );

  const renderFlows = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Fluxos de Conversa (Chatbots)</h2>
        <button className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium hover:bg-black">
          <Plus size={16} className="mr-2" /> Novo Fluxo
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Nome do Fluxo</th>
              <th className="px-6 py-4">Gatilho</th>
              <th className="px-6 py-4">Passos</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MOCK_FLOWS.map(flow => (
              <tr key={flow.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                   <Workflow size={18} className="mr-3 text-purple-500" />
                   {flow.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{flow.trigger}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{flow.steps} passos</td>
                <td className="px-6 py-4">
                   {flow.active ? (
                     <span className="flex items-center text-green-600 text-xs font-bold"><PlayCircle size={14} className="mr-1"/> Ativo</span>
                   ) : (
                     <span className="flex items-center text-gray-400 text-xs font-bold"><PauseCircle size={14} className="mr-1"/> Pausado</span>
                   )}
                </td>
                <td className="px-6 py-4 text-right">
                   <button className="text-purple-600 hover:text-purple-800 font-medium text-sm">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 h-full bg-gray-50 overflow-y-auto">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
         <div>
            <h1 className="text-2xl font-bold text-gray-900">Automações & Integrações</h1>
            <p className="text-gray-500">Gerencie fluxos de chatbot, agentes IA e conexões externas.</p>
         </div>
         <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex">
            {[
              { id: 'agents', label: 'IA & Agentes', icon: <Bot size={18} /> },
              { id: 'flows', label: 'Fluxos', icon: <Workflow size={18} /> },
              { id: 'integrations', label: 'Integrações', icon: <Plug size={18} /> },
            ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                   activeTab === tab.id 
                     ? 'bg-purple-100 text-purple-700 shadow-sm' 
                     : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                 }`}
               >
                  <span className="mr-2">{tab.icon}</span> {tab.label}
               </button>
            ))}
         </div>
      </div>

      {/* Content Render */}
      {activeTab === 'agents' && renderAgents()}
      {activeTab === 'flows' && renderFlows()}
      {/* Integrations (Keep existing) */}
      
      {/* 1. Create Agent Wizard Modal */}
      <Modal isOpen={showCreateWizard} onClose={() => setShowCreateWizard(false)} title="Novo Agente Inteligente" size="lg">
          <div className="space-y-6">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Agente</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg p-2.5 bg-white"
                    placeholder="Ex: Consultor de Vendas"
                    value={agentForm.name || ''}
                    onChange={e => setAgentForm({...agentForm, name: e.target.value})}
                  />
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Selecione um Template (Módulo Dinâmico)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto custom-scrollbar p-1">
                      {agentRegistry.getTemplates().map(template => (
                          <div 
                            key={template.id}
                            onClick={() => setSelectedTemplateId(template.id)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedTemplateId === template.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
                          >
                              <div className="flex justify-between items-center mb-2">
                                  <h4 className="font-bold text-gray-900">{template.name}</h4>
                                  {selectedTemplateId === template.id && <CheckCircle2 size={18} className="text-purple-600" />}
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{template.description}</p>
                              <div className="flex flex-wrap gap-1">
                                  {template.capabilities.map(cap => (
                                      <span key={cap} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600 uppercase">{cap.replace('_', ' ')}</span>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button onClick={handleCreateFromTemplate} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-purple-700 transition-colors">
                      Criar Agente
                  </button>
              </div>
          </div>
      </Modal>

      {/* 2. Edit Agent & KB Modal */}
      <Modal 
        isOpen={!!selectedAgent} 
        onClose={() => setSelectedAgent(null)}
        title={selectedAgent ? `Editar: ${selectedAgent.name}` : ''}
        size="lg"
        footer={
           <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedAgent(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Fechar</button>
              <button onClick={handleSaveAgent} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Salvar Alterações</button>
           </div>
        }
      >
         <div className="space-y-6">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center">
                    <Bot size={20} className="text-purple-600 mr-2" />
                    <div>
                        <p className="text-sm font-bold text-gray-900">Versão da KB: <span className="font-mono bg-white px-1 rounded border border-gray-300">{agentForm.kbVersion || 'v0.0'}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Modelo:</span>
                    <select 
                        className="text-xs border-gray-300 rounded p-1 bg-white"
                        value={agentForm.model}
                        onChange={e => setAgentForm({...agentForm, model: e.target.value})}
                    >
                        <option>GPT-4 Turbo</option>
                        <option>GPT-3.5 Turbo</option>
                        <option>Claude 3 Opus</option>
                    </select>
                </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Instrução do Sistema (Prompt)</label>
               <textarea 
                 className="w-full border rounded-lg p-3 bg-white h-24 text-sm font-mono text-gray-600"
                 value={agentForm.systemInstruction || ''}
                 onChange={e => setAgentForm({...agentForm, systemInstruction: e.target.value})}
               ></textarea>
            </div>

            {/* Knowledge Base Section */}
            <div className="border rounded-xl p-0 bg-white overflow-hidden">
               <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                   <h4 className="text-sm font-bold text-gray-800 flex items-center">
                      <BrainCircuit size={16} className="mr-2 text-purple-600" /> Base de Conhecimento
                   </h4>
                   <div className="flex bg-white rounded-lg p-0.5 border border-gray-200">
                        <button onClick={() => setKnowledgeTab('files')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${knowledgeTab === 'files' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-900'}`}>Arquivos</button>
                        <button onClick={() => setKnowledgeTab('history')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${knowledgeTab === 'history' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-900'}`}>Histórico & Versões</button>
                   </div>
               </div>

               <div className="p-4">
                   {knowledgeTab === 'files' && (
                      <div className="space-y-4">
                          <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-white hover:border-purple-400 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                             <Upload size={32} className="text-gray-400 mx-auto mb-2 group-hover:text-purple-500" />
                             <p className="text-sm font-medium text-gray-700">Clique para enviar novos documentos</p>
                             <p className="text-xs text-gray-500 mt-1">Isso criará uma nova versão da KB automaticamente.</p>
                             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.txt,.csv,.docx" multiple />
                          </div>
                      </div>
                   )}

                   {knowledgeTab === 'history' && (
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                          {kbHistory.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Nenhum histórico de versão.</p>}
                          {kbHistory.map((ver) => (
                              <div key={ver.version} className={`flex justify-between items-center p-2 rounded border ${ver.isActive ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                  <div className="flex items-center">
                                      <div className={`w-2 h-2 rounded-full mr-2 ${ver.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <div>
                                          <p className="text-xs font-bold text-gray-800 flex items-center">
                                              {ver.version} 
                                              {ver.isActive && <span className="ml-2 px-1.5 py-0.5 bg-green-200 text-green-800 text-[9px] rounded uppercase">Atual</span>}
                                          </p>
                                          <p className="text-[10px] text-gray-500">{ver.description} • {new Date(ver.createdAt).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                                  {!ver.isActive && (
                                      <button 
                                        onClick={() => handleRollback(ver.version)}
                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-1 rounded"
                                        title="Restaurar esta versão"
                                      >
                                          <RotateCcw size={12} className="mr-1" /> Restaurar
                                      </button>
                                  )}
                              </div>
                          ))}
                      </div>
                   )}
               </div>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default Automations;