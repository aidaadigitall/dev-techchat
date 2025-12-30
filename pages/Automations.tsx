import React, { useState, useRef } from 'react';
import { 
  Bot, Workflow, Plug, Plus, Search, FileText, Globe, 
  HardDrive, Upload, Trash2, Edit, PlayCircle, PauseCircle, 
  ExternalLink, CheckCircle2, XCircle, BrainCircuit
} from 'lucide-react';
import Modal from '../components/Modal';
import { AIAgent, AutomationFlow, Integration } from '../types';

// Mock Data
const MOCK_AGENTS: AIAgent[] = [
  { id: '1', name: 'Atendente Comercial', model: 'GPT-4 Turbo', status: 'active', sources: { files: 3, links: 1, drive: true } },
  { id: '2', name: 'Suporte Técnico N1', model: 'GPT-3.5 Turbo', status: 'training', sources: { files: 12, links: 0, drive: false } },
];

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
  const [activeTab, setActiveTab] = useState<'agents' | 'flows' | 'integrations'>('agents');
  
  // Agent State
  const [agents, setAgents] = useState<AIAgent[]>(MOCK_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [agentForm, setAgentForm] = useState<Partial<AIAgent>>({});
  const [knowledgeTab, setKnowledgeTab] = useState<'files' | 'drive' | 'web'>('files');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Integrations State
  const [integrations, setIntegrations] = useState<Integration[]>(MOCK_INTEGRATIONS);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  // --- Handlers for Agents ---
  const handleOpenAgent = (agent?: AIAgent) => {
    if (agent) {
      setAgentForm(agent);
      setSelectedAgent(agent);
    } else {
      setAgentForm({ name: '', model: 'GPT-4 Turbo', status: 'training' });
      setSelectedAgent({} as AIAgent); // Signal new
    }
  };

  const handleSaveAgent = () => {
    if (!agentForm.name) return;
    if (selectedAgent && 'id' in selectedAgent) {
      setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, ...agentForm } as AIAgent : a));
    } else {
      setAgents(prev => [...prev, { ...agentForm, id: Date.now().toString(), status: 'training', sources: { files: 0, links: 0, drive: false } } as AIAgent]);
    }
    setSelectedAgent(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      alert(`Arquivo "${e.target.files[0].name}" enviado para treinamento! O agente está processando.`);
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
        <button onClick={() => handleOpenAgent()} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium hover:bg-purple-700">
          <Plus size={16} className="mr-2" /> Criar Agente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => (
          <div key={agent.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <BrainCircuit size={24} />
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {agent.status === 'active' ? 'Ativo' : 'Treinando'}
              </span>
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
               <div className={`flex items-center text-xs ${agent.sources.drive ? 'text-green-600' : 'text-gray-400'}`}>
                  <HardDrive size={14} className="mr-2" /> {agent.sources.drive ? 'Google Drive Conectado' : 'Drive Desconectado'}
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

  const renderIntegrations = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Integrações Externas</h2>
        <div className="relative">
           <input type="text" placeholder="Buscar integração..." className="pl-9 pr-4 py-2 border rounded-lg text-sm" />
           <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {integrations.map(int => (
           <div key={int.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                 <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center p-2 border border-gray-100">
                       {int.icon ? <img src={int.icon} alt={int.name} className="w-full h-full object-contain" /> : <Plug size={24} className="text-gray-400" />}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${int.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                 </div>
                 <h3 className="font-bold text-gray-900">{int.name}</h3>
                 <p className="text-xs text-gray-500 mt-1">
                    {int.status === 'connected' ? `Sincronizado: ${int.lastSync}` : 'Não conectado'}
                 </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                 <button 
                   onClick={() => toggleIntegration(int.id)}
                   className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                     int.status === 'connected' 
                       ? 'border border-red-200 text-red-600 hover:bg-red-50' 
                       : 'bg-gray-900 text-white hover:bg-black'
                   }`}
                 >
                    {int.status === 'connected' ? 'Desconectar' : 'Conectar'}
                 </button>
              </div>
           </div>
         ))}
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
      {activeTab === 'integrations' && renderIntegrations()}

      {/* Create/Edit Agent Modal */}
      <Modal 
        isOpen={!!selectedAgent} 
        onClose={() => setSelectedAgent(null)}
        title={agentForm.id ? "Editar Agente IA" : "Novo Agente Inteligente"}
        size="lg"
        footer={
           <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedAgent(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleSaveAgent} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Salvar Agente</button>
           </div>
        }
      >
         <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Agente</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg p-2.5 bg-white" 
                    placeholder="Ex: Assistente de Vendas"
                    value={agentForm.name || ''}
                    onChange={e => setAgentForm({ ...agentForm, name: e.target.value })}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de IA</label>
                  <select 
                    className="w-full border rounded-lg p-2.5 bg-white"
                    value={agentForm.model || 'GPT-4 Turbo'}
                    onChange={e => setAgentForm({ ...agentForm, model: e.target.value })}
                  >
                     <option>GPT-4 Turbo</option>
                     <option>GPT-3.5 Turbo</option>
                     <option>Claude 3 Opus</option>
                  </select>
               </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Instrução do Sistema (Persona)</label>
               <textarea 
                 className="w-full border rounded-lg p-3 bg-white h-24 text-sm"
                 placeholder="Você é um assistente útil e amigável da empresa X. Seu objetivo é..."
               ></textarea>
            </div>

            {/* Knowledge Base Section */}
            <div className="border rounded-xl p-4 bg-gray-50">
               <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                  <BrainCircuit size={16} className="mr-2 text-purple-600" /> Base de Conhecimento
               </h4>
               
               <div className="flex border-b border-gray-200 mb-4">
                  <button onClick={() => setKnowledgeTab('files')} className={`px-4 py-2 text-xs font-bold border-b-2 ${knowledgeTab === 'files' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'}`}>Arquivos</button>
                  <button onClick={() => setKnowledgeTab('drive')} className={`px-4 py-2 text-xs font-bold border-b-2 ${knowledgeTab === 'drive' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'}`}>Google Drive</button>
                  <button onClick={() => setKnowledgeTab('web')} className={`px-4 py-2 text-xs font-bold border-b-2 ${knowledgeTab === 'web' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'}`}>Web / Sites</button>
               </div>

               {knowledgeTab === 'files' && (
                  <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                     <Upload size={32} className="text-gray-400 mx-auto mb-2" />
                     <p className="text-sm font-medium text-gray-700">Clique para anexar documentos</p>
                     <p className="text-xs text-gray-500">Suporta PDF, TXT, CSV, DOCX</p>
                     <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.txt,.csv,.docx" />
                  </div>
               )}

               {knowledgeTab === 'drive' && (
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200">
                     <div className="bg-blue-100 p-3 rounded-full mb-3 text-blue-600"><HardDrive size={24} /></div>
                     <p className="text-sm font-medium text-gray-800 mb-2">Conectar ao Google Drive</p>
                     <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm text-xs font-bold flex items-center hover:bg-gray-50">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-4 h-4 mr-2" /> 
                        Autorizar Acesso
                     </button>
                     <p className="text-[10px] text-gray-400 mt-2 text-center max-w-xs">Permite que o agente leia pastas específicas para aprender sobre novos produtos automaticamente.</p>
                  </div>
               )}

               {knowledgeTab === 'web' && (
                  <div className="space-y-3">
                     <div className="flex gap-2">
                        <input type="text" placeholder="https://seu-site.com/faq" className="flex-1 border rounded-lg p-2 text-sm bg-white" />
                        <button className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-bold">Adicionar</button>
                     </div>
                     <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs bg-white p-2 rounded border border-gray-200">
                           <span className="truncate flex-1">https://omniconnect.com/precos</span>
                           <span className="text-green-600 font-bold ml-2">Indexado</span>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default Automations;