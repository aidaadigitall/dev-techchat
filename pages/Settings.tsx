
import React, { useState, useEffect } from 'react';
import { User as UserIcon, Smartphone, Save, BrainCircuit, Key } from 'lucide-react';
import { User, Branding } from '../types';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';

interface SettingsProps {
  currentUser?: User;
  onUpdateUser?: (user: User) => void;
  branding?: Branding;
  onUpdateBranding?: (branding: Branding) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'integrations' | 'ai'>('ai');
  
  // AI Config State
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      if (activeTab === 'ai') loadAiConfig();
  }, [activeTab]);

  const loadAiConfig = async () => {
      try {
          const config = await api.ai.getConfig();
          if (config) {
              setGeminiKey(config.apiKey || '');
          }
      } catch (e) {
          // Config may not exist yet
      }
  };

  const handleSaveAi = async () => {
      setLoading(true);
      try {
          // Payload: { tenantId (injected by api), provider, apiKey, model, enabled }
          await api.ai.saveConfig({
              provider: 'gemini',
              apiKey: geminiKey,
              model: 'gemini-1.5-flash', // Default model
              enabled: true
          });
          addToast('Configurações de IA salvas com sucesso!', 'success');
      } catch (e) {
          addToast('Erro ao salvar configurações.', 'error');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
       {/* Sidebar Navigation */}
       <div className="w-64 bg-white border-r border-gray-200 flex flex-col pt-6 pb-4 hidden md:flex">
          <div className="px-6 mb-6">
             <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
          </div>
          <nav className="flex-1 space-y-1 px-3">
             {[
               { id: 'ai', label: 'Inteligência Artificial', icon: <BrainCircuit size={18} /> },
               { id: 'integrations', label: 'Conexões', icon: <Smartphone size={18} /> },
               { id: 'profile', label: 'Meu Perfil', icon: <UserIcon size={18} /> },
             ].map(item => (
                <button
                   key={item.id}
                   onClick={() => setActiveTab(item.id as any)}
                   className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === item.id ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
                   }`}
                >
                   <span className="mr-3">{item.icon}</span> {item.label}
                </button>
             ))}
          </nav>
       </div>

       <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
          <div className="max-w-4xl mx-auto h-full">
             {activeTab === 'ai' && (
                 <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm animate-fadeIn">
                     <h2 className="text-xl font-bold mb-2 text-gray-900 flex items-center">
                         <BrainCircuit className="mr-2 text-purple-600" /> Configuração do Modelo (LLM)
                     </h2>
                     <p className="text-gray-500 mb-6 text-sm">Configure as chaves de API para habilitar funcionalidades inteligentes.</p>
                     
                     <div className="space-y-6">
                         <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                             <label className="block text-sm font-bold text-gray-800 mb-2">Provedor: Google Gemini</label>
                             <p className="text-xs text-gray-600 mb-4">
                                Utilizado para a IA Analista de Produtividade e sugestões de resposta.
                             </p>
                             
                             <label className="block text-xs font-semibold text-gray-700 mb-1">API Key (Google AI Studio)</label>
                             <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Key size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input 
                                        type="password" 
                                        className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                                        placeholder="AIzaSy..." 
                                        value={geminiKey}
                                        onChange={e => setGeminiKey(e.target.value)}
                                    />
                                </div>
                             </div>
                         </div>

                         <div className="pt-4 border-t border-gray-100 flex justify-end">
                             <button 
                                onClick={handleSaveAi}
                                disabled={loading}
                                className="bg-gray-900 text-white px-6 py-2.5 rounded-lg hover:bg-black font-medium flex items-center disabled:opacity-70"
                             >
                                {loading ? 'Salvando...' : 'Salvar Configurações'}
                             </button>
                         </div>
                     </div>
                 </div>
             )}
             
             {activeTab === 'integrations' && (
                 <div className="text-gray-500 text-center py-20">Conexões são gerenciadas pelo Backend.</div>
             )}
          </div>
       </div>
    </div>
  );
};

export default Settings;
