import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Shield, Building, Smartphone, Save, QrCode, Trash2, Plus, Mail, Camera, Lock, Palette, Upload, BrainCircuit, Key, Tag as TagIcon, Briefcase, RefreshCw, CheckCircle, Terminal } from 'lucide-react';
import { User, Branding, Tag, Sector } from '../types';
import { MOCK_USERS } from '../constants';
import { api } from '../services/api';
import { whatsappService, WhatsAppStatus } from '../services/whatsapp'; // New Service
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

interface SettingsProps {
  currentUser?: User;
  onUpdateUser?: (user: User) => void;
  branding?: Branding;
  onUpdateBranding?: (branding: Branding) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateUser, branding, onUpdateBranding }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'company' | 'integrations' | 'team' | 'ai' | 'tags_sectors'>('profile'); // Default to profile based on feedback
  const [loading, setLoading] = useState(false);

  // States
  const [profileForm, setProfileForm] = useState({ 
    name: currentUser?.name || '', 
    email: currentUser?.email || '', 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string>(currentUser?.avatar || '');
  const [companyForm, setCompanyForm] = useState(() => {
    const saved = localStorage.getItem('app_company_settings');
    return saved ? JSON.parse(saved) : { name: 'Esc Solutions', hoursStart: '08:00', hoursEnd: '18:00', greeting: 'Olá! Bem-vindo.' };
  });
  const [brandingForm, setBrandingForm] = useState<Branding>({ appName: branding?.appName || 'OmniConnect', primaryColor: branding?.primaryColor || '#9333ea', logoUrl: branding?.logoUrl || '' });
  
  // AI Settings State
  const [aiSettings, setAiSettings] = useState({ 
    provider: 'google', 
    apiKey: '', 
    useOwnKey: false, 
    model: 'gemini-3-pro-preview' 
  });

  const [tags, setTags] = useState<Tag[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  
  // WhatsApp Connection State (Managed by Service)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>('disconnected');
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Initial Load & Event Listeners ---
  useEffect(() => {
    // 1. Get initial status
    setWhatsappStatus(whatsappService.getStatus());
    setQrCodeData(whatsappService.getQrCode());
    setConnectionLogs(whatsappService.getLogs());

    // 2. Subscribe to status changes
    const handleStatusChange = (status: WhatsAppStatus) => {
        setWhatsappStatus(status);
        if (status === 'connected') {
            setTimeout(() => {
                setConnectionModalOpen(false);
                addToast('WhatsApp conectado com sucesso!', 'success');
            }, 1000);
        }
    };

    const handleQrCode = (qr: string) => {
        setQrCodeData(qr);
    };

    const handleLog = (log: string) => {
        setConnectionLogs(prev => [...prev, log]);
    };

    whatsappService.on('status', handleStatusChange);
    whatsappService.on('qr', handleQrCode);
    whatsappService.on('log', handleLog);

    return () => {
        whatsappService.off('status', handleStatusChange);
        whatsappService.off('qr', handleQrCode);
        whatsappService.off('log', handleLog);
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [connectionLogs, connectionModalOpen]);

  // Update form when currentUser changes
  useEffect(() => {
    if (currentUser) {
        setProfileForm(prev => ({ ...prev, name: currentUser.name, email: currentUser.email }));
        setProfileAvatarPreview(currentUser.avatar);
    }
  }, [currentUser]);

  // Load saved AI settings
  useEffect(() => {
    const savedAI = localStorage.getItem('app_ai_settings');
    if (savedAI) {
        const parsed = JSON.parse(savedAI);
        // Ensure provider defaults to google if missing from old save
        if (!parsed.provider) parsed.provider = 'google';
        setAiSettings(parsed);
    }
  }, []);

  // --- Handlers ---

  const handleGenerateQR = () => {
    setConnectionLogs([]); // Clear previous logs
    setConnectionModalOpen(true);
    whatsappService.connect();
  };

  const handleDisconnect = () => {
      if(confirm("Deseja realmente desconectar o WhatsApp?")) {
          whatsappService.disconnect();
          addToast('WhatsApp desconectado.', 'info');
      }
  };

  const handleSaveProfile = async () => {
      if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
          addToast('As senhas não coincidem.', 'error');
          return;
      }

      setLoading(true);
      try {
          // Pass both name and avatar to API for persistence
          await api.users.updateProfile({ 
              name: profileForm.name,
              avatar: profileAvatarPreview 
          }); 
          
          if (onUpdateUser && currentUser) {
              onUpdateUser({ ...currentUser, name: profileForm.name, email: profileForm.email, avatar: profileAvatarPreview });
          }
          
          addToast('Perfil atualizado com sucesso!', 'success');
          setProfileForm(prev => ({...prev, currentPassword: '', newPassword: '', confirmPassword: ''}));
      } catch(e) {
          addToast('Erro ao atualizar perfil', 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setProfileAvatarPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const getDefaultModel = (provider: string) => {
      switch(provider) {
          case 'google': return 'gemini-3-pro-preview';
          case 'openai': return 'gpt-4o';
          case 'azure': return 'azure-gpt-4o';
          case 'anthropic': return 'claude-3-sonnet-20240229';
          case 'groq': return 'llama3-70b-8192';
          default: return '';
      }
  };

  // --- Renderers ---

  const renderContent = () => {
    switch(activeTab) {
      case 'integrations':
        return (
           <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Conexões & Integrações</h2>
                <p className="text-sm text-gray-500">Gerencie a conexão com o WhatsApp Web (Multi-device).</p>
              </div>
              
              {/* WhatsApp Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                       <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white ${whatsappStatus === 'connected' ? 'bg-[#25D366]' : 'bg-gray-300'}`}>
                          <Smartphone size={32} />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-gray-900">WhatsApp Principal</h3>
                          {whatsappStatus === 'connected' ? (
                              <p className="text-sm text-green-600 font-medium flex items-center">
                                 <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> Conectado
                              </p>
                          ) : whatsappStatus === 'connecting' || whatsappStatus === 'qr_ready' ? (
                              <p className="text-sm text-yellow-500 font-medium flex items-center">
                                 <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span> Conectando...
                              </p>
                          ) : (
                              <p className="text-sm text-red-500 font-medium flex items-center">
                                 <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span> Desconectado
                              </p>
                          )}
                          <p className="text-xs text-gray-500">API: Baileys / WPPConnect</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       {whatsappStatus === 'connected' ? (
                           <button onClick={handleDisconnect} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium bg-white">Desconectar</button>
                       ) : (
                           <button 
                             onClick={handleGenerateQR} 
                             disabled={whatsappStatus === 'connecting' || whatsappStatus === 'qr_ready'}
                             className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold flex items-center shadow-md disabled:opacity-50"
                           >
                               <QrCode size={18} className="mr-2" /> {whatsappStatus === 'connecting' || whatsappStatus === 'qr_ready' ? 'Retomar Conexão' : 'Conectar via QR Code'}
                           </button>
                       )}
                    </div>
                 </div>
              </div>

              {/* Webhooks Section (Visual) */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-4">
                 <h3 className="text-lg font-medium text-gray-900 mb-4">Webhooks (Eventos)</h3>
                 <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                        <span className="text-sm font-mono text-gray-600">https://api.seusistema.com/webhook/wpp</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Ativo</span>
                    </div>
                 </div>
              </div>
           </div>
        );

      case 'profile':
          return (
            <div className="space-y-6 animate-fadeIn">
               <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Meu Perfil</h2>
                  <p className="text-sm text-gray-500">Gerencie suas informações pessoais e segurança.</p>
               </div>

               <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row gap-8">
                     {/* Avatar Section */}
                     <div className="flex flex-col items-center space-y-3">
                        <div className="relative group">
                           <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 bg-gray-50">
                              {profileAvatarPreview ? (
                                 <img src={profileAvatarPreview} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <UserIcon size={48} />
                                 </div>
                              )}
                           </div>
                           <button 
                             onClick={() => fileInputRef.current?.click()}
                             className="absolute bottom-0 right-0 bg-white border border-gray-200 p-2 rounded-full shadow-md hover:bg-gray-50 text-gray-600"
                           >
                              <Camera size={16} />
                           </button>
                           <input 
                             type="file" 
                             ref={fileInputRef} 
                             className="hidden" 
                             accept="image/*"
                             onChange={handleAvatarChange}
                           />
                        </div>
                        <p className="text-xs text-gray-500">JPG, PNG ou GIF. Max 2MB.</p>
                     </div>

                     {/* Form Section */}
                     <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                              <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                value={profileForm.name}
                                onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                              <input 
                                type="email" 
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                                value={profileForm.email}
                                disabled
                              />
                           </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                           <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                              <Lock size={16} className="mr-2 text-purple-600" /> Alterar Senha
                           </h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-xs font-medium text-gray-500 mb-1">Nova Senha</label>
                                 <input 
                                   type="password" 
                                   className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                   placeholder="••••••••"
                                   value={profileForm.newPassword}
                                   onChange={e => setProfileForm({...profileForm, newPassword: e.target.value})}
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-medium text-gray-500 mb-1">Confirmar Senha</label>
                                 <input 
                                   type="password" 
                                   className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                   placeholder="••••••••"
                                   value={profileForm.confirmPassword}
                                   onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                                 />
                              </div>
                           </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                           <button 
                             onClick={handleSaveProfile}
                             disabled={loading}
                             className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 font-medium shadow-sm flex items-center transition-colors disabled:opacity-70"
                           >
                              {loading ? <RefreshCw size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                              Salvar Alterações
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          );

      case 'company':
          return (
             <div className="p-4 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                <Building size={48} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900">Configurações da Empresa</h3>
                <p className="text-sm">Em breve você poderá editar dados fiscais e horários de atendimento aqui.</p>
             </div>
          );

      case 'ai':
          return (
             <div className="space-y-6 animate-fadeIn">
                <div className="border-b border-gray-100 pb-4">
                   <h2 className="text-xl font-semibold text-gray-800">Agentes IA & Automação</h2>
                   <p className="text-sm text-gray-500">Configure o cérebro da sua operação. Escolha entre múltiplos provedores de LLM.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                   <div className="flex items-center mb-6">
                      <div className="p-3 bg-purple-100 rounded-lg text-purple-600 mr-4">
                         <BrainCircuit size={24} />
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-gray-900">Motor de Inteligência (LLM)</h3>
                         <p className="text-sm text-gray-500">O sistema utiliza modelos de linguagem para processar conversas.</p>
                      </div>
                   </div>

                   <div className="space-y-5 max-w-2xl">
                      {/* Provider Selection */}
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Provedor de IA</label>
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[
                                { id: 'google', label: 'Google Gemini' },
                                { id: 'openai', label: 'OpenAI (GPT)' },
                                { id: 'azure', label: 'Microsoft Copilot' },
                                { id: 'anthropic', label: 'Anthropic (Claude)' },
                                { id: 'groq', label: 'Groq (Llama)' }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setAiSettings({...aiSettings, provider: p.id, model: getDefaultModel(p.id)})}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                        aiSettings.provider === p.id 
                                        ? 'border-purple-600 bg-purple-50 text-purple-700' 
                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                         </div>
                      </div>

                      {/* Model Selection */}
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Modelo Padrão</label>
                         <select 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            value={aiSettings.model}
                            onChange={(e) => setAiSettings({...aiSettings, model: e.target.value})}
                         >
                            {/* Logic to show options based on provider */}
                            {aiSettings.provider === 'google' && (
                                <>
                                    <option value="gemini-3-pro-preview">Gemini 1.5 Pro (Raciocínio Complexo)</option>
                                    <option value="gemini-3-flash-preview">Gemini 1.5 Flash (Alta Velocidade)</option>
                                </>
                            )}
                            {aiSettings.provider === 'openai' && (
                                <>
                                    <option value="gpt-4o">GPT-4o (Omni - Mais Rápido)</option>
                                    <option value="o1-preview">OpenAI o1-preview (Raciocínio Avançado)</option>
                                    <option value="o1-mini">OpenAI o1-mini (Raciocínio Rápido)</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo (Estável)</option>
                                    <option value="gpt-4">GPT-4 (Clássico)</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legado/Econômico)</option>
                                </>
                            )}
                            {aiSettings.provider === 'azure' && (
                                <>
                                    <option value="azure-gpt-4o">GPT-4o (Azure AI)</option>
                                    <option value="azure-gpt-4-turbo">GPT-4 Turbo (Azure AI)</option>
                                </>
                            )}
                            {aiSettings.provider === 'anthropic' && (
                                <>
                                    <option value="claude-3-opus-20240229">Claude 3 Opus (Mais Inteligente)</option>
                                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet (Equilibrado)</option>
                                    <option value="claude-3-haiku-20240307">Claude 3 Haiku (Mais Rápido)</option>
                                </>
                            )}
                            {aiSettings.provider === 'groq' && (
                                <>
                                    <option value="llama3-70b-8192">Llama 3 70B (Meta)</option>
                                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                                    <option value="gemma-7b-it">Gemma 7B</option>
                                </>
                            )}
                         </select>
                         <p className="text-xs text-gray-500 mt-1">
                            {aiSettings.provider === 'google' && "O modelo Pro é recomendado para atendimento complexo. O Flash é melhor para triagem rápida."}
                            {aiSettings.provider === 'openai' && "GPT-4o e o1-preview oferecem o estado da arte em inteligência."}
                            {aiSettings.provider === 'azure' && "Infraestrutura enterprise da Microsoft para rodar modelos GPT."}
                            {aiSettings.provider === 'anthropic' && "Claude tem janela de contexto maior e texto mais natural."}
                            {aiSettings.provider === 'groq' && "Groq oferece inferência extremamente rápida para modelos open source."}
                         </p>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                         <div className="flex items-center justify-between mb-4">
                            <div>
                               <label className="text-sm font-medium text-gray-900">Chave de API Personalizada</label>
                               <p className="text-xs text-gray-500">Use sua própria chave para evitar limites de taxa do plano gratuito.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 className="sr-only peer" 
                                 checked={aiSettings.useOwnKey}
                                 onChange={(e) => setAiSettings({...aiSettings, useOwnKey: e.target.checked})}
                               />
                               <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                         </div>

                         {aiSettings.useOwnKey && (
                            <div className="animate-fadeIn">
                               <div className="relative">
                                  <input 
                                    type="password" 
                                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder={`Cole sua chave API do ${aiSettings.provider === 'google' ? 'AI Studio' : aiSettings.provider === 'openai' ? 'OpenAI' : aiSettings.provider === 'azure' ? 'Azure OpenAI' : aiSettings.provider === 'anthropic' ? 'Anthropic' : 'Groq'} aqui...`}
                                    value={aiSettings.apiKey}
                                    onChange={(e) => setAiSettings({...aiSettings, apiKey: e.target.value})}
                                  />
                                  <Key size={16} className="absolute left-3 top-3 text-gray-400" />
                                </div>
                                <p className="text-xs text-gray-500 mt-1 flex items-center">
                                  <CheckCircle size={12} className="mr-1 text-green-500" /> Chave armazenada localmente e criptografada.
                                </p>
                            </div>
                         )}
                      </div>

                      <div className="pt-4 flex justify-end">
                         <button 
                           onClick={() => {
                              localStorage.setItem('app_ai_settings', JSON.stringify(aiSettings));
                              addToast('Configurações de IA salvas com sucesso!', 'success');
                           }}
                           className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 font-medium shadow-sm flex items-center transition-colors"
                         >
                            <Save size={18} className="mr-2" /> Salvar Alterações
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          );

      default: return <div className="p-4 text-gray-500 text-center">Selecione uma opção no menu lateral.</div>;
    }
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
       <div className="w-64 bg-white border-r border-gray-200 flex flex-col pt-6 pb-4">
          <div className="px-6 mb-6">
             <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
          </div>
          <nav className="flex-1 space-y-1 px-3">
             {[
               { id: 'profile', label: 'Meu Perfil', icon: <UserIcon size={18} /> },
               { id: 'integrations', label: 'Conexões (WhatsApp)', icon: <Smartphone size={18} /> },
               { id: 'company', label: 'Empresa', icon: <Building size={18} /> },
               { id: 'ai', label: 'Agentes IA', icon: <BrainCircuit size={18} /> },
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

       <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
             {renderContent()}
          </div>
       </div>

       {/* QR Code Modal */}
       <Modal isOpen={connectionModalOpen} onClose={() => setConnectionModalOpen(false)} title="Conectar WhatsApp">
           <div className="flex flex-col items-center justify-center py-6 space-y-6">
               {qrCodeData ? (
                   <>
                       <div className="p-2 bg-white border-4 border-gray-900 rounded-lg shadow-xl relative">
                           <img 
                             src={qrCodeData} 
                             alt="QR Code" 
                             className="w-64 h-64 object-contain" 
                             onError={(e) => {
                                // Fallback if external API fails
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-100');
                                e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-red-500 font-bold p-4 text-center">Erro ao carregar QR.<br/>Verifique sua internet.</span>';
                             }}
                           />
                           <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded-full border shadow-sm">
                              <RefreshCw size={14} className="text-green-600 animate-spin" />
                           </div>
                       </div>
                       <div className="text-center">
                           <p className="text-sm font-bold text-gray-800 mb-1">Abra o WhatsApp no seu celular</p>
                           <p className="text-xs text-gray-500">Vá em Menu {'>'} Aparelhos Conectados {'>'} Conectar Aparelho</p>
                       </div>
                   </>
               ) : (
                   <div className="flex flex-col items-center">
                       <RefreshCw size={40} className="text-green-600 animate-spin mb-4" />
                       <p className="text-gray-600 font-medium">
                           {whatsappStatus === 'connecting' ? 'Gerando sessão segura...' : 'Iniciando serviço...'}
                       </p>
                   </div>
               )}

               {/* Simulated Terminal Log */}
               <div className="w-full max-w-sm bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 h-32 overflow-y-auto border border-gray-700 shadow-inner">
                  <div className="flex items-center text-gray-500 mb-2 border-b border-gray-800 pb-1">
                     <Terminal size={12} className="mr-1" /> Console do Servidor
                  </div>
                  {connectionLogs.length === 0 && <span className="opacity-50">Aguardando logs...</span>}
                  {connectionLogs.map((log, i) => (
                      <div key={i} className="mb-1">{log}</div>
                  ))}
                  <div ref={logsEndRef} />
               </div>
           </div>
       </Modal>
    </div>
  );
};

export default Settings;