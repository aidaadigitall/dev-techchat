import React, { useState } from 'react';
import { MOCK_PLANS } from '../constants';
import { Check, X, Edit, Plus, Save } from 'lucide-react';
import Modal from '../components/Modal';
import { Plan } from '../types';

const SuperAdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>(MOCK_PLANS);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);

  const handleEdit = (plan: Plan) => {
    setEditingPlan({ ...plan });
  };

  const handleCreate = () => {
    setEditingPlan({
      id: `plan_${Date.now()}`,
      name: 'Novo Plano',
      price: 0,
      limits: { users: 1, connections: 1, messages: 1000 },
      features: { crm: true, campaigns: false, api: false }
    });
  };

  const handleSave = () => {
    if (!editingPlan?.name) return;

    if (plans.find(p => p.id === editingPlan.id)) {
      setPlans(plans.map(p => p.id === editingPlan.id ? editingPlan as Plan : p));
    } else {
      setPlans([...plans, editingPlan as Plan]);
    }
    setEditingPlan(null);
  };

  const toggleFeature = (key: keyof Plan['features']) => {
    if (editingPlan && editingPlan.features) {
      setEditingPlan({
        ...editingPlan,
        features: {
          ...editingPlan.features,
          [key]: !editingPlan.features[key]
        }
      });
    }
  };

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
       <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos & Limites</h1>
          <p className="text-gray-500">Defina os recursos e preços do seu SaaS.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus size={18} className="mr-2" /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {plans.map(plan => (
           <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-gray-100">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <button 
                      onClick={() => handleEdit(plan)}
                      className="text-gray-400 hover:text-purple-600"
                    >
                      <Edit size={18} />
                    </button>
                 </div>
                 <div className="flex items-baseline">
                    <span className="text-3xl font-extrabold text-gray-900">R$ {plan.price}</span>
                    <span className="text-gray-500 ml-1">/mês</span>
                 </div>
              </div>
              
              <div className="p-6 flex-1 space-y-4">
                 <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Limites</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                       <li className="flex justify-between">
                         <span>Usuários</span>
                         <span className="font-bold">{plan.limits.users}</span>
                       </li>
                       <li className="flex justify-between">
                         <span>Conexões (WhatsApp)</span>
                         <span className="font-bold">{plan.limits.connections}</span>
                       </li>
                       <li className="flex justify-between">
                         <span>Mensagens/mês</span>
                         <span className="font-bold">{plan.limits.messages.toLocaleString()}</span>
                       </li>
                    </ul>
                 </div>

                 <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Módulos</p>
                    <ul className="space-y-2 text-sm">
                       <li className="flex items-center">
                          {plan.features.crm ? <Check size={16} className="text-green-500 mr-2" /> : <X size={16} className="text-red-400 mr-2" />}
                          <span className={plan.features.crm ? 'text-gray-900' : 'text-gray-400'}>CRM Kanban</span>
                       </li>
                       <li className="flex items-center">
                          {plan.features.campaigns ? <Check size={16} className="text-green-500 mr-2" /> : <X size={16} className="text-red-400 mr-2" />}
                          <span className={plan.features.campaigns ? 'text-gray-900' : 'text-gray-400'}>Campanhas em Massa</span>
                       </li>
                       <li className="flex items-center">
                          {plan.features.api ? <Check size={16} className="text-green-500 mr-2" /> : <X size={16} className="text-red-400 mr-2" />}
                          <span className={plan.features.api ? 'text-gray-900' : 'text-gray-400'}>API Pública</span>
                       </li>
                    </ul>
                 </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                 <button className="text-sm font-medium text-gray-600 hover:text-gray-900">Duplicar Plano</button>
              </div>
           </div>
         ))}
      </div>

      {/* Edit/Create Modal */}
      <Modal 
        isOpen={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        title={editingPlan?.id?.startsWith('plan_') ? 'Novo Plano' : 'Editar Plano'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome do Plano</label>
              <input 
                type="text" 
                className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white"
                value={editingPlan?.name || ''}
                onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
              <input 
                type="number" 
                className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white"
                value={editingPlan?.price}
                onChange={e => setEditingPlan({...editingPlan, price: parseFloat(e.target.value)})}
              />
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-2">
            <h4 className="text-sm font-bold text-gray-700 mb-2">Limites</h4>
            <div className="grid grid-cols-3 gap-2">
               <div>
                  <label className="text-xs text-gray-500">Usuários</label>
                  <input type="number" className="w-full border rounded p-1 text-sm bg-white" value={editingPlan?.limits?.users} 
                    onChange={e => setEditingPlan({...editingPlan, limits: {...editingPlan.limits!, users: parseInt(e.target.value)}})} />
               </div>
               <div>
                  <label className="text-xs text-gray-500">Conexões</label>
                  <input type="number" className="w-full border rounded p-1 text-sm bg-white" value={editingPlan?.limits?.connections} 
                    onChange={e => setEditingPlan({...editingPlan, limits: {...editingPlan.limits!, connections: parseInt(e.target.value)}})} />
               </div>
               <div>
                  <label className="text-xs text-gray-500">Mensagens</label>
                  <input type="number" className="w-full border rounded p-1 text-sm bg-white" value={editingPlan?.limits?.messages} 
                    onChange={e => setEditingPlan({...editingPlan, limits: {...editingPlan.limits!, messages: parseInt(e.target.value)}})} />
               </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-2">
             <h4 className="text-sm font-bold text-gray-700 mb-2">Recursos</h4>
             <div className="space-y-2">
                <div className="flex items-center">
                   <input type="checkbox" checked={editingPlan?.features?.crm} onChange={() => toggleFeature('crm')} className="mr-2" />
                   <span className="text-sm">Módulo CRM / Kanban</span>
                </div>
                <div className="flex items-center">
                   <input type="checkbox" checked={editingPlan?.features?.campaigns} onChange={() => toggleFeature('campaigns')} className="mr-2" />
                   <span className="text-sm">Campanhas em Massa</span>
                </div>
                <div className="flex items-center">
                   <input type="checkbox" checked={editingPlan?.features?.api} onChange={() => toggleFeature('api')} className="mr-2" />
                   <span className="text-sm">API Pública</span>
                </div>
             </div>
          </div>

          <div className="flex justify-end pt-4">
             <button 
               onClick={handleSave}
               className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 flex items-center"
             >
               <Save size={18} className="mr-2" /> Salvar Plano
             </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuperAdminPlans;