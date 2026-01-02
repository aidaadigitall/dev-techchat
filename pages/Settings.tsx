import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Shield, Building, Smartphone, Save, QrCode, Trash2, Plus, Mail, Camera, Lock, Palette, Upload, BrainCircuit, Key, Tag as TagIcon, Briefcase, RefreshCw, CheckCircle, Terminal, Smartphone as PhoneIcon, Server, Globe, RotateCcw } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'company' | 'integrations' | 'team' | 'ai' | 'tags_sectors'>('profile'); 
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
  
  // WhatsApp Configuration State
  const [waConfig, setWaConfig] = useState({
      apiUrl: localStorage.getItem('wa_api_url') || 'http://localhost:8083',
      apiKey: localStorage.getItem('wa_api_key') || '64EA06725633-4DBC-A2ED-F469AA0CDD14', // Updated Key
      instanceName: localStorage.getItem('wa_instance_name') || 'Whats-6010'
  });

  // WhatsApp Connection State (Managed by Service)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>('disconnected');
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Initial Load & Event Listeners ---
  useEffect(() => {
    // 1. Get initial status
    setWhatsappStatus(whatsappService.getStatus());
    setQrCodeData(whatsappService.getQrCode());
    setConnectionLogs(whatsappService.getLogs());

    // 2. FORCE CHECK REAL CONNECTION (Fix for persistence issue)
    whatsappService.checkConnection();

    // 3. Subscribe to status changes
    const handleStatusChange = (status: WhatsAppStatus) => {
        setWhatsappStatus(status);
        if (status === 'connected') {
            setTimeout(() => {
                setConnectionModalOpen(false);
                addToast('WhatsApp conectado com sucesso!', 'success');
            }, 1500);
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

  // --- Handlers ---

  const handleSaveWaConfig = async () => {
      // Force update logic (will disconnect old instance if name changed)
      await whatsappService.updateConfig(waConfig);
      addToast('Configurações salvas. Se o nome mudou, a conexão será reiniciada.', 'success');
  };

  const handleGenerateQR = async () => {
    if(!waConfig.apiUrl) {
        addToast('Configure a URL da API primeiro.', 'warning');
        return;
    }
    
    // IMPORTANT: Ensure the service uses the latest values from the inputs
    await whatsappService.updateConfig(waConfig);

    setConnectionLogs([]); // Clear previous logs
    setConnectionModalOpen(true);
    whatsappService.connect();
  };

  const handleDisconnect = () => {
      if(window.confirm("Deseja realmente desconectar e remover esta instância? Você precisará escanear o QR Code novamente.")) {
          whatsappService.disconnect();
          addToast('Desconexão iniciada. Aguarde...', 'info');
      }
  };

  const handleSaveProfile = async () => {
      if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
          addToast('As senhas não coincidem.', 'error');
          return;
      }

      setLoading(true);
      try {
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

  // --- Renderers ---

  const renderContent = () => {
    switch(activeTab) {
      case 'integrations':
        return (
           <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Conexões & Integrações</h2>
                <p className="text-sm text-gray-500">Gerencie a conexão com o WhatsApp Web (Via Evolution API).</p>
              </div>
              
              {/* API Configuration Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
                 <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center">
                    <Server size={18} className="mr-2 text-purple-600" /> Configuração do Servidor (Evolution API)
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">URL da API (Webhook/Gateway)</label>
                        <div className="relative">
                            <Globe size={14} className="absolute left-3 top-3 text-gray-400" />
                            <input 
                                type="text" 
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" 
                                placeholder="ex: http://localhost:8083"
                                value={waConfig.apiUrl}
                                onChange={e => setWaConfig({...waConfig, apiUrl: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Global API Key</label>
                        <div className="relative">
                            <Key size={14} className="absolute left-3 top-3 text-gray-400" />
                            <input 
                                type="password" 
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" 
                                placeholder="Chave da API Evolution"
                                value={waConfig.apiKey}
                                onChange={e => setWaConfig({...waConfig, apiKey: e.target.value})}
                            />
                        </div>
                    </div>
                 </div>
                 
                 {/* Instance Name Field Highlighted */}
                 <div className="mb-4 bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <label className="block text-xs font-bold text-purple-800 mb-1">Nome da Instância (Conexão)</label>
                    <p className="text-[10px] text-purple-600 mb-2">Este é o nome usado para identificar este telefone na Evolution API.</p>
                    <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none" 
                        placeholder="Ex: Whats-6010"
                        value={waConfig.instanceName}
                        onChange={e => setWaConfig({...waConfig, instanceName: e.target.value})}
                    />
                 </div>

                 <div className="flex justify-end">
                    <button onClick={handleSaveWaConfig} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black flex items-center shadow-md">
                        <Save size={16} className="mr-2" /> Salvar & Aplicar
                    </button>
                 </div>
              </div>

              {/* WhatsApp Connection Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                       <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white transition-colors duration-500 ${whatsappStatus === 'connected' ? 'bg-[#25D366]' : 'bg-gray-300'}`}>
                          <Smartphone size={32} />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-gray-900">Sessão do WhatsApp</h3>
                          {whatsappStatus === 'connected' ? (
                              <p className="text-sm text-green-600 font-medium flex items-center">
                                 <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> Conectado
                              </p>
                          ) : whatsappStatus === 'connecting' || whatsappStatus === 'qr_ready' || whatsappStatus === 'authenticating' ? (
                              <p className="text-sm text-yellow-600 font-medium flex items-center">
                                 <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></span> 
                                 {whatsappStatus === 'authenticating' ? 'Autenticando...' : 'Aguardando conexão...'}
                              </p>
                          ) : (
                              <p className="text-sm text-red-500 font-medium flex items-center">
                                 <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span> Desconectado
                              </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">Conectado como: <strong>{waConfig.instanceName}</strong></p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       {whatsappStatus === 'connected' ? (
                           <button onClick={handleDisconnect} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium bg-white transition-colors">
                              Desconectar
                           </button>
                       ) : (
                           <div className="flex gap-2">
                               <button 
                                 onClick={handleDisconnect} 
                                 className="px-3 py-2 border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-100 text-sm font-medium bg-white transition-colors"
                                 title="Forçar reset da instância"
                               >
                                  <RotateCcw size={18} />
                               </button>
                               <button 
                                 onClick={handleGenerateQR} 
                                 disabled={whatsappStatus === 'connecting' || whatsappStatus === 'qr_ready' || whatsappStatus === 'authenticating'}
                                 className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold flex items-center shadow-md disabled:opacity-50 transition-all active:scale-95"
                               >
                                   <QrCode size={18} className="mr-2" /> 
                                   {whatsappStatus === 'connecting' ? 'Iniciando...' : 'Conectar Agora'}
                               </button>
                           </div>
                       )}
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
                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </div>
                     </div>

                     <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                              <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
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
                        <div className="pt-4 flex justify-end">
                           <button onClick={handleSaveProfile} disabled={loading} className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 font-medium shadow-sm flex items-center">
                              {loading ? <RefreshCw size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                              Salvar Alterações
                           </button>
                        </div>
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
       <div className="w-64 bg-white border-r border-gray-200 flex flex-col pt-6 pb-4 hidden md:flex">
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

       <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
             {renderContent()}
          </div>
       </div>

       {/* QR Code Connection Modal */}
       <Modal isOpen={connectionModalOpen} onClose={() => { if(whatsappStatus === 'connected') setConnectionModalOpen(false); else { whatsappService.disconnect(); setConnectionModalOpen(false); } }} title="Conectar WhatsApp">
           <div className="flex flex-col items-center justify-center py-4 space-y-6">
               
               {/* Status Indicator */}
               <div className="w-full flex justify-center mb-2">
                   <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center ${
                       whatsappStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
                       whatsappStatus === 'qr_ready' ? 'bg-blue-100 text-blue-700' :
                       whatsappStatus === 'authenticating' ? 'bg-purple-100 text-purple-700' :
                       whatsappStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                   }`}>
                       {whatsappStatus === 'connecting' && <RefreshCw size={12} className="animate-spin mr-2" />}
                       {whatsappStatus === 'authenticating' && <Lock size={12} className="animate-pulse mr-2" />}
                       {whatsappStatus === 'connected' && <CheckCircle size={12} className="mr-2" />}
                       
                       {whatsappStatus === 'connecting' ? 'Iniciando Sessão...' :
                        whatsappStatus === 'qr_ready' ? 'Aguardando Leitura' :
                        whatsappStatus === 'authenticating' ? 'Autenticando Dispositivo' :
                        whatsappStatus === 'connected' ? 'Conectado com Sucesso' : 'Desconectado'}
                   </div>
               </div>

               {/* QR Display Area */}
               {whatsappStatus === 'authenticating' ? (
                   <div className="w-64 h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 animate-pulse">
                       <Lock size={48} className="text-purple-300 mb-4" />
                       <p className="text-sm text-gray-500 font-medium">Validando credenciais...</p>
                   </div>
               ) : qrCodeData ? (
                   <div className="relative group">
                       <div className="p-3 bg-white border-4 border-gray-900 rounded-xl shadow-xl">
                           <img 
                             src={qrCodeData.startsWith('data:image') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                             alt="QR Code" 
                             className="w-64 h-64 object-contain"
                           />
                       </div>
                   </div>
               ) : (
                   <div className="w-64 h-64 flex items-center justify-center">
                       <RefreshCw size={40} className="text-green-600 animate-spin" />
                   </div>
               )}

               {/* Instructions */}
               {whatsappStatus === 'qr_ready' && (
                   <div className="text-center space-y-1">
                       <p className="text-sm font-bold text-gray-800">Abra o WhatsApp no seu celular</p>
                       <p className="text-xs text-gray-500">Menu {'>'} Aparelhos Conectados {'>'} Conectar Aparelho</p>
                   </div>
               )}

               {/* Logs Console */}
               <div className="w-full bg-gray-900 rounded-lg p-3 font-mono text-[10px] text-green-400 h-32 overflow-y-auto border border-gray-800 shadow-inner flex flex-col">
                  <div className="flex items-center text-gray-500 mb-2 border-b border-gray-800 pb-1 sticky top-0 bg-gray-900">
                     <Terminal size={10} className="mr-1" /> Terminal de Conexão
                  </div>
                  <div className="flex-1 space-y-1">
                    {connectionLogs.map((log, i) => (
                        <div key={i} className="break-all opacity-80 hover:opacity-100">{log}</div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
               </div>
           </div>
       </Modal>
    </div>
  );
};

export default Settings;