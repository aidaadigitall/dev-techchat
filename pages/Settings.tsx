
import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Shield, Building, Smartphone, Save, QrCode, Trash2, Plus, Mail, Camera, Lock, Palette, Upload, BrainCircuit, Key, Tag as TagIcon, Briefcase, RefreshCw, CheckCircle, Terminal, Smartphone as PhoneIcon, Server, Globe, RotateCcw, Edit2 } from 'lucide-react';
import { User, Branding, Tag, Sector } from '../types';
import { api } from '../services/api';
import { whatsappService, WhatsAppStatus } from '../services/whatsapp';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'company' | 'integrations' | 'team' | 'ai'>('profile'); 
  const [loading, setLoading] = useState(false);

  // Profile Form
  const [profileForm, setProfileForm] = useState({ 
    name: currentUser?.name || '', 
    email: currentUser?.email || '', 
  });
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string>(currentUser?.avatar || '');
  
  // Connection State
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  
  // Create Connection
  const [isCreating, setIsCreating] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');

  // WhatsApp Service State
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>('disconnected');
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Load Connections ---
  useEffect(() => {
      if (activeTab === 'integrations') {
          loadConnections();
      }
  }, [activeTab]);

  const loadConnections = async () => {
      try {
          const data = await api.whatsapp.list();
          setConnections(data);
          // Auto select first if exists
          if (data.length > 0 && !selectedConnection) {
              handleSelectConnection(data[0]);
          }
      } catch (e) {
          console.error("Failed to load connections", e);
      }
  };

  // --- WhatsApp Events ---
  useEffect(() => {
    const handleStatusChange = (status: WhatsAppStatus) => {
        setWhatsappStatus(status);
        if (status === 'connected') {
            loadConnections(); // Refresh list to update status UI
            setTimeout(() => {
                setConnectionModalOpen(false);
                addToast('WhatsApp conectado!', 'success');
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
  }, [connectionLogs]);

  // --- Handlers ---

  const handleSelectConnection = (conn: any) => {
      setSelectedConnection(conn);
      whatsappService.setActiveConnection(conn);
      // Status is updated via the service event
  };

  const handleCreateConnection = async () => {
      if (!newConnectionName.trim()) return;
      setIsCreating(true);
      try {
          const newConn = await api.whatsapp.create(newConnectionName);
          setConnections([...connections, newConn]);
          setNewConnectionName('');
          handleSelectConnection(newConn);
          addToast('Conexão criada. Clique em conectar.', 'success');
      } catch (e: any) {
          addToast(e.message || 'Erro ao criar conexão', 'error');
      } finally {
          setIsCreating(false);
      }
  };

  const handleDeleteConnection = async (id: string, instanceName: string) => {
      if (!confirm('Tem certeza? Isso removerá a conexão permanentemente.')) return;
      try {
          await api.whatsapp.delete(id, instanceName);
          setConnections(prev => prev.filter(c => c.id !== id));
          if (selectedConnection?.id === id) setSelectedConnection(null);
          addToast('Conexão removida.', 'success');
      } catch (e) {
          addToast('Erro ao remover.', 'error');
      }
  };

  const handleConnectClick = () => {
      if (!selectedConnection) return;
      setConnectionLogs([]);
      setConnectionModalOpen(true);
      whatsappService.connect(); // Service knows active connection
  };

  const handleDisconnect = async () => {
      if (!selectedConnection) return;
      if (confirm('Deseja desconectar esta sessão?')) {
          await whatsappService.disconnect();
          loadConnections(); // Refresh status
      }
  };

  const handleSaveProfile = async () => {
      // Profile logic...
      addToast('Perfil salvo (Simulação)', 'success');
  };

  // --- Renderers ---

  const renderIntegrations = () => (
      <div className="space-y-6 animate-fadeIn h-full flex flex-col">
          <div className="border-b border-gray-100 pb-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Conexões WhatsApp</h2>
            <p className="text-sm text-gray-500">Gerencie seus números conectados.</p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6 h-full">
              {/* List */}
              <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col">
                  <div className="mb-4">
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 border rounded-lg px-2 text-sm"
                            placeholder="Nome (ex: Vendas)"
                            value={newConnectionName}
                            onChange={e => setNewConnectionName(e.target.value)}
                          />
                          <button 
                            onClick={handleCreateConnection} 
                            disabled={isCreating}
                            className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                              {isCreating ? <RefreshCw className="animate-spin" size={16}/> : <Plus size={16} />}
                          </button>
                      </div>
                  </div>
                  <div className="space-y-2 overflow-y-auto max-h-[400px]">
                      {connections.map(conn => (
                          <div 
                            key={conn.id} 
                            onClick={() => handleSelectConnection(conn)}
                            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between ${selectedConnection?.id === conn.id ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'}`}
                          >
                              <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full mr-3 ${conn.status === 'connected' || conn.status === 'open' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <div>
                                      <p className="text-sm font-bold text-gray-700">{conn.name}</p>
                                      <p className="text-[10px] text-gray-400">ID: ...{conn.instance_name?.slice(-6)}</p>
                                  </div>
                              </div>
                              <button onClick={(e) => {e.stopPropagation(); handleDeleteConnection(conn.id, conn.instance_name)}} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                          </div>
                      ))}
                      {connections.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Nenhuma conexão.</p>}
                  </div>
              </div>

              {/* Detail */}
              <div className="flex-1 space-y-6">
                  {selectedConnection ? (
                      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                  <Smartphone size={24} className="mr-2 text-purple-600"/> {selectedConnection.name}
                              </h3>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${whatsappStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {whatsappStatus === 'connected' ? 'Online' : 'Offline'}
                              </div>
                          </div>

                          <div className="flex gap-3">
                              {whatsappStatus === 'connected' ? (
                                  <button onClick={handleDisconnect} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">Desconectar</button>
                              ) : (
                                  <button onClick={handleConnectClick} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold flex items-center shadow-md">
                                      <QrCode size={18} className="mr-2" /> Conectar WhatsApp
                                  </button>
                              )}
                          </div>
                      </div>
                  ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                          Selecione uma conexão
                      </div>
                  )}
              </div>
          </div>
      </div>
  );

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
       {/* Sidebar Navigation */}
       <div className="w-64 bg-white border-r border-gray-200 flex flex-col pt-6 pb-4 hidden md:flex">
          <div className="px-6 mb-6">
             <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
          </div>
          <nav className="flex-1 space-y-1 px-3">
             {[
               { id: 'profile', label: 'Meu Perfil', icon: <UserIcon size={18} /> },
               { id: 'integrations', label: 'Conexões', icon: <Smartphone size={18} /> },
               { id: 'company', label: 'Empresa', icon: <Building size={18} /> },
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
          <div className="max-w-5xl mx-auto h-full">
             {activeTab === 'profile' && (
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                     <h2 className="text-lg font-bold mb-4">Perfil</h2>
                     <div className="space-y-4">
                         <input className="w-full border p-2 rounded" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} placeholder="Nome" />
                         <input className="w-full border p-2 rounded bg-gray-100" value={profileForm.email} disabled />
                         <button onClick={handleSaveProfile} className="bg-purple-600 text-white px-4 py-2 rounded">Salvar</button>
                     </div>
                 </div>
             )}
             {activeTab === 'integrations' && renderIntegrations()}
             {activeTab === 'company' && <div className="text-gray-500">Configurações da empresa...</div>}
          </div>
       </div>

       {/* QR Code Modal */}
       <Modal isOpen={connectionModalOpen} onClose={() => setConnectionModalOpen(false)} title="Escanear QR Code">
           <div className="flex flex-col items-center justify-center py-4 space-y-6">
               {whatsappStatus === 'connecting' ? (
                   <div className="flex flex-col items-center">
                       <RefreshCw size={40} className="text-purple-600 animate-spin mb-4" />
                       <p className="text-gray-500">Gerando sessão segura...</p>
                   </div>
               ) : qrCodeData ? (
                   <div className="p-3 bg-white border-4 border-gray-900 rounded-xl shadow-xl">
                       <img src={qrCodeData} alt="QR Code" className="w-64 h-64 object-contain" />
                   </div>
               ) : (
                   <div className="text-gray-500">Aguardando...</div>
               )}
               
               <div className="w-full bg-gray-900 rounded-lg p-3 font-mono text-[10px] text-green-400 h-32 overflow-y-auto">
                  {connectionLogs.map((log, i) => <div key={i}>{log}</div>)}
                  <div ref={logsEndRef} />
               </div>
           </div>
       </Modal>
    </div>
  );
};

export default Settings;
