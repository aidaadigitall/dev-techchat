
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Filter, MoreHorizontal, Shield, Lock, Power, CreditCard, Plus, Save, Trash2, Edit, BrainCircuit, RotateCcw, CheckSquare, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';
import { Company, Plan } from '../types';
import { useToast } from '../components/ToastContext';

const SuperAdminCompanies: React.FC = () => {
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCompany, setSelectedCompany] = useState<Partial<Company> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  
  // Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiManageData, setAiManageData] = useState<{id: string, limit: number, usage: number} | null>(null);
  
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [companiesData, plansData] = await Promise.all([
        api.companies.list(),
        api.plans.list()
    ]);
    setCompanies(companiesData);
    setPlans(plansData);
    setLoading(false);
  };

  const getPlanName = (id: string) => {
      const plan = plans.find(p => p.id === id);
      return plan ? plan.name : id;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Ativo</span>;
      case 'trial': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Trial</span>;
      case 'suspended': return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">Suspenso</span>;
      case 'overdue': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Atrasado</span>;
      default: return null;
    }
  };

  // Helper to safe parse date for input
  const safeDate = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      // Check if valid date
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  };

  const handleOpenCreate = () => {
    setSelectedCompany({
      status: 'active',
      planId: plans[0]?.id || '', // Default to first valid plan
      userCount: 1,
      subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      aiLimit: 5000,
      aiUsage: 0,
      useCustomKey: false,
      features: {
        crm: true,
        campaigns: false,
        automations: false,
        reports: true
      }
    });
    setIsEditing(false);
  };

  const handleOpenEdit = (company: Company) => {
    const features = company.features || {
        crm: true,
        campaigns: true,
        automations: true,
        reports: true
    };
    setSelectedCompany({ ...company, features });
    setIsEditing(true);
  };

  const confirmDelete = (id: string) => {
    setDeleteConfirmationId(id);
    setActionMenuOpenId(null);
  };

  const handleDelete = async () => {
    if (deleteConfirmationId) {
      try {
          await api.companies.delete(deleteConfirmationId);
          setCompanies(prev => prev.filter(c => c.id !== deleteConfirmationId));
          addToast('Empresa excluída com sucesso e dados limpos.', 'success');
      } catch (e: any) {
          console.error(e);
          addToast('Erro ao excluir: Possíveis dependências no banco de dados não puderam ser removidas.', 'error');
      } finally {
          setDeleteConfirmationId(null);
          // Reload to ensure state consistency
          loadData();
      }
    }
  };

  const handleSave = async () => {
    if (!selectedCompany?.name || !selectedCompany?.email) {
      alert("Por favor, preencha os campos obrigatórios (Nome e Email).");
      return;
    }

    try {
        if (isEditing && selectedCompany.id) {
          const updated = await api.companies.update(selectedCompany.id, selectedCompany);
          setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
          addToast('Empresa atualizada com sucesso.', 'success');
        } else {
          const created = await api.companies.create(selectedCompany);
          setCompanies(prev => [...prev, created]);
          addToast('Nova empresa criada.', 'success');
        }
        setSelectedCompany(null);
    } catch(e: any) {
        console.error("Erro no frontend save:", e);
        addToast(`Erro ao salvar: ${e.message || 'Verifique o console'}`, 'error');
    }
  };

  const toggleFeature = (feature: keyof NonNullable<Company['features']>) => {
    if (selectedCompany && selectedCompany.features) {
      setSelectedCompany({
        ...selectedCompany,
        features: {
          ...selectedCompany.features,
          [feature]: !selectedCompany.features[feature]
        }
      });
    }
  };

  // AI Management Logic
  const handleOpenAiManage = (company: Company) => {
    setAiManageData({
      id: company.id,
      limit: company.aiLimit,
      usage: company.aiUsage
    });
    setShowAiModal(true);
    setActionMenuOpenId(null);
  };

  const handleSaveAiLimit = async () => {
    if (aiManageData) {
      await api.companies.update(aiManageData.id, { 
        aiLimit: aiManageData.limit,
        aiUsage: aiManageData.usage 
      });
      setCompanies(prev => prev.map(c => c.id === aiManageData.id ? { ...c, aiLimit: aiManageData.limit, aiUsage: aiManageData.usage } : c));
      setShowAiModal(false);
      setAiManageData(null);
      addToast('Limites de IA atualizados.', 'success');
    }
  };

  const handleResetUsage = () => {
    if(confirm("Zerar consumo mensal desta empresa?")) {
      setAiManageData(prev => prev ? { ...prev, usage: 0 } : null);
    }
  };

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto" onClick={() => setActionMenuOpenId(null)}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas (Tenants)</h1>
          <p className="text-gray-500">Gerencie todas as instâncias e acessos.</p>
        </div>
        <button 
          onClick={() => handleOpenCreate()}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus size={18} className="mr-2" /> Nova Empresa
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex gap-4">
           <div className="relative flex-1 max-w-md">
             <input 
               type="text" 
               placeholder="Buscar por nome, email ou ID..." 
               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none bg-white"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
           </div>
           <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center bg-white">
             <Filter size={18} className="mr-2" /> Status
           </button>
        </div>

        {/* Table */}
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Empresa</th>
              <th className="px-6 py-4">Responsável</th>
              <th className="px-6 py-4">Plano</th>
              <th className="px-6 py-4">Usuários</th>
              <th className="px-6 py-4">Consumo IA</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Carregando...</td></tr>
            ) : (
                companies.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(company => (
                <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{company.name}</div>
                    <div className="text-xs text-gray-400">ID: {company.id}</div>
                    </td>
                    <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{company.ownerName}</div>
                    <div className="text-xs text-gray-500">{company.email}</div>
                    </td>
                    <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium border border-purple-100">
                        {getPlanName(company.planId)}
                    </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                    {company.userCount}
                    </td>
                    <td className="px-6 py-4">
                    {company.useCustomKey ? (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Chave Própria</span>
                    ) : (
                        <div className="w-24">
                            <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-gray-600">{Math.round((company.aiUsage / company.aiLimit) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                className={`h-1.5 rounded-full ${company.aiUsage > company.aiLimit * 0.9 ? 'bg-red-500' : 'bg-purple-600'}`} 
                                style={{ width: `${Math.min((company.aiUsage / company.aiLimit) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <div className="text-[9px] text-gray-400 mt-1">{company.aiUsage.toLocaleString()} / {company.aiLimit.toLocaleString()}</div>
                        </div>
                    )}
                    </td>
                    <td className="px-6 py-4">
                    {getStatusBadge(company.status)}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === company.id ? null : company.id); }}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                    
                    {actionMenuOpenId === company.id && (
                        <div className="absolute right-8 top-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-10 overflow-hidden text-left animate-fadeIn">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(company); setActionMenuOpenId(null); }}
                            className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                        >
                            <Edit size={16} className="mr-2 text-gray-400" /> Editar
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenAiManage(company); }}
                            className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                        >
                            <BrainCircuit size={16} className="mr-2 text-purple-600" /> Gerenciar Tokens IA
                        </button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); confirmDelete(company.id); }}
                            className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                        >
                            <Trash2 size={16} className="mr-2" /> Excluir
                        </button>
                        </div>
                    )}
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        title={isEditing ? `Editar: ${selectedCompany?.name}` : 'Nova Empresa'}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto p-1 custom-scrollbar">
           <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                 <label className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                 <input 
                   type="text" 
                   className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white"
                   value={selectedCompany?.name || ''}
                   onChange={e => setSelectedCompany({...selectedCompany, name: e.target.value})}
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700">Nome Responsável</label>
                 <input 
                   type="text" 
                   className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white"
                   value={selectedCompany?.ownerName || ''}
                   onChange={e => setSelectedCompany({...selectedCompany, ownerName: e.target.value})}
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700">Email (Login Principal)</label>
                 <input 
                   type="email" 
                   className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white"
                   value={selectedCompany?.email || ''}
                   onChange={e => setSelectedCompany({...selectedCompany, email: e.target.value})}
                 />
              </div>
             <div>
               <label className="block text-sm font-medium text-gray-700">Plano</label>
               <select 
                 className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white" 
                 value={selectedCompany?.planId}
                 onChange={e => setSelectedCompany({...selectedCompany, planId: e.target.value})}
               >
                 {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 {plans.length === 0 && <option value="basic">Carregando planos...</option>}
               </select>
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700">Status</label>
               <select 
                 className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white" 
                 value={selectedCompany?.status}
                 onChange={e => setSelectedCompany({...selectedCompany, status: e.target.value as any})}
               >
                 <option value="active">Ativo</option>
                 <option value="suspended">Suspenso</option>
                 <option value="overdue">Pagamento Pendente</option>
                 <option value="trial">Trial</option>
               </select>
             </div>
           </div>

           <div>
              <label className="block text-sm font-medium text-gray-700">Fim da Assinatura</label>
              <input 
                type="date" 
                className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white" 
                value={safeDate(selectedCompany?.subscriptionEnd)}
                onChange={e => setSelectedCompany({...selectedCompany, subscriptionEnd: e.target.value})}
              />
           </div>

           {/* Features Toggle Section */}
           <div className="border-t border-gray-100 pt-4 mt-2">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                 <CheckSquare size={16} className="mr-2 text-purple-600" /> Funcionalidades Habilitadas
              </h4>
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      checked={selectedCompany?.features?.crm}
                      onChange={() => toggleFeature('crm')}
                    />
                    <span className="text-sm text-gray-700">CRM & Kanban</span>
                 </label>
                 
                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      checked={selectedCompany?.features?.campaigns}
                      onChange={() => toggleFeature('campaigns')}
                    />
                    <span className="text-sm text-gray-700">Disparos em Massa</span>
                 </label>

                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      checked={selectedCompany?.features?.automations}
                      onChange={() => toggleFeature('automations')}
                    />
                    <span className="text-sm text-gray-700">Automações (Chatbots)</span>
                 </label>

                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      checked={selectedCompany?.features?.reports}
                      onChange={() => toggleFeature('reports')}
                    />
                    <span className="text-sm text-gray-700">Relatórios Avançados</span>
                 </label>
              </div>
              <p className="text-xs text-gray-500 mt-2 ml-1">
                 Estas configurações definem o que este usuário principal e sua equipe podem acessar no painel.
              </p>
           </div>

           <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
              <button 
                onClick={handleSave}
                className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 flex items-center"
              >
                <Save size={18} className="mr-2" /> Salvar Empresa
              </button>
           </div>
        </div>
      </Modal>

      {/* AI Token Management Modal */}
      <Modal 
        isOpen={showAiModal} 
        onClose={() => setShowAiModal(false)} 
        title="Gestão de Consumo IA"
        size="sm"
      >
         <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-center">
               <p className="text-xs text-purple-700 uppercase font-bold mb-1">Consumo Atual</p>
               <h2 className="text-3xl font-bold text-gray-900">{aiManageData?.usage.toLocaleString()}</h2>
               <p className="text-sm text-gray-500">tokens utilizados</p>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Limite Mensal de Tokens</label>
               <div className="flex gap-2">
                  <input 
                    type="number" 
                    className="flex-1 border border-gray-300 rounded-md p-2 text-center font-bold text-gray-800"
                    value={aiManageData?.limit || 0}
                    onChange={(e) => setAiManageData(prev => prev ? { ...prev, limit: parseInt(e.target.value) } : null)}
                  />
               </div>
               <p className="text-xs text-gray-500 mt-1">Ajuste para liberar mais tokens sem alterar o plano base.</p>
            </div>

            <div className="pt-2">
               <button 
                 onClick={handleResetUsage}
                 className="w-full border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
               >
                  <RotateCcw size={16} className="mr-2" /> Zerar Ciclo Atual
               </button>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 mt-2">
               <button 
                 onClick={handleSaveAiLimit}
                 className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 w-full"
               >
                  Salvar Limites
               </button>
            </div>
         </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteConfirmationId} 
        onClose={() => setDeleteConfirmationId(null)}
        title="Excluir Empresa"
        size="sm"
      >
         <div className="text-center p-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
               <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Tem certeza?</h3>
            <p className="text-sm text-gray-500 mb-6">
               Esta ação excluirá permanentemente a empresa e todos os dados associados (usuários, mensagens, contatos). Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-center gap-3">
               <button 
                 onClick={() => setDeleteConfirmationId(null)}
                 className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
               >
                  Cancelar
               </button>
               <button 
                 onClick={handleDelete}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm"
               >
                  Sim, excluir
               </button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default SuperAdminCompanies;
