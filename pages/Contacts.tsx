import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Contact, Message, MessageType } from '../types';
import { useToast } from '../components/ToastContext';
import { Search, Filter, Download, Plus, MoreVertical, X, CheckCheck, Check, Edit, Trash2, Upload, FileText, Calendar, PlayCircle, Sparkles } from 'lucide-react';
import Modal from '../components/Modal';

const Contacts: React.FC = () => {
  const { addToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter State
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilterTag, setActiveFilterTag] = useState('');

  // History Modal Filters & AI
  const [historyFilterDate, setHistoryFilterDate] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<MessageType | 'ALL'>('ALL');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Menu State
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
        const data = await api.contacts.list();
        setContacts(data);
    } catch (e) {
        addToast('Erro ao carregar contatos', 'error');
    } finally {
        setLoading(false);
    }
  };

  // --- Filtering ---
  const filteredContacts = contacts.filter(contact => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      contact.name.toLowerCase().includes(term) ||
      contact.phone.includes(term) ||
      (contact.email && contact.email.toLowerCase().includes(term)) ||
      contact.tags.some(tag => tag.toLowerCase().includes(term))
    );
    
    const matchesTag = activeFilterTag ? contact.tags.includes(activeFilterTag) : true;

    return matchesSearch && matchesTag;
  });

  // --- Handlers ---

  const handleViewHistory = async (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditing(false);
    setLoadingHistory(true);
    setAnalysisResult(null); 
    setHistoryFilterDate('');
    setHistoryFilterType('ALL');
    
    const msgs = await api.chat.getMessages(contact.id);
    setHistoryMessages(msgs);
    setLoadingHistory(false);
  };

  const handleAnalyzeHistory = async () => {
    setIsAnalyzing(true);
    const result = await api.ai.analyzeConversation(historyMessages);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const getFilteredHistory = () => {
    return historyMessages.filter(msg => {
      const typeMatch = historyFilterType === 'ALL' || msg.type === historyFilterType;
      return typeMatch;
    });
  };

  const handleEditContact = (contact: Contact, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    setSelectedContact(contact);
    setEditForm(contact);
    setIsEditing(true);
    setActionMenuOpenId(null);
  };

  const handleDeleteContact = async (contactId: string, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    if(confirm('Tem certeza que deseja excluir este contato?')) {
      // In real app calls API
      setContacts(prev => prev.filter(c => c.id !== contactId));
      addToast('Contato excluído com sucesso!', 'success');
    }
    setActionMenuOpenId(null);
  };

  const handleNewContact = () => {
    const newContact: Contact = {
      id: '', // Will be assigned by backend/mock
      name: '',
      phone: '',
      tags: [],
      status: 'pending',
      avatar: 'https://ui-avatars.com/api/?background=random'
    };
    setSelectedContact(newContact);
    setEditForm(newContact);
    setIsEditing(true);
  };

  const handleSaveContact = async () => {
    if (!editForm.name || !editForm.phone) {
      addToast("Nome e Telefone são obrigatórios.", 'warning');
      return;
    }

    try {
        if (editForm.id && contacts.find(c => c.id === editForm.id)) {
            // Update
            const updated = await api.contacts.update(editForm.id, editForm);
            setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
            addToast("Contato atualizado!", 'success');
        } else {
            // Create
            const created = await api.contacts.create(editForm);
            setContacts(prev => [created, ...prev]); // Add to top
            addToast("Contato criado com sucesso!", 'success');
        }
        setIsEditing(false);
        setSelectedContact(null);
    } catch (e) {
        console.error(e);
        addToast("Erro ao salvar contato.", 'error');
    }
  };

  return (
    <div className="p-6 h-full bg-gray-50 overflow-y-auto" onClick={() => { setActionMenuOpenId(null); setShowFilter(false); }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Contatos</h1>
           <p className="text-gray-500">Gerencie sua base de clientes ({contacts.length}).</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleNewContact}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center shadow-sm"
          >
             <Plus size={18} className="mr-2" /> Novo Contato
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
          <div className="relative w-full sm:w-96">
            <input 
              type="text" 
              placeholder="Buscar por nome, telefone ou email..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
             <div className="p-10 text-center text-gray-500">Carregando contatos...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Telefone</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => handleViewHistory(contact)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-10 w-10 rounded-full object-cover" src={contact.avatar} alt="" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                          <div className="text-xs text-gray-500">{contact.company || 'Pessoa Física'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {contact.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {contact.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === contact.id ? null : contact.id); }}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {actionMenuOpenId === contact.id && (
                        <div className="absolute right-8 top-8 w-48 bg-white rounded-md shadow-lg border border-gray-100 z-50 animate-fadeIn">
                           <button 
                             onClick={(e) => handleEditContact(contact, e)}
                             className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                           >
                             <Edit size={14} className="mr-2 text-purple-600" /> Editar
                           </button>
                           <button 
                             onClick={(e) => handleDeleteContact(contact.id, e)}
                             className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                           >
                             <Trash2 size={14} className="mr-2" /> Excluir
                           </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* History / Edit Modal */}
      <Modal
        isOpen={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        title={isEditing ? (editForm.id ? `Editar Contato` : `Novo Contato`) : `Histórico: ${selectedContact?.name || ''}`}
        size="lg"
      >
        {isEditing ? (
           <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
              <div>
                 <label className="block text-sm font-medium text-gray-700">Nome</label>
                 <input 
                   type="text" 
                   className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                   value={editForm.name || ''} 
                   onChange={e => setEditForm({...editForm, name: e.target.value})} 
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone</label>
                    <input 
                      type="text" 
                      className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                      value={editForm.phone || ''} 
                      onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input 
                      type="email" 
                      className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                      value={editForm.email || ''} 
                      onChange={e => setEditForm({...editForm, email: e.target.value})} 
                    />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                    <input 
                      type="text" 
                      className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                      value={editForm.company || ''} 
                      onChange={e => setEditForm({...editForm, company: e.target.value})} 
                    />
                 </div>
              </div>
              <div className="flex justify-end pt-2">
                 <button onClick={handleSaveContact} className="bg-purple-600 text-white px-4 py-2 rounded">Salvar</button>
              </div>
           </div>
        ) : (
          <div className="flex flex-col h-[500px]">
             {/* Read-only history view code... (kept same as before) */}
             <div className="flex-1 overflow-y-auto bg-[#efeae2] relative p-4 custom-scrollbar">
                {/* ... mapping historyMessages ... */}
                {historyMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'} mb-2`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${msg.senderId === 'me' ? 'bg-[#9333ea] text-white' : 'bg-white text-gray-800'}`}>
                            <p>{msg.content}</p>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Contacts;