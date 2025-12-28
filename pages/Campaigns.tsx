import React, { useState } from 'react';
import { ChevronRight, Check, Calendar, Users, MessageSquare, Send, X, Clock } from 'lucide-react';
import Modal from '../components/Modal';

const Campaigns: React.FC = () => {
  const [step, setStep] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'tags' | 'kanban' | 'manual'>('manual');

  const steps = [
    { id: 1, label: 'Configurações' },
    { id: 2, label: 'Mensagem' },
    { id: 3, label: 'Destinatários' },
    { id: 4, label: 'Ações' },
    { id: 5, label: 'Agendamento' }
  ];

  const handleNext = () => { if (step < 5) setStep(step + 1); };
  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Campanha *</label>
              <input type="text" placeholder="Ex: Promoção de Janeiro" className="w-full border border-gray-300 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conexão (WhatsApp) *</label>
              <select className="w-full border border-gray-300 rounded-md p-2 bg-white">
                <option>1248 (WhatsApp Cloud API)</option>
              </select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Aprovado *</label>
              <select className="w-full border border-gray-300 rounded-md p-2 bg-white">
                <option>boas_vindas_v1</option>
                <option>promo_black_friday</option>
              </select>
            </div>
            {/* Phone Preview */}
            <div className="mt-6 flex justify-center">
              <div className="w-64 bg-gray-900 rounded-[2rem] p-3 border-4 border-gray-800 shadow-xl">
                 <div className="bg-[#efeae2] h-96 rounded-[1.5rem] overflow-hidden flex flex-col relative">
                    <div className="bg-[#075E54] p-3 text-white text-xs font-bold flex items-center">
                       <div className="w-6 h-6 bg-gray-300 rounded-full mr-2"></div>
                       Empresa
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-center">
                       <div className="bg-white p-2 rounded-lg shadow-sm text-xs rounded-tl-none">
                         <p className="text-gray-800">Olá {`{name}`}, tudo bem?</p>
                         <p className="text-gray-500 text-[9px] text-right mt-1">09:30</p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-fadeIn">
             <div className="flex border-b border-gray-200 mb-4">
               {['Todos', 'Etiquetas', 'Kanban', 'Manual'].map(tab => (
                 <button 
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase() as any)}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === tab.toLowerCase() ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-purple-600'}`}
                 >
                   {tab}
                 </button>
               ))}
             </div>
             
             {activeTab === 'manual' && (
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Números</label>
                  <textarea 
                    className="w-full h-32 border border-gray-300 rounded-md p-2 font-mono text-sm bg-white" 
                    placeholder="5511999999999&#10;5511888888888"
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">Digite um número por linha, com DDI (55).</p>
               </div>
             )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 animate-fadeIn">
             <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
               <input type="checkbox" className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded bg-white" />
               <div className="ml-3">
                 <label className="text-sm font-medium text-gray-700">Fechar conversas após envio</label>
                 <p className="text-xs text-gray-500">As conversas serão marcadas como resolvidas.</p>
               </div>
             </div>
             <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
               <input type="checkbox" className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded bg-white" />
               <div className="ml-3">
                 <label className="text-sm font-medium text-gray-700">Mover card do kanban</label>
                 <p className="text-xs text-gray-500">Mover para coluna específica.</p>
               </div>
             </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-fadeIn">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agendar Início</label>
                <div className="flex gap-2">
                  <input type="date" className="border border-gray-300 rounded-md p-2 w-full bg-white" defaultValue="2025-12-22" />
                  <input type="time" className="border border-gray-300 rounded-md p-2 w-full bg-white" defaultValue="09:28" />
                </div>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Intervalo entre mensagens (segundos)</label>
               <input type="number" defaultValue={20} className="w-full border border-gray-300 rounded-md p-2 bg-white" />
               <p className="text-xs text-gray-500 mt-1">Recomendado: mínimo 10s para evitar bloqueios.</p>
             </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="p-6 h-full bg-gray-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Disparos em Massa</h1>
          <p className="text-gray-500">Gerencie suas campanhas de envio.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={18} /> Novo Disparo
        </button>
      </div>

      {/* Empty State List for now */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-64 flex flex-col items-center justify-center text-gray-400">
        <MessageSquare size={48} className="mb-4 opacity-20" />
        <p>Nenhuma campanha encontrada.</p>
      </div>

      {/* Campaign Wizard Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title="Nova Campanha" 
        size="lg"
        footer={
          <div className="flex justify-between w-full">
            <button 
              onClick={() => {
                 if (step === 1) setShowModal(false);
                 else handleBack();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 bg-white"
            >
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </button>
            <button 
              onClick={() => {
                if (step === 5) {
                   setShowModal(false);
                   setStep(1);
                   alert('Campanha criada com sucesso!');
                } else handleNext();
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
            >
              {step === 5 ? 'Criar Campanha' : 'Próximo'} <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        }
      >
        <div className="mb-6">
           {/* Stepper */}
           <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-gray-200 -z-10"></div>
              {steps.map((s) => (
                <div key={s.id} className="flex flex-col items-center bg-white px-2">
                   <div 
                     className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                       step >= s.id 
                         ? 'bg-purple-600 border-purple-600 text-white' 
                         : 'bg-white border-gray-300 text-gray-400'
                     }`}
                   >
                     {step > s.id ? <Check size={16} /> : s.id}
                   </div>
                   <span className={`text-[10px] mt-1 font-medium ${step >= s.id ? 'text-purple-600' : 'text-gray-400'}`}>
                     {s.label}
                   </span>
                </div>
              ))}
           </div>
        </div>
        
        <div className="mt-4 min-h-[300px]">
          {renderStepContent()}
        </div>
      </Modal>
    </div>
  );
};

// Helper for adding simple animation class if Tailwind config supported it, otherwise standard CSS is needed
import { Plus } from 'lucide-react';

export default Campaigns;