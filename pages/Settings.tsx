import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Shield, Building, Smartphone, Save, QrCode, Trash2, Plus, Mail, Camera, Lock, Palette, Upload, BrainCircuit, Key, Tag as TagIcon, Briefcase } from 'lucide-react';
import { User, Branding, Tag, Sector } from '../types';
import { MOCK_USERS } from '../constants';
import { api } from '../services/api';
import Modal from '../components/Modal';

interface SettingsProps {
  currentUser?: User;
  onUpdateUser?: (user: User) => void;
  branding?: Branding;
  onUpdateBranding?: (branding: Branding) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateUser, branding, onUpdateBranding }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'company' | 'integrations' | 'team' | 'ai' | 'tags_sectors'>('company');
  const [loading, setLoading] = useState(false);

  // --- STATES ---

  // 1. Profile State
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string>(currentUser?.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Company State (Dados da Empresa) - Persisted
  const [companyForm, setCompanyForm] = useState(() => {
    const saved = localStorage.getItem('app_company_settings');
    return saved ? JSON.parse(saved) : {
      name: 'Esc Solutions', // Default from screenshot mock
      hoursStart: '08:00',
      hoursEnd: '18:00',
      greeting: 'Olá! Bem-vindo à Minha Empresa. Como podemos ajudar hoje?'
    };
  });

  // 3. Branding State (White Label)
  const [brandingForm, setBrandingForm] = useState<Branding>({
    appName: branding?.appName || 'OmniConnect',
    primaryColor: branding?.primaryColor || '#9333ea',
    logoUrl: branding?.logoUrl || ''
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  // 4. Team State
  const [users, setUsers] = useState(MOCK_USERS);

  // 5. AI Settings State
  const [aiSettings, setAiSettings] = useState({
    apiKey: '',
    useOwnKey: false,
    model: 'gemini-3-pro-preview'
  });

  // 6. Tags & Sectors State
  const [tags, setTags] = useState<Tag[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<'tag' | 'sector'>('tag');
  const [metadataForm, setMetadataForm] = useState({ id: '', name: '', color: '#3B82F6' });

  // Predefined Colors for Palette
  const COLOR_PALETTE = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981', 
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', 
    '#F43F5E', '#6B7280', '#000000'
  ];

  // --- EFFECTS ---

  useEffect(() => {
    if (activeTab === 'tags_sectors') {
      loadMetadata();
    }
  }, [activeTab]);

  const loadMetadata = async () => {
    const [fetchedTags, fetchedSectors] = await Promise.all([
      api.metadata.getTags(),
      api.metadata.getSectors()
    ]);
    setTags(fetchedTags);
    setSectors(fetchedSectors);
  };

  // --- HANDLERS ---

  // Update branding form when props change (sync)
  useEffect(() => {
    if (branding) {
      setBrandingForm({
        appName: branding.appName,
        primaryColor: branding.primaryColor,
        logoUrl: branding.logoUrl || ''
      });
    }
  }, [branding]);

  // Profile Handlers
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    setLoading(true);
    setTimeout(() => {
      if (onUpdateUser && currentUser) {
        onUpdateUser({
          ...currentUser,
          name: profileForm.name,
          avatar: profileAvatarPreview
        });
      }
      setLoading(false);
      alert('Perfil atualizado com sucesso!');
    }, 800);
  };

  // Company Handlers
  const handleSaveCompany = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('app_company_settings', JSON.stringify(companyForm));
      setLoading(false);
      alert('Dados da empresa salvos com sucesso!');
    }, 800);
  };

  // Branding Handlers
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Use FileReader to convert to Base64 for persistence
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandingForm(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = () => {
    setLoading(true);
    setTimeout(() => {
      if (onUpdateBranding) {
        onUpdateBranding(brandingForm);
      }
      setLoading(false);
      alert('Identidade visual (White Label) aplicada com sucesso!');
    }, 500); // Faster update for visual feedback
  };

  // AI Handlers
  const handleSaveAI = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // In real app, this would validate the key
      alert('Configurações de IA salvas com sucesso!');
    }, 1000);
  };

  // Metadata (Tags & Sectors) Handlers
  const handleOpenMetadataModal = (type: 'tag' | 'sector', item?: Tag | Sector) => {
    setEditingType(type);
    if (item) {
      setMetadataForm({ id: item.id, name: item.name, color: item.color });
    } else {
      setMetadataForm({ id: '', name: '', color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] });
    }
    setMetadataModalOpen(true);
  };

  const handleSaveMetadata = async () => {
    if (!metadataForm.name) return;

    if (editingType === 'tag') {
      let newTags = [...tags];
      if (metadataForm.id) {
        newTags = newTags.map(t => t.id === metadataForm.id ? { ...metadataForm } as Tag : t);
      } else {
        newTags.push({ ...metadataForm, id: Date.now().toString() } as Tag);
      }
      setTags(newTags);
      await api.metadata.saveTags(newTags);
    } else {
      let newSectors = [...sectors];
      if (metadataForm.id) {
        newSectors = newSectors.map(s => s.id === metadataForm.id ? { ...metadataForm } as Sector : s);
      } else {
        newSectors.push({ ...metadataForm, id: Date.now().toString() } as Sector);
      }
      setSectors(newSectors);
      await api.metadata.saveSectors(newSectors);
    }
    setMetadataModalOpen(false);
  };

  const handleDeleteMetadata = async (type: 'tag' | 'sector', id: string) => {
    if (!confirm(`Deseja realmente excluir este ${type === 'tag' ? 'etiqueta' : 'setor'}?`)) return;

    if (type === 'tag') {
      const newTags = tags.filter(t => t.id !== id);
      setTags(newTags);
      await api.metadata.saveTags(newTags);
    } else {
      const newSectors = sectors.filter(s => s.id !== id);
      setSectors(newSectors);
      await api.metadata.saveSectors(newSectors);
    }
  };

  // --- RENDERERS ---

  const renderContent = () => {
    switch(activeTab) {
      case 'company':
        return (
          <div className="space-y-6 animate-fadeIn">
             <div className="border-b border-gray-100 pb-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Dados da Empresa</h2>
             </div>
             
             <div className="space-y-6 max-w-3xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                  <input 
                    type="text" 
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Atendimento</label>
                  <div className="grid grid-cols-2 gap-4">
                     <input 
                       type="time" 
                       value={companyForm.hoursStart}
                       onChange={(e) => setCompanyForm({...companyForm, hoursStart: e.target.value})}
                       className="border border-gray-300 rounded-md p-2.5 bg-white shadow-sm focus:ring-purple-500 focus:border-purple-500" 
                     />
                     <input 
                       type="time" 
                       value={companyForm.hoursEnd}
                       onChange={(e) => setCompanyForm({...companyForm, hoursEnd: e.target.value})}
                       className="border border-gray-300 rounded-md p-2.5 bg-white shadow-sm focus:ring-purple-500 focus:border-purple-500" 
                     />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem de Saudação</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded-md p-3 h-32 bg-white shadow-sm focus:ring-purple-500 focus:border-purple-500 resize-none" 
                    value={companyForm.greeting}
                    onChange={(e) => setCompanyForm({...companyForm, greeting: e.target.value})}
                  />
                </div>
             </div>

             <div className="flex justify-end pt-6 border-t border-gray-100">
               <button 
                 onClick={handleSaveCompany}
                 disabled={loading}
                 className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 flex items-center font-medium shadow-sm transition-colors disabled:opacity-70"
               >
                 {loading ? 'Salvando...' : (
                   <>
                     <Save size={18} className="mr-2" /> Salvar Empresa
                   </>
                 )}
               </button>
            </div>
          </div>
        );

      case 'branding':
        return (
          <div className="space-y-6 animate-fadeIn">
             <div className="border-b border-gray-100 pb-4 mb-4">
               <h2 className="text-xl font-semibold text-gray-800">Identidade Visual (White Label)</h2>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Aplicação</label>
                    <input 
                      type="text" 
                      value={brandingForm.appName}
                      onChange={e => setBrandingForm({...brandingForm, appName: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2.5 bg-white shadow-sm focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Ex: Minha Empresa CRM"
                    />
                    <p className="text-xs text-gray-500 mt-1">Este nome aparecerá no título da aba do navegador e no menu lateral.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor Principal</label>
                    <div className="flex items-center gap-3">
                       <input 
                         type="color" 
                         value={brandingForm.primaryColor}
                         onChange={e => setBrandingForm({...brandingForm, primaryColor: e.target.value})}
                         className="h-10 w-20 border border-gray-300 rounded cursor-pointer p-1 bg-white shadow-sm"
                       />
                       <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{brandingForm.primaryColor}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Define a cor dos botões, links e destaques do sistema.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logotipo</label>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors bg-white" 
                      onClick={() => logoInputRef.current?.click()}
                    >
                       {brandingForm.logoUrl ? (
                         <div className="relative group">
                            <img src={brandingForm.logoUrl} alt="Logo Preview" className="h-16 object-contain mb-2" />
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <span className="text-xs font-bold text-gray-600">Trocar</span>
                            </div>
                         </div>
                       ) : (
                         <Upload size={32} className="text-gray-400 mb-2" />
                       )}
                       <span className="text-sm text-purple-600 font-medium mt-2">Clique para fazer upload</span>
                       <span className="text-xs text-gray-400">PNG ou SVG (Fundo transparente)</span>
                    </div>
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} />
                  </div>
               </div>

               {/* Preview Section */}
               <div className="bg-gray-100 rounded-xl p-6 border border-gray-200 h-fit">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">Pré-visualização</h4>
                  
                  {/* Fake Sidebar Preview */}
                  <div className="bg-white w-full rounded-lg shadow-md overflow-hidden flex mb-6">
                     <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
                        {/* Logo Preview */}
                        {brandingForm.logoUrl ? (
                           <img src={brandingForm.logoUrl} className="w-10 h-10 object-contain" />
                        ) : (
                           <div 
                             className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm"
                             style={{ backgroundColor: brandingForm.primaryColor }}
                           >
                              {brandingForm.appName.charAt(0)}
                           </div>
                        )}
                        
                        <div className="w-10 h-10 rounded bg-gray-50"></div>
                        <div 
                          className="w-10 h-10 rounded flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: `${brandingForm.primaryColor}25`, color: brandingForm.primaryColor }}
                        >
                           <Palette size={20} />
                        </div>
                     </div>
                     <div className="flex-1 p-4 bg-gray-50/50">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
                        <div className="h-3 w-48 bg-gray-100 rounded mb-2"></div>
                        <div className="h-3 w-40 bg-gray-100 rounded"></div>
                        
                        <div className="mt-4">
                           <button 
                             className="px-4 py-2 rounded text-white text-xs font-medium shadow-sm w-full mb-2"
                             style={{ backgroundColor: brandingForm.primaryColor }}
                           >
                              Botão Principal
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
             </div>

             <div className="flex justify-end pt-6 border-t border-gray-100">
                <button 
                  onClick={handleSaveBranding}
                  disabled={loading}
                  className="text-white px-6 py-2.5 rounded-lg hover:opacity-90 flex items-center font-medium shadow-sm transition-opacity"
                  style={{ backgroundColor: brandingForm.primaryColor }}
                >
                  {loading ? 'Aplicando...' : (
                    <>
                       <Save size={18} className="mr-2" /> Aplicar White Label
                    </>
                  )}
                </button>
             </div>
          </div>
        );

      case 'tags_sectors':
        return (
          <div className="space-y-8 animate-fadeIn">
             <div className="border-b border-gray-100 pb-4 mb-4">
               <h2 className="text-xl font-semibold text-gray-800">Tags & Setores</h2>
               <p className="text-sm text-gray-500">Gerencie as etiquetas de clientes e os departamentos de atendimento.</p>
             </div>

             {/* Tags Section */}
             <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <TagIcon size={20} className="mr-2 text-purple-600" /> Etiquetas (Tags)
                   </h3>
                   <button 
                     onClick={() => handleOpenMetadataModal('tag')}
                     className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors"
                   >
                      <Plus size={16} className="mr-1" /> Nova Tag
                   </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {tags.map(tag => (
                      <div key={tag.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:shadow-sm transition-shadow">
                         <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full mr-2 shadow-sm" style={{ backgroundColor: tag.color }}></div>
                            <span className="text-sm font-medium text-gray-700">{tag.name}</span>
                         </div>
                         <div className="flex gap-1">
                            <button onClick={() => handleOpenMetadataModal('tag', tag)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-white rounded"><Palette size={14}/></button>
                            <button onClick={() => handleDeleteMetadata('tag', tag.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded"><Trash2 size={14}/></button>
                         </div>
                      </div>
                   ))}
                   {tags.length === 0 && <p className="text-gray-400 text-sm italic col-span-full">Nenhuma tag cadastrada.</p>}
                </div>
             </div>

             {/* Sectors Section */}
             <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <Briefcase size={20} className="mr-2 text-blue-600" /> Setores / Departamentos
                   </h3>
                   <button 
                     onClick={() => handleOpenMetadataModal('sector')}
                     className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors"
                   >
                      <Plus size={16} className="mr-1" /> Novo Setor
                   </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {sectors.map(sector => (
                      <div key={sector.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:shadow-sm transition-shadow">
                         <div className="flex items-center">
                            <div className="w-4 h-4 rounded mr-2 shadow-sm flex items-center justify-center" style={{ backgroundColor: sector.color }}>
                               <span className="text-[8px] text-white font-bold">{sector.name.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{sector.name}</span>
                         </div>
                         <div className="flex gap-1">
                            <button onClick={() => handleOpenMetadataModal('sector', sector)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded"><Palette size={14}/></button>
                            <button onClick={() => handleDeleteMetadata('sector', sector.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded"><Trash2 size={14}/></button>
                         </div>
                      </div>
                   ))}
                   {sectors.length === 0 && <p className="text-gray-400 text-sm italic col-span-full">Nenhum setor cadastrado.</p>}
                </div>
             </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6 animate-fadeIn">
             <div className="border-b border-gray-100 pb-4 mb-4">
               <h2 className="text-xl font-semibold text-gray-800">Inteligência Artificial (Gemini)</h2>
               <p className="text-sm text-gray-500">Configure a chave de API para habilitar agentes, transcrição e análise inteligente.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  {/* Configuration Card */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                           <Key size={18} className="mr-2 text-purple-600" /> Configuração da Chave
                        </h3>
                        <div className="flex items-center">
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={aiSettings.useOwnKey}
                                onChange={e => setAiSettings({...aiSettings, useOwnKey: e.target.checked})}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                              <span className="ml-3 text-sm font-medium text-gray-700">Usar minha chave (BYOK)</span>
                           </label>
                        </div>
                     </div>

                     {aiSettings.useOwnKey ? (
                        <div className="space-y-4 animate-fadeIn">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Google Gemini API Key</label>
                              <div className="relative">
                                 <input 
                                   type="password" 
                                   value={aiSettings.apiKey}
                                   onChange={e => setAiSettings({...aiSettings, apiKey: e.target.value})}
                                   className="w-full border border-gray-300 rounded-md p-2.5 pr-10 focus:ring-purple-500 focus:border-purple-500"
                                   placeholder="AIzaSy..."
                                 />
                                 <Lock size={16} className="absolute right-3 top-3 text-gray-400" />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Sua chave é armazenada com criptografia e usada apenas para suas requisições.</p>
                           </div>
                           <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-100 flex items-start">
                              <Shield size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                              <span>Ao usar sua própria chave, você remove os limites de tokens impostos pelo plano e paga diretamente ao Google.</span>
                           </div>
                        </div>
                     ) : (
                        <div className="space-y-4 animate-fadeIn">
                           <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-600 mb-2">Você está utilizando a infraestrutura compartilhada da <strong>OmniConnect</strong>.</p>
                              
                              <div className="mb-1 flex justify-between text-xs font-semibold text-gray-700">
                                 <span>Consumo Mensal</span>
                                 <span>15.4k / 50k Tokens</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                 <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '30%' }}></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">Renova em 01/02/2025.</p>
                           </div>
                           <p className="text-xs text-gray-500">Para aumentar seu limite, faça upgrade do plano ou ative a opção "Usar minha chave".</p>
                        </div>
                     )}
                  </div>
               </div>

               <div className="space-y-6">
                  {/* Model Selection */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                     <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <BrainCircuit size={18} className="mr-2 text-blue-600" /> Preferências do Modelo
                     </h3>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Modelo Padrão</label>
                        <select 
                           className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-purple-500 focus:border-purple-500 bg-white"
                           value={aiSettings.model}
                           onChange={e => setAiSettings({...aiSettings, model: e.target.value})}
                        >
                           <option value="gemini-3-pro-preview">Gemini 1.5 Pro (Mais inteligente)</option>
                           <option value="gemini-3-flash-preview">Gemini 1.5 Flash (Mais rápido)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Define o modelo utilizado para resumo de conversas e respostas automáticas.</p>
                     </div>
                  </div>
                  
                  <div className="flex justify-end">
                     <button 
                        onClick={handleSaveAI}
                        disabled={loading}
                        className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 flex items-center font-medium shadow-sm transition-colors disabled:opacity-70"
                     >
                        {loading ? 'Salvando...' : (
                           <>
                              <Save size={18} className="mr-2" /> Salvar Configurações IA
                           </>
                        )}
                     </button>
                  </div>
               </div>
             </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-gray-100 pb-4 mb-4">
               <h2 className="text-xl font-semibold text-gray-800">Meu Perfil</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Avatar Section */}
               <div className="md:col-span-1 flex flex-col items-center">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {profileAvatarPreview ? (
                      <img src={profileAvatarPreview} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-4xl font-bold border-4 border-white shadow-lg">
                        {profileForm.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <Camera className="text-white" size={24} />
                    </div>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="mt-3 text-sm text-purple-600 font-medium hover:underline">
                    Alterar Foto
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
               </div>

               {/* Form Section */}
               <div className="md:col-span-2 space-y-5">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                      <input 
                        type="text" 
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input 
                          type="email" 
                          name="email"
                          value={profileForm.email}
                          disabled
                          className="w-full border border-gray-300 rounded-md p-2.5 pl-9 bg-gray-100 text-gray-500 cursor-not-allowed" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mt-2">
                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center"><Lock size={14} className="mr-1"/> Segurança</h3>
                    <div className="space-y-3">
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                          <input 
                            type="password" 
                            name="currentPassword"
                            placeholder="••••••••"
                            className="w-full border border-gray-300 rounded-md p-2.5 bg-white shadow-sm" 
                          />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                            <input 
                              type="password" 
                              name="newPassword"
                              placeholder="••••••••"
                              className="w-full border border-gray-300 rounded-md p-2.5 bg-white shadow-sm" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                            <input 
                              type="password" 
                              name="confirmPassword"
                              placeholder="••••••••"
                              className="w-full border border-gray-300 rounded-md p-2.5 bg-white shadow-sm" 
                            />
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                     <button 
                       onClick={handleSaveProfile}
                       disabled={loading}
                       className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 flex items-center shadow-sm disabled:opacity-70"
                     >
                       <Save size={18} className="mr-2" /> Salvar Alterações
                     </button>
                  </div>
               </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
           <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Conexões & Integrações</h2>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 bg-[#25D366] rounded-xl flex items-center justify-center text-white">
                          <Smartphone size={32} />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-gray-900">WhatsApp Principal</h3>
                          <p className="text-sm text-green-600 font-medium flex items-center">
                             <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> Conectado
                          </p>
                          <p className="text-xs text-gray-500">+55 11 99999-9999 • Última sync: 2 min atrás</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium bg-white">Desconectar</button>
                       <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium bg-white">Recarregar</button>
                    </div>
                 </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm opacity-60">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                          <QrCode size={32} />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-gray-900">Nova Conexão</h3>
                          <p className="text-sm text-gray-500">Adicione um novo número</p>
                       </div>
                    </div>
                    <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center">
                       <Plus size={16} className="mr-2" /> Adicionar
                    </button>
                 </div>
              </div>
           </div>
        );

      case 'team':
        return (
           <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
                 <h2 className="text-xl font-semibold text-gray-800">Gerenciar Equipe</h2>
                 <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center">
                    <Plus size={16} className="mr-2" /> Novo Usuário
                 </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                       <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                       {users.map(user => (
                          <tr key={user.id}>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                   <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs mr-3">
                                      {user.name.charAt(0)}
                                   </div>
                                   <div>
                                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                      <div className="text-xs text-gray-500">{user.email}</div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                   {user.role}
                                </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 capitalize">
                                   {user.status}
                                </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        );

      default: return null;
    }
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
       {/* Sidebar Settings */}
       <div className="w-64 bg-white border-r border-gray-200 flex flex-col pt-6 pb-4">
          <div className="px-6 mb-6">
             <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
             <p className="text-xs text-gray-500 mt-1">Gerencie sua conta e sistema.</p>
          </div>
          <nav className="flex-1 space-y-1 px-3">
             {[
               { id: 'profile', label: 'Meu Perfil', icon: <UserIcon size={18} /> },
               { id: 'company', label: 'Empresa', icon: <Building size={18} /> },
               { id: 'ai', label: 'IA & API', icon: <BrainCircuit size={18} /> },
               { id: 'tags_sectors', label: 'Tags & Setores', icon: <TagIcon size={18} /> },
               { id: 'branding', label: 'Identidade Visual', icon: <Palette size={18} /> },
               { id: 'integrations', label: 'Conexões', icon: <Smartphone size={18} /> },
               { id: 'team', label: 'Equipe', icon: <Shield size={18} /> },
             ].map(item => (
                <button
                   key={item.id}
                   onClick={() => setActiveTab(item.id as any)}
                   className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === item.id 
                         ? 'bg-purple-50 text-purple-700' 
                         : 'text-gray-600 hover:bg-gray-50 text-gray-700'
                   }`}
                >
                   <span className="mr-3">{item.icon}</span> {item.label}
                </button>
             ))}
          </nav>
       </div>

       {/* Content Area */}
       <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
             {renderContent()}
          </div>
       </div>

       {/* Metadata Edit Modal */}
       <Modal 
         isOpen={metadataModalOpen} 
         onClose={() => setMetadataModalOpen(false)}
         title={editingType === 'tag' ? (metadataForm.id ? 'Editar Tag' : 'Nova Tag') : (metadataForm.id ? 'Editar Setor' : 'Novo Setor')}
         size="sm"
         footer={
            <div className="flex justify-end gap-2">
               <button onClick={() => setMetadataModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancelar</button>
               <button onClick={handleSaveMetadata} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">Salvar</button>
            </div>
         }
       >
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-purple-500"
                  value={metadataForm.name}
                  onChange={e => setMetadataForm({...metadataForm, name: e.target.value})}
                  placeholder={editingType === 'tag' ? "Ex: Lead Quente" : "Ex: Financeiro"}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                   {COLOR_PALETTE.map(color => (
                      <button
                        key={color}
                        onClick={() => setMetadataForm({...metadataForm, color})}
                        className={`w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 flex items-center justify-center ${metadataForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                        style={{ backgroundColor: color }}
                      >
                         {metadataForm.color === color && <span className="text-white text-xs">✓</span>}
                      </button>
                   ))}
                </div>
             </div>
          </div>
       </Modal>
    </div>
  );
};

export default Settings;