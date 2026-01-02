import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { whatsappService } from '../services/whatsapp'; // Import WhatsApp Service
import { Contact, Message, MessageType } from '../types';
import { useToast } from '../components/ToastContext';
import { Search, Filter, Download, Plus, MoreVertical, X, CheckCheck, Check, Edit, Trash2, Upload, FileText, Calendar, PlayCircle, Sparkles, Building, Briefcase, MapPin, User, Target, Save, RefreshCw, FileSpreadsheet, AlertTriangle, Clock } from 'lucide-react';
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
  
  // New Modals State
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null); // Modern Alert State

  const [syncConfig, setSyncConfig] = useState({
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      syncHistory: true,
      syncNewContacts: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    
    try {
        const msgs = await api.chat.getMessages(contact.id);
        setHistoryMessages(msgs);
    } catch (e) {
        console.error("Failed to load history", e);
    } finally {
        setLoadingHistory(false);
    }
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

  const confirmDeleteContact = (contactId: string, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    setDeleteConfirmationId(contactId);
    setActionMenuOpenId(null);
  };

  const executeDelete = async () => {
    if (!deleteConfirmationId) return;
    
    try {
        await api.contacts.delete(deleteConfirmationId);
        setContacts(prev => prev.filter(c => c.id !== deleteConfirmationId));
        addToast('Contato excluído com sucesso!', 'success');
    } catch (e) {
        addToast('Erro ao excluir contato. Verifique se existem conversas vinculadas.', 'error');
    } finally {
        setDeleteConfirmationId(null);
    }
  };

  const handleNewContact = () => {
    const newContact: Partial<Contact> = {
      name: '',
      phone: '',
      email: '',
      tags: [],
      status: 'pending',
      avatar: '',
      source: 'Indicação',
      role: ''
    };
    setSelectedContact(newContact as Contact);
    setEditForm(newContact);
    setIsEditing(true);
  };

  const validateForm = (form: Partial<Contact>) => {
    // 1. Validate Name
    if (!form.name || form.name.trim().length < 3) {
      addToast("O nome deve ter pelo menos 3 caracteres.", 'warning');
      return false;
    }

    // 2. Validate Phone
    if (!form.phone) {
      addToast("O telefone é obrigatório.", 'warning');
      return false;
    }
    const cleanPhone = form.phone.replace(/\D/g, ''); // Remove non-digits
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      addToast("Telefone inválido. Use formato com DDD (Ex: 11999999999).", 'warning');
      return false;
    }

    // 3. Validate Email (Optional but strict if present)
    if (form.email && form.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        addToast("Formato de email inválido.", 'warning');
        return false;
      }
    }

    return true;
  };

  const handleSaveContact = async () => {
    // Validation Step
    if (!validateForm(editForm)) {
      return;
    }

    try {
        let savedContact: Contact;
        if (editForm.id && contacts.find(c => c.id === editForm.id)) {
            // Update
            savedContact = await api.contacts.update(editForm.id, editForm);
            setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
            addToast("Contato atualizado com sucesso!", 'success');
        } else {
            // Create
            savedContact = await api.contacts.create(editForm);
            setContacts(prev => [savedContact, ...prev]); // Add to top
            addToast("Contato criado com sucesso!", 'success');
        }
        setIsEditing(false);
        setSelectedContact(null);
    } catch (e: any) {
        console.error("Save Error:", e);
        const errorMsg = e.message || e.details || e.hint || "Erro desconhecido ao salvar.";
        addToast(`Erro ao salvar: ${errorMsg}`, 'error');
    }
  };

  // --- Sync & Import/Export Logic ---

  const handleSyncWhatsapp = () => {
      setSyncModalOpen(true);
  };

  const performSync = async () => {
      setSyncModalOpen(false);
      setLoading(true);
      
      try {
          const status = whatsappService.getStatus();
          if (status !== 'connected') {
              throw new Error("WhatsApp não está conectado. Vá em Configurações > Conexões.");
          }

          addToast('Iniciando sincronização com o dispositivo...', 'info');
          
          // REAL SYNC: Fetch chats from Evolution API via Service
          await whatsappService.syncHistory();
          
          // Reload local list from Supabase
          await loadContacts();
          
          addToast('Sincronização concluída! Contatos e conversas atualizados.', 'success');
      } catch (error: any) {
          console.error("Sync Error:", error);
          addToast(`Erro na sincronização: ${error.message}`, 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleExportContacts = () => {
      const headers = "ID,Nome,Telefone,Email,Empresa,Tags\n";
      // Using generic ID for export, though imports will ignore it or match by phone
      const rows = contacts.map(c => `${c.id},"${c.name}",${c.phone},${c.email || ''},${c.company || ''},"${c.tags.join(',')}"`).join("\n");
      const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + rows);
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", "contatos_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Exportação iniciada.', 'success');
  };

  // Helper to parse CSV row respecting quotes
  const parseCSVRow = (row: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') {
              inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
          } else {
              current += char;
          }
      }
      result.push(current.trim());
      return result.map(cell => cell.replace(/^"|"$/g, '').replace(/""/g, '"'));
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportModalOpen(false);
      setLoading(true);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text) {
            setLoading(false);
            return;
        }

        const lines = text.split(/\r\n|\n/);
        // Identify Headers (flexible matching)
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Mapping for Requested Format: ID,Nome,Telefone,Email,Empresa,Tags
        const idxName = headers.findIndex(h => h === 'nome' || h === 'name');
        const idxPhone = headers.findIndex(h => h === 'telefone' || h === 'phone' || h === 'celular');
        const idxEmail = headers.findIndex(h => h === 'email' || h === 'e-mail');
        const idxCompany = headers.findIndex(h => h === 'empresa' || h === 'company');
        const idxTags = headers.findIndex(h => h === 'tags' || h === 'etiquetas');
        // ID is usually ignored for creation, but we can verify it exists
        // const idxId = headers.findIndex(h => h === 'id'); 

        // Fallback: If headers don't match, assume the fixed user format: ID(0), Nome(1), Telefone(2), Email(3), Empresa(4), Tags(5)
        const useFixedFormat = idxName === -1 && idxPhone === -1 && lines[0].includes(','); 

        const newContacts: Partial<Contact>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const data = parseCSVRow(line);
            
            // Extract Data based on detection
            let name = useFixedFormat ? data[1] : (idxName > -1 ? data[idxName] : '');
            let phone = useFixedFormat ? data[2] : (idxPhone > -1 ? data[idxPhone] : '');
            let email = useFixedFormat ? data[3] : (idxEmail > -1 ? data[idxEmail] : '');
            let company = useFixedFormat ? data[4] : (idxCompany > -1 ? data[idxCompany] : '');
            let tagsRaw = useFixedFormat ? data[5] : (idxTags > -1 ? data[idxTags] : '');

            // Cleanup Phone (Remove non-digits)
            if (phone) phone = phone.replace(/\D/g, ''); 

            // Basic validation
            if (name && phone) {
                // Ensure DDI (55 for Brazil) if missing and length suggests it (10 or 11 digits)
                if (phone.length === 10 || phone.length === 11) {
                    phone = '55' + phone;
                }

                newContacts.push({
                    name,
                    phone,
                    email,
                    company,
                    tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t !== '') : [],
                    status: 'open', // Imported contacts start as open
                    source: 'Importação CSV'
                });
            }
        }

        let successCount = 0;
        let errors = [];

        for (const contact of newContacts) {
            try {
                // Use API to create (handles upsert by phone internally)
                await api.contacts.create(contact);
                successCount++;
            } catch (err: any) {
                console.error("Failed to import contact:", contact.name, err);
                errors.push(`${contact.name}: ${err.message || 'Erro desconhecido'}`);
            }
        }

        await loadContacts(); // Refresh list logic
        setLoading(false);
        
        if (successCount > 0) {
            addToast(`${successCount} contatos importados/atualizados com sucesso!`, 'success');
        }
        
        if (errors.length > 0) {
            addToast(`Falha ao importar ${errors.length} contatos. Verifique o arquivo.`, 'warning');
        }

        if (importFileRef.current) importFileRef.current.value = '';
      };

      reader.readAsText(file);
  };

  return (
    <div className="p-6 h-full bg-gray-50 overflow-y-auto" onClick={() => { setActionMenuOpenId(null); setShowFilter(false); }}>
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Contatos</h1>
           <p className="text-gray-500">Gerencie sua base de clientes ({contacts.length}).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setImportModalOpen(true)}
            className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center text-sm font-medium transition-colors"
          >
             <Upload size={16} className="mr-2" /> Importar
          </button>
          <button 
            onClick={handleExportContacts}
            className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center text-sm font-medium transition-colors"
          >
             <Download size={16} className="mr-2" /> Exportar
          </button>
          <button 
            onClick={handleSyncWhatsapp}
            className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 flex items-center text-sm font-medium transition-colors"
          >
             <RefreshCw size={16} className="mr-2" /> Sincronizar
          </button>
          <button 
            onClick={handleNewContact}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center shadow-sm text-sm font-medium transition-colors"
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
             <div className="p-10 flex flex-col items-center justify-center text-gray-500">
                 <RefreshCw size={32} className="animate-spin mb-2 text-purple-600" />
                 <p>Atualizando base de contatos...</p>
             </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Telefone</th>
                  <th className="px-6 py-4">Empresa / Cargo</th>
                  <th className="px-6 py-4">Origem</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => handleViewHistory(contact)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-10 w-10 rounded-full object-cover" src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}`} alt="" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                          <div className="text-xs text-gray-500">{contact.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {contact.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contact.company || 'Não inf.'}</div>
                      <div className="text-xs text-gray-500">{contact.role || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       {contact.source ? (
                           <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">
                               {contact.source}
                           </span>
                       ) : <span className="text-gray-400 text-xs">-</span>}
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
                             onClick={(e) => confirmDeleteContact(contact.id, e)}
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
        title={isEditing ? (editForm.id ? `Editar Contato` : `Novo Cliente`) : `Histórico: ${selectedContact?.name || ''}`}
        size="lg"
      >
        {isEditing ? (
           <div className="space-y-6 max-h-[75vh] overflow-y-auto p-1 custom-scrollbar">
              
              {/* Section 1: Basic Info */}
              <div className="space-y-4">
                 <h4 className="text-sm font-bold text-gray-800 uppercase flex items-center border-b border-gray-100 pb-2">
                    <User size={16} className="mr-2 text-purple-600" /> Dados Básicos
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Nome Completo *</label>
                       <input 
                         type="text" 
                         className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500" 
                         value={editForm.name || ''} 
                         onChange={e => setEditForm({...editForm, name: e.target.value})} 
                         placeholder="Ex: Maria Silva"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Telefone (WhatsApp) *</label>
                       <input 
                         type="text" 
                         className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500" 
                         value={editForm.phone || ''} 
                         onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                         placeholder="Ex: 11999999999"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                       <input 
                         type="email" 
                         className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500" 
                         value={editForm.email || ''} 
                         onChange={e => setEditForm({...editForm, email: e.target.value})} 
                         placeholder="cliente@email.com"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">CPF / CNPJ</label>
                       <input 
                         type="text" 
                         className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500" 
                         value={editForm.cpfCnpj || ''} 
                         onChange={e => setEditForm({...editForm, cpfCnpj: e.target.value})} 
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Data de Nascimento</label>
                       <input 
                         type="date" 
                         className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500" 
                         value={editForm.birthday || ''} 
                         onChange={e => setEditForm({...editForm, birthday: e.target.value})} 
                       />
                    </div>
                 </div>
              </div>

              {/* Section 2: Strategy & Business */}
              <div className="space-y-4">
                 <h4 className="text-sm font-bold text-gray-800 uppercase flex items-center border-b border-gray-100 pb-2 mt-4">
                    <Target size={16} className="mr-2 text-blue-600" /> Inteligência Comercial
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Empresa</label>
                       <div className="relative">
                          <Building size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-md pl-8 pr-2 py-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500" 
                            value={editForm.company || ''} 
                            onChange={e => setEditForm({...editForm, company: e.target.value})} 
                            placeholder="Nome da Organização"
                          />
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Cargo / Função</label>
                       <div className="relative">
                          <Briefcase size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-md pl-8 pr-2 py-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500" 
                            value={editForm.role || ''} 
                            onChange={e => setEditForm({...editForm, role: e.target.value})} 
                            placeholder="Ex: Gerente de Compras"
                          />
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Origem do Lead</label>
                       <select 
                         className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500"
                         value={editForm.source || ''}
                         onChange={e => setEditForm({...editForm, source: e.target.value})}
                       >
                          <option value="">Selecione...</option>
                          <option value="Google Ads">Google Ads</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Indicação">Indicação</option>
                          <option value="Prospecção Ativa">Prospecção Ativa</option>
                          <option value="Evento">Evento / Networking</option>
                          <option value="WhatsApp Sync">WhatsApp Sync</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Status Atual</label>
                       <select 
                         className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500"
                         value={editForm.status || 'open'}
                         onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                       >
                          <option value="open">Em Aberto</option>
                          <option value="pending">Pendente / Negociação</option>
                          <option value="resolved">Fechado / Resolvido</option>
                       </select>
                    </div>
                    <div className="col-span-2">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Anotações Estratégicas</label>
                       <textarea 
                         className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm h-20 resize-none focus:ring-purple-500 focus:border-purple-500"
                         value={editForm.strategicNotes || ''}
                         onChange={e => setEditForm({...editForm, strategicNotes: e.target.value})}
                         placeholder="Pontos importantes para negociação, dores do cliente, perfil comportamental..."
                       />
                    </div>
                 </div>
              </div>

              {/* Section 3: Address */}
              <div className="space-y-4">
                 <h4 className="text-sm font-bold text-gray-800 uppercase flex items-center border-b border-gray-100 pb-2 mt-4">
                    <MapPin size={16} className="mr-2 text-red-500" /> Endereço
                 </h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Cidade</label>
                       <input 
                         type="text" 
                         className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500" 
                         value={editForm.city || ''} 
                         onChange={e => setEditForm({...editForm, city: e.target.value})} 
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-500 mb-1">Estado (UF)</label>
                       <input 
                         type="text" 
                         maxLength={2}
                         className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-purple-500 focus:border-purple-500 uppercase" 
                         value={editForm.state || ''} 
                         onChange={e => setEditForm({...editForm, state: e.target.value.toUpperCase()})} 
                         placeholder="SP"
                       />
                    </div>
                 </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
                 <button 
                   onClick={handleSaveContact} 
                   className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 font-medium shadow-sm flex items-center"
                 >
                    <Save size={18} className="mr-2" /> Salvar Cadastro
                 </button>
              </div>
           </div>
        ) : (
          <div className="flex flex-col h-[500px]">
             {/* History View with Chat Style Bubbles */}
             <div className="flex-1 overflow-y-auto bg-[#efeae2] relative p-4 custom-scrollbar space-y-4" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}>
                {historyMessages.length === 0 && (
                    <div className="flex h-full items-center justify-center text-gray-400 text-sm bg-white/80 p-4 rounded-lg shadow-sm">
                        Nenhum histórico de mensagens encontrado.
                    </div>
                )}
                {historyMessages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'} mb-2 group`}>
                        <div className={`max-w-[80%] relative shadow-sm rounded-lg px-3 py-2 text-sm ${
                           msg.senderId === 'me' 
                             ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' 
                             : 'bg-white text-gray-900 rounded-tl-none'
                        }`}>
                            {/* Render Content */}
                            {msg.type === 'IMAGE' ? (
                                <div className="mb-1">
                                    <img src={msg.mediaUrl || 'https://via.placeholder.com/150'} alt="Mídia" className="rounded-lg max-w-full h-auto" />
                                    {msg.content && <p className="mt-2">{msg.content}</p>}
                                </div>
                            ) : (
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center justify-end space-x-1 mt-1">
                                <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                                {msg.senderId === 'me' && (
                                   <div className="ml-1">
                                      {msg.status === 'read' ? <CheckCheck size={14} className="text-blue-500" /> : <Check size={14} className="text-gray-400" />}
                                   </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        )}
      </Modal>

      {/* Sync WhatsApp Modal */}
      <Modal isOpen={syncModalOpen} onClose={() => setSyncModalOpen(false)} title="Sincronizar WhatsApp">
          <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-start">
                  <RefreshCw className="text-green-600 mt-1 mr-3 flex-shrink-0" size={20} />
                  <p className="text-sm text-green-800">
                      Esta ação irá buscar contatos e histórico de conversas diretamente do dispositivo WhatsApp conectado.
                  </p>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ação do Servidor</label>
                  <p className="text-xs text-gray-500 mb-2">
                      O sistema irá baixar os chats recentes e atualizar a base de contatos automaticamente. Isso pode levar alguns segundos.
                  </p>
              </div>

              <div className="flex justify-end pt-4">
                  <button onClick={performSync} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium flex items-center">
                      <RefreshCw size={16} className="mr-2" /> Iniciar Sincronização Agora
                  </button>
              </div>
          </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} title="Importar Contatos">
          <div className="space-y-6 text-center">
              <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => importFileRef.current?.click()}
              >
                  <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-900">Clique para selecionar o arquivo CSV</p>
                  <p className="text-xs text-gray-500 mt-1">Formato: ID, Nome, Telefone, Email, Empresa, Tags</p>
                  <input 
                      type="file" 
                      className="hidden" 
                      ref={importFileRef} 
                      accept=".csv"
                      onChange={handleImportCSV}
                  />
              </div>
              
              <div className="bg-blue-50 p-3 rounded text-left border border-blue-100">
                  <p className="text-xs text-blue-800 font-bold mb-1 flex items-center"><FileSpreadsheet size={14} className="mr-1"/> Dica:</p>
                  <ul className="text-xs text-blue-700 list-disc pl-4 space-y-1">
                      <li>Use o cabeçalho: <code>ID,Nome,Telefone,Email,Empresa,Tags</code></li>
                      <li>A coluna <strong>ID</strong> será ignorada (o sistema gera automaticamente).</li>
                      <li>Separe múltiplas <strong>Tags</strong> por vírgula dentro da mesma célula (ex: "Cliente,VIP").</li>
                  </ul>
              </div>
          </div>
      </Modal>

      {/* Modern Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteConfirmationId} 
        onClose={() => setDeleteConfirmationId(null)}
        title="Excluir Contato"
        size="sm"
      >
         <div className="text-center p-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
               <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Tem certeza?</h3>
            <p className="text-sm text-gray-500 mb-6">
               Esta ação excluirá permanentemente o contato e todo o histórico de conversas associado. Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-center gap-3">
               <button 
                 onClick={() => setDeleteConfirmationId(null)}
                 className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
               >
                  Cancelar
               </button>
               <button 
                 onClick={executeDelete}
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

export default Contacts;