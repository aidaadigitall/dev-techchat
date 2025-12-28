import React, { useState } from 'react';
import { MOCK_COMPANIES, MOCK_PLANS } from '../constants';
import { Search, Filter, MoreHorizontal, Shield, Lock, Power, CreditCard, Plus, Save } from 'lucide-react';
import Modal from '../components/Modal';
import { Company } from '../types';

const SuperAdminCompanies: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [selectedCompany, setSelectedCompany] = useState<Partial<Company> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const getPlanName = (id: string) => MOCK_PLANS.find(p => p.id === id)?.name || id;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Ativo</span>;
      case 'trial': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Trial</span>;
      case 'suspended': return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">Suspenso</span>;
      case 'overdue': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Atrasado</span>;
      default: return null;
    }
  };

  const handleOpenCreate = () => {
    setSelectedCompany({
      status: 'active',
      planId: 'basic',
      userCount: 1,
      subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    });
    setIsEditing(false);
  };

  const handleOpenEdit = (company: Company) => {
    setSelectedCompany({ ...company });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedCompany?.name || !selectedCompany?.email) {
      alert("Por favor, preencha os campos obrigatórios.");
      return;
    }

    if (isEditing && selectedCompany.id) {
      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? selectedCompany as Company : c));
    } else {
      const newComp = {
        ...selectedCompany,
        id: `comp${Date.now()}`,
        userCount: 0
      } as Company;
      setCompanies([...companies, newComp]);
    }
    setSelectedCompany(null);
  };

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas (Tenants)</h1>
          <p className="text-gray-500">Gerencie todas as instâncias e acessos.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
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
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Fim Assinatura</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {companies.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(company => (
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
                  {getStatusBadge(company.status)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(company.subscriptionEnd).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleOpenEdit(company)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        title={isEditing ? `Editar: ${selectedCompany?.name}` : 'Nova Empresa'}
      >
        <div className="space-y-4">
           {isEditing && (
             <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-800 mb-4">
               ⚠️ Alterações aqui impactam diretamente o acesso do cliente.
             </div>
           )}
           
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
                 <label className="block text-sm font-medium text-gray-700">Email</label>
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
                 {MOCK_PLANS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                value={selectedCompany?.subscriptionEnd ? new Date(selectedCompany.subscriptionEnd).toISOString().split('T')[0] : ''} 
                onChange={e => setSelectedCompany({...selectedCompany, subscriptionEnd: e.target.value})}
              />
           </div>

           {isEditing ? (
             <div className="pt-4 flex gap-2 border-t border-gray-100 mt-4">
                <button className="flex-1 flex items-center justify-center p-2 border border-red-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 bg-white">
                   <Lock size={16} className="mr-2" /> Bloquear Acesso
                </button>
                <button className="flex-1 flex items-center justify-center p-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50">
                   <Power size={16} className="mr-2" /> Resetar Instância
                </button>
             </div>
           ) : null}

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
    </div>
  );
};

export default SuperAdminCompanies;