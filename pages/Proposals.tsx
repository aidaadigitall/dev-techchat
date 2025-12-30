import React, { useState, useEffect } from 'react';
import { Proposal, Contact } from '../types';
import { api } from '../services/api';
import { MOCK_CONTACTS } from '../constants';
import { FileText, Plus, Search, CheckCircle, XCircle, Clock, AlertCircle, Eye, Download } from 'lucide-react';
import Modal from '../components/Modal';

const Proposals: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Create Form State
  const [formData, setFormData] = useState<Partial<Proposal>>({
    clientId: '',
    clientName: '',
    title: '',
    value: 0,
    status: 'pending'
  });

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    setLoading(true);
    const data = await api.proposals.list();
    setProposals(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.clientId || !formData.value) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }
    
    // Find client name if not set
    const client = MOCK_CONTACTS.find(c => c.id === formData.clientId);
    const payload = { ...formData, clientName: client ? client.name : 'Cliente' };

    await api.proposals.create(payload);
    setShowModal(false);
    loadProposals();
    setFormData({ clientId: '', clientName: '', title: '', value: 0, status: 'pending' });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'accepted': return <span className="flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold"><CheckCircle size={12} className="mr-1"/> Aceita</span>;
      case 'rejected': return <span className="flex items-center px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold"><XCircle size={12} className="mr-1"/> Recusada</span>;
      case 'expired': return <span className="flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold"><AlertCircle size={12} className="mr-1"/> Expirada</span>;
      default: return <span className="flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold"><Clock size={12} className="mr-1"/> Pendente</span>;
    }
  };

  const filteredProposals = proposals.filter(p => 
    p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 h-full bg-gray-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Propostas Comerciais</h1>
          <p className="text-gray-500">Gerencie orçamentos e contratos enviados.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm"
        >
          <Plus size={18} className="mr-2" /> Nova Proposta
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
           <div className="relative w-72">
              <input 
                type="text" 
                placeholder="Buscar proposta..." 
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
           </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                 <tr>
                    <th className="px-6 py-4">Título / Cliente</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Data Envio</th>
                    <th className="px-6 py-4">Validade</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                 ) : filteredProposals.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhuma proposta encontrada.</td></tr>
                 ) : (
                    filteredProposals.map(prop => (
                       <tr key={prop.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                             <div className="font-medium text-gray-900">{prop.title}</div>
                             <div className="text-xs text-gray-500">{prop.clientName}</div>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-700">
                             {prop.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                             {new Date(prop.sentDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                             {new Date(prop.validUntil).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4">
                             {getStatusBadge(prop.status)}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2">
                                <button className="p-1 text-gray-400 hover:text-purple-600" title="Ver Detalhes"><Eye size={18} /></button>
                                <button className="p-1 text-gray-400 hover:text-gray-800" title="Baixar PDF"><Download size={18} /></button>
                             </div>
                          </td>
                       </tr>
                    ))
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Criar Nova Proposta">
         <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Título da Proposta</label>
               <input 
                 type="text" 
                 className="w-full border rounded-lg p-2.5 bg-white" 
                 placeholder="Ex: Desenvolvimento Website"
                 value={formData.title}
                 onChange={e => setFormData({...formData, title: e.target.value})}
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
               <select 
                 className="w-full border rounded-lg p-2.5 bg-white"
                 value={formData.clientId}
                 onChange={e => setFormData({...formData, clientId: e.target.value})}
               >
                  <option value="">Selecione...</option>
                  {MOCK_CONTACTS.map(c => (
                     <option key={c.id} value={c.id}>{c.name} - {c.company || 'PF'}</option>
                  ))}
               </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
               <input 
                 type="number" 
                 className="w-full border rounded-lg p-2.5 bg-white" 
                 placeholder="0,00"
                 value={formData.value || ''}
                 onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})}
               />
            </div>
            <div className="flex justify-end pt-4">
               <button 
                 onClick={handleCreate}
                 className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium"
               >
                  Gerar Proposta
               </button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default Proposals;