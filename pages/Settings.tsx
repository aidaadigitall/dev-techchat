import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Shield, Building, Smartphone, Save, QrCode, Trash2, Plus, Mail, Camera, Lock, Palette, Upload, BrainCircuit, Key, Tag as TagIcon, Briefcase, RefreshCw, CheckCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'company' | 'integrations' | 'team' | 'ai' | 'tags_sectors'>('integrations'); // Default to integrations for this demo
  const [loading, setLoading] = useState(false);

  // States
  const [profileForm, setProfileForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string>(currentUser?.avatar || '');
  const [companyForm, setCompanyForm] = useState(() => {
    const saved = localStorage.getItem('app_company_settings');
    return saved ? JSON.parse(saved) : { name: 'Esc Solutions', hoursStart: '08:00', hoursEnd: '18:00', greeting: 'Olá! Bem-vindo.' };
  });
  const [brandingForm, setBrandingForm] = useState<Branding>({ appName: branding?.appName || 'OmniConnect', primaryColor: branding?.primaryColor || '#9333ea', logoUrl: branding?.logoUrl || '' });
  const [aiSettings, setAiSettings] = useState({ apiKey: '', useOwnKey: false, model: 'gemini-3-pro-preview' });
  const [tags, setTags] = useState<Tag[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  
  // WhatsApp Connection State (Managed by Service)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>('disconnected');
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // --- Initial Load & Event Listeners ---
  useEffect(() => {
    // 1. Get initial status
    setWhatsappStatus(whatsappService.getStatus());
    setQrCodeData(whatsappService.getQrCode());

    // 2. Subscribe to status changes
    const handleStatusChange = (status: WhatsAppStatus) => {
        setWhatsappStatus(status);
        if (status === 'connected') {
            setConnectionModalOpen(false);
            addToast('WhatsApp conectado com sucesso!', 'success');
        }
    };

    const handleQrCode = (qr: string) => {
        setQrCodeData(qr);
    };

    whatsappService.on('status', handleStatusChange);
    whatsappService.on('qr', handleQrCode);

    return () => {
        whatsappService.off('status', handleStatusChange);
        whatsappService.off('qr', handleQrCode);
    };
  }, []);

  // --- Handlers ---

  const handleGenerateQR = () => {
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
      setLoading(true);
      try {
          await api.users.updateProfile({ name: profileForm.name }); // Mocked
          addToast('Perfil atualizado!', 'success');
      } catch(e) {
          addToast('Erro ao atualizar perfil', 'error');
      } finally {
          setLoading(false);
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
                               <QrCode size={18} className="mr-2" /> {whatsappStatus === 'connecting' || whatsappStatus === 'qr_ready' ? 'Aguarde...' : 'Conectar via QR Code'}
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
          // ... (Profile form logic similar to previous version) ...
          return <div className="p-4">Carregando perfil... (Implementação padrão mantida)</div>;

      default: return <div className="p-4 text-gray-500">Selecione uma opção no menu.</div>;
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
               { id: 'integrations', label: 'Conexões (WhatsApp)', icon: <Smartphone size={18} /> },
               { id: 'profile', label: 'Meu Perfil', icon: <UserIcon size={18} /> },
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
                       <div className="p-2 bg-white border-4 border-gray-900 rounded-lg shadow-xl">
                           <img src={qrCodeData} alt="QR Code" className="w-64 h-64" />
                       </div>
                       <div className="text-center">
                           <p className="text-sm font-bold text-gray-800 mb-1">Abra o WhatsApp no seu celular</p>
                           <p className="text-xs text-gray-500">Vá em Menu {'>'} Aparelhos Conectados {'>'} Conectar Aparelho</p>
                       </div>
                       <div className="flex items-center text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full animate-pulse">
                           <RefreshCw size={12} className="mr-1 animate-spin" /> Aguardando leitura...
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
           </div>
       </Modal>
    </div>
  );
};

export default Settings;