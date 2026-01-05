
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { whatsappService } from '../services/whatsapp';
import { Contact, Message } from '../types';
import { useToast } from '../components/ToastContext';
import { Search, Filter, Download, Plus, MoreVertical, X, Check, Edit, Trash2, Upload, RefreshCw, MessageSquarePlus, Send, PauseCircle, Play, StopCircle, Loader2, Phone, AlertTriangle, AlertCircle, CheckCheck } from 'lucide-react';
import Modal from '../components/Modal';

// Interface para o Job de Importação
interface ImportJob {
  id: string;
  fileName: string;
  total: number;
  processed: number;
  successCount: number;
  errorCount: number;
  data: any[]; 
  status: 'processing' | 'paused' | 'completed' | 'error';
}

const Contacts: React.FC = () => {
  const { addToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  
  // New Modals State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null); 
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(false);

  // Import Job State
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const stopImportRef = useRef(false);

  // New Chat Form State
  const [newChatForm, setNewChatForm] = useState({
      contactId: '',
      initialMessage: ''
  });

  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
        const data = await api.contacts.list();
        setContacts(data);
    } catch (e) {
        console.error(e);
        addToast('Erro ao carregar contatos do servidor', 'error');
    } finally {
        setLoading(false);
    }
  };

  // --- Filtering ---
  const filteredContacts = contacts.filter(contact => {
    const term = searchTerm.toLowerCase();
    return (
      contact.name.toLowerCase().includes(term) ||
      contact.phone.includes(term) ||
      (contact.email && contact.email.toLowerCase().includes(term))
    );
  });

  // --- Handlers ---
  const handleEditContact = (contact: Contact, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    setSelectedContact(contact);
    setEditForm(contact);
    setIsEditing(true);
    setActionMenuOpenId(null);
  };

  const handleNewContact = () => {
    const newContact: Partial<Contact> = {
      name: '',
      phone: '',
      email: '',
      tags: [],
      status: 'saved',
    };
    setSelectedContact(newContact as Contact);
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
            await api.contacts.update(editForm.id, editForm);
            addToast("Contato atualizado!", 'success');
        } else {
            // Create
            await api.contacts.create(editForm);
            addToast("Contato criado!", 'success');
        }
        setIsEditing(false);
        setSelectedContact(null);
        loadContacts();
    } catch (e: any) {
        addToast(`Erro ao salvar: ${e.message}`, 'error');
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmationId) return;
    try {
        await api.contacts.delete(deleteConfirmationId);
        setContacts(prev => prev.filter(c => c.id !== deleteConfirmationId));
        addToast('Contato excluído.', 'success');
    } catch (e) {
        addToast('Erro ao excluir contato.', 'error');
    } finally {
        setDeleteConfirmationId(null);
    }
  };

  const handleStartChat = async () => {
      if (!newChatForm.contactId) return;
      try {
          if (newChatForm.initialMessage) {
              await api.chat.sendMessage(newChatForm.contactId, newChatForm.initialMessage);
          }
          await api.contacts.update(newChatForm.contactId, { status: 'open' });
          addToast("Atendimento iniciado!", "success");
          setNewChatModalOpen(false);
      } catch (error) {
          addToast("Erro ao iniciar atendimento.", "error");
      }
  };

  return (
    <div className="p-6 h-full bg-gray-50 overflow-y-auto" onClick={() => setActionMenuOpenId(null)}>
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Contatos</h1>
           <p className="text-gray-500">Gerencie sua base de clientes ({contacts.length}).</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <button onClick={() => setNewChatModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-sm text-sm font-medium transition-colors">
                <MessageSquarePlus size={18} className="mr-2" /> Novo Atendimento
            </button>
            <button onClick={handleNewContact} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center shadow-sm text-sm font-medium transition-colors">
                <Plus size={18} className="mr-2" /> Novo Contato
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative w-full sm:w-96">
            <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
             <div className="p-10 flex justify-center text-gray-500">Carregando...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">WhatsApp</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                      <div className="text-xs text-gray-500">{contact.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{contact.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                           {contact.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                      <button onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === contact.id ? null : contact.id); }} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"><MoreVertical size={18} /></button>
                      {actionMenuOpenId === contact.id && (
                        <div className="absolute right-8 top-8 w-48 bg-white rounded-md shadow-lg border border-gray-100 z-50">
                           <button onClick={(e) => handleEditContact(contact, e)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"><Edit size={14} className="mr-2" /> Editar</button>
                           <button onClick={() => setDeleteConfirmationId(contact.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"><Trash2 size={14} className="mr-2" /> Excluir</button>
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

      {/* Edit/Create Modal */}
      <Modal isOpen={!!selectedContact} onClose={() => setSelectedContact(null)} title={isEditing ? "Editar Contato" : "Novo Contato"}>
          <div className="space-y-4">
             <div><label className="block text-sm">Nome</label><input className="w-full border rounded p-2" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
             <div><label className="block text-sm">Telefone</label><input className="w-full border rounded p-2" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
             <div><label className="block text-sm">Email</label><input className="w-full border rounded p-2" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
             <div className="flex justify-end"><button onClick={handleSaveContact} className="bg-purple-600 text-white px-4 py-2 rounded">Salvar</button></div>
          </div>
      </Modal>

      {/* Start Chat Modal */}
      <Modal isOpen={newChatModalOpen} onClose={() => setNewChatModalOpen(false)} title="Novo Atendimento">
         <div className="space-y-4">
            <div>
               <label className="block text-sm text-gray-700 mb-1">Contato</label>
               <select className="w-full border rounded p-2" value={newChatForm.contactId} onChange={e => setNewChatForm({...newChatForm, contactId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-sm text-gray-700 mb-1">Mensagem Inicial</label>
               <textarea className="w-full border rounded p-2" value={newChatForm.initialMessage} onChange={e => setNewChatForm({...newChatForm, initialMessage: e.target.value})} />
            </div>
            <div className="flex justify-end"><button onClick={handleStartChat} className="bg-blue-600 text-white px-4 py-2 rounded">Iniciar</button></div>
         </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirmationId} onClose={() => setDeleteConfirmationId(null)} title="Excluir Contato">
         <p className="mb-4">Tem certeza? Isso não pode ser desfeito.</p>
         <div className="flex justify-end gap-2">
             <button onClick={() => setDeleteConfirmationId(null)} className="border px-4 py-2 rounded">Cancelar</button>
             <button onClick={executeDelete} className="bg-red-600 text-white px-4 py-2 rounded">Excluir</button>
         </div>
      </Modal>
    </div>
  );
};

export default Contacts;
