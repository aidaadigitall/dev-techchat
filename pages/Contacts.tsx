
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { whatsappService } from '../services/whatsapp'; // Import WhatsApp Service
import { Contact, Message, MessageType } from '../types';
import { useToast } from '../components/ToastContext';
import { Search, Filter, Download, Plus, MoreVertical, X, CheckCheck, Check, Edit, Trash2, Upload, FileText, Calendar, PlayCircle, Sparkles, Building, Briefcase, MapPin, User, Target, Save, RefreshCw, FileSpreadsheet, AlertTriangle, Clock, Map, UserCheck, AlertCircle, MessageSquarePlus, Send, PauseCircle, Play, StopCircle, Loader2, Phone } from 'lucide-react';
import Modal from '../components/Modal';

// Mock Departments for selection
const DEPARTMENTS = [
  { id: 'comercial', name: 'Comercial' },
  { id: 'suporte', name: 'Suporte Técnico' },
  { id: 'financeiro', name: 'Financeiro' },
  { id: 'retencao', name: 'Retenção' }
];

// Interface para o Job de Importação
interface ImportJob {
  id: string;
  fileName: string;
  total: number;
  processed: number;
  successCount: number;
  errorCount: number;
  data: any[]; // Dados brutos do CSV
  status: 'processing' | 'paused' | 'completed' | 'error';
}

const Contacts: React.FC = () => {
  const { addToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
  const [editTab, setEditTab] = useState<'general' | 'strategic'>('general');
  
  // New Modals State
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false); // New State
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null); 
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(false);

  // Import Job State
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const stopImportRef = useRef(false);

  // New Chat Form State
  const [availableConnections, setAvailableConnections] = useState<{id: string, name: string}[]>([]);
  const [newChatForm, setNewChatForm] = useState({
      contactId: '',
      connectionId: '',
      sectorId: '',
      initialMessage: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadContacts();
    
    // Load Connections from LocalStorage
    try {
        const saved = localStorage.getItem('wa_saved_instances');
        if (saved) {
            const parsed = JSON.parse(saved);
            const mapped = parsed.map((p: any) => ({ id: p.id, name: p.instanceName }));
            setAvailableConnections(mapped);
            if(mapped.length > 0) {
                setNewChatForm(prev => ({...prev, connectionId: mapped[0].id}));
            }
        } else {
            setAvailableConnections([{id: 'default', name: 'WhatsApp Padrão'}]);
        }
    } catch(e) {
        setAvailableConnections([{id: 'default', name: 'WhatsApp Padrão'}]);
    }

    // Check for existing Import Job in LocalStorage
    const savedJob = localStorage.getItem('contacts_import_job');
    if (savedJob) {
      try {
        const parsedJob = JSON.parse(savedJob);
        if (parsedJob.status !== 'completed') {
          // Pause it initially on reload so user can choose to resume
          parsedJob.status = 'paused';
          setImportJob(parsedJob);
          addToast('Importação pendente encontrada. Você pode retomá-la.', 'info');
        } else {
          localStorage.removeItem('contacts_import_job');
        }
      } catch (e) {
        console.error("Erro ao recuperar job", e);
        localStorage.removeItem('contacts_import_job');
      }
    }
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

  // --- Selection Logic ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredContacts.map(c => c.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    setBulkDeleteConfirmation(false);
    setLoading(true);
    let deletedCount = 0;
    
    try {
      // Execute deletions (sequential to avoid overwhelming backend/browser, could be parallel in real API)
      for (const id of Array.from(selectedIds)) {
        await api.contacts.delete(id);
        deletedCount++;
      }
      
      setContacts(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      addToast(`${deletedCount} contatos excluídos com sucesso.`, 'success');
    } catch (e) {
      addToast('Erro ao excluir alguns contatos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Import Process Logic ---

  const processImportQueue = async (job: ImportJob) => {
    stopImportRef.current = false;
    // FIX: Explicitly type currentJob to prevent 'status' type narrowing
    let currentJob: ImportJob = { ...job, status: 'processing' };
    setImportJob(currentJob);
    
    // Helper to save state
    const updateJobState = (updated: ImportJob) => {
      setImportJob({ ...updated });
      localStorage.setItem('contacts_import_job', JSON.stringify(updated));
    };

    try {
      for (let i = currentJob.processed; i < currentJob.total; i++) {
        // Check stop signal
        if (stopImportRef.current) {
          currentJob.status = 'paused';
          updateJobState(currentJob);
          return;
        }

        const rawContact = currentJob.data[i];
        
        try {
          if (rawContact.name && rawContact.phone && rawContact.phone.length >= 10) {
             await api.contacts.create({
                name: rawContact.name,
                phone: rawContact.phone,
                email: rawContact.email,
                source: 'Importação CSV',
                status: 'saved' // STATUS 'SAVED' (Apenas na base, sem ticket gerado)
             });
             currentJob.successCount++;
          } else {
             currentJob.errorCount++;
          }
        } catch (err) {
          console.error("Erro ao importar linha", i, err);
          currentJob.errorCount++;
        }

        // Update counters
        currentJob.processed = i + 1;
        
        // Save progress every 5 items or on the last one to save performance
        if (i % 5 === 0 || i === currentJob.total - 1) {
           updateJobState(currentJob);
        }
        
        // Small delay to prevent UI freezing and allow pause interaction
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Completed
      currentJob.status = 'completed';
      updateJobState(currentJob);
      addToast(`Importação finalizada! ${currentJob.successCount} sucessos, ${currentJob.errorCount} erros.`, 'success');
      
      // Cleanup after success
      setTimeout(() => {
        setImportJob(null);
        localStorage.removeItem('contacts_import_job');
        loadContacts();
      }, 2000);

    } catch (e) {
      console.error("Fatal import error", e);
      currentJob.status = 'error';
      updateJobState(currentJob);
      addToast('Erro fatal durante a importação.', 'error');
    }
  };

  const resumeImport = () => {
    if (importJob) {
      processImportQueue(importJob);
    }
  };

  const pauseImport = () => {
    stopImportRef.current = true;
    if (importJob) {
      setImportJob({ ...importJob, status: 'paused' });
    }
  };

  const cancelImport = () => {
    stopImportRef.current = true;
    localStorage.removeItem('contacts_import_job');
    setImportJob(null);
    loadContacts();
    addToast('Importação cancelada.', 'info');
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

  const handleEditContact = (contact: Contact, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    setSelectedContact(contact);
    setEditForm(contact);
    setIsEditing(true);
    setEditTab('general');
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
        addToast('Erro ao excluir contato.', 'error');
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
      status: 'saved', // Padrão: Salvo na base (não abre ticket)
      avatar: '',
      source: 'Indicação',
      role: '',
      strategicNotes: ''
    };
    setSelectedContact(newContact as Contact);
    setEditForm(newContact);
    setIsEditing(true);
    setEditTab('general');
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
    
    // Remove non-digits
    const cleanPhone = form.phone.replace(/\D/g, '');
    
    // Check reasonable length for phones (Brazil: 10 or 11, International can be more)
    // Assuming a lenient check for international support, but strict enough to be a phone number
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      addToast("Telefone inválido. Insira o DDD + Número (Mínimo 10 dígitos).", 'warning');
      return false;
    }

    return true;
  };

  const handleSaveContact = async () => {
    if (!validateForm(editForm)) return;

    try {
        let savedContact: Contact;
        if (editForm.id && contacts.find(c => c.id === editForm.id)) {
            // Update
            savedContact = await api.contacts.update(editForm.id, editForm);
            setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
            addToast("Contato atualizado!", 'success');
        } else {
            // Create
            savedContact = await api.contacts.create(editForm);
            setContacts(prev => [savedContact, ...prev]);
            addToast("Contato criado!", 'success');
        }
        setIsEditing(false);
        setSelectedContact(null);
    } catch (e: any) {
        addToast(`Erro ao salvar: ${e.message}`, 'error');
    }
  };

  // --- Start Chat Logic ---
  
  // Handler to open modal with pre-filled contact
  const handleOpenNewChat = (contact: Contact, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setNewChatForm(prev => ({
          ...prev,
          contactId: contact.id,
          initialMessage: ''
      }));
      setNewChatModalOpen(true);
  };

  const handleStartChat = async () => {
      if (!newChatForm.contactId) {
          addToast("Selecione um contato para iniciar.", "warning");
          return;
      }
      if (!newChatForm.sectorId) {
          addToast("Selecione o setor responsável.", "warning");
          return;
      }

      setLoading(true);
      try {
          // 1. If there's an initial message, send it
          if (newChatForm.initialMessage.trim()) {
              await api.chat.sendMessage(newChatForm.contactId, newChatForm.initialMessage);
          }

          // 2. Update contact sector/connection info (Simulated via update)
          // CHANGE STATUS TO OPEN (This creates the ticket)
          await api.contacts.update(newChatForm.contactId, {
              status: 'open',
              // In a real app, you would pass sector/connection to backend here
              // sector: newChatForm.sectorId 
          });

          addToast("Atendimento iniciado com sucesso! Vá para a aba de Atendimento.", "success");
          setNewChatModalOpen(false);
          setNewChatForm(prev => ({ ...prev, contactId: '', sectorId: '', initialMessage: '' }));
      } catch (error) {
          addToast("Erro ao iniciar atendimento.", "error");
      } finally {
          setLoading(false);
      }
  };

  // --- Sync & Import/Export Logic ---
  const handleSyncWhatsapp = () => setSyncModalOpen(true);
  
  const performSync = async () => {
      setSyncModalOpen(false);
      setLoading(true);
      try {
          const status = whatsappService.getStatus();
          if (status !== 'connected') throw new Error("WhatsApp não está conectado.");
          addToast('Sincronizando...', 'info');
          await whatsappService.syncHistory();
          await loadContacts();
          addToast('Sincronização concluída!', 'success');
      } catch (error: any) {
          addToast(`Erro na sincronização: ${error.message}`, 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleExportContacts = () => {
      const headers = "ID,Nome,Telefone,Email,Empresa,Cargo,CPF/CNPJ,Tags\n";
      const rows = contacts.map(c => `${c.id},"${c.name}",${c.phone},${c.email || ''},${c.company || ''},${c.role || ''},${c.cpfCnpj || ''},"${c.tags.join(',')}"`).join("\n");
      const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + rows);
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", "contatos_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Exportação iniciada.', 'success');
  };

  // CSV Import Logic (Persistent V2)
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        const text = evt.target?.result as string;
        const lines = text.split('\n');
        
        // Basic Parsing Logic
        const headerLine = lines[0] || '';
        const separator = headerLine.includes(';') ? ';' : ',';
        const hasHeader = headerLine.toLowerCase().includes('nome') || headerLine.toLowerCase().includes('name');
        const startIdx = hasHeader ? 1 : 0;

        const parsedData = [];

        for(let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if(!line) continue;
            
            const parts = line.split(separator).map(p => p.trim().replace(/^"|"$/g, ''));
            
            if (parts.length >= 2) { 
                const name = parts[0];
                const phone = parts[1].replace(/\D/g, ''); 
                const email = parts[2] || '';
                
                if (name && phone && phone.length >= 10) {
                    parsedData.push({ name, phone, email });
                }
            }
        }

        if (parsedData.length === 0) {
            addToast('Nenhum dado válido encontrado no CSV.', 'warning');
            return;
        }

        // Create new Job
        const newJob: ImportJob = {
            id: `import_${Date.now()}`,
            fileName: file.name,
            total: parsedData.length,
            processed: 0,
            successCount: 0,
            errorCount: 0,
            data: parsedData,
            status: 'processing'
        };

        setImportModalOpen(false);
        if (importFileRef.current) importFileRef.current.value = '';
        
        // Save and Start
        localStorage.setItem('contacts_import_job', JSON.stringify(newJob));
        setImportJob(newJob);
        processImportQueue(newJob);
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
          {selectedIds.size > 0 ? (
             <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-100 animate-fadeIn">
                <span className="text-sm font-bold text-purple-800 px-2">{selectedIds.size} selecionados</span>
                <button 
                  onClick={() => setBulkDeleteConfirmation(true)}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 flex items-center shadow-sm"
                >
                   <Trash2 size={16} className="mr-2" /> Excluir Selecionados
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="px-2 text-gray-500 hover:text-gray-700"><X size={16}/></button>
             </div>
          ) : (
             <>
                <button onClick={() => setNewChatModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-sm text-sm font-medium transition-colors">
                   <MessageSquarePlus size={18} className="mr-2" /> Novo Atendimento
                </button>
                <div className="h-8 w-px bg-gray-300 mx-1 hidden sm:block"></div>
                <button onClick={() => setImportModalOpen(true)} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center text-sm font-medium transition-colors"><Upload size={16} className="mr-2" /> Importar</button>
                <button onClick={handleExportContacts} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center text-sm font-medium transition-colors"><Download size={16} className="mr-2" /> Exportar</button>
                <button onClick={handleSyncWhatsapp} className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 flex items-center text-sm font-medium transition-colors"><RefreshCw size={16} className="mr-2" /> Sincronizar</button>
                <button onClick={handleNewContact} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center shadow-sm text-sm font-medium transition-colors"><Plus size={18} className="mr-2" /> Novo Contato</button>
             </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
          <div className="relative w-full sm:w-96">
            <input type="text" placeholder="Buscar por nome, telefone, email ou cargo..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
             <div className="p-10 flex flex-col items-center justify-center text-gray-500"><RefreshCw size={32} className="animate-spin mb-2 text-purple-600" /><p>Carregando...</p></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredContacts.length} />
                  </th>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Cargo / Empresa</th>
                  <th className="px-6 py-4">Contato (WhatsApp)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className={`hover:bg-gray-50 transition-colors cursor-pointer group ${selectedIds.has(contact.id) ? 'bg-purple-50' : ''}`} onClick={() => handleViewHistory(contact)}>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" 
                          checked={selectedIds.has(contact.id)}
                          onChange={() => handleSelectOne(contact.id)}
                        />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-10 w-10 rounded-full object-cover" src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}`} alt="" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                          <div className="text-xs text-gray-500">{contact.cpfCnpj || 'PF'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{contact.role || 'Não inf.'}</div>
                      <div className="text-xs text-gray-500">{contact.company || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center group/phone">
                          <span className="mr-2">{contact.phone}</span>
                          <button 
                            onClick={(e) => handleOpenNewChat(contact, e)}
                            className="bg-green-100 p-1.5 rounded-full text-green-600 hover:bg-green-200 hover:scale-110 transition-all shadow-sm"
                            title="Iniciar atendimento pelo WhatsApp"
                          >
                              <Phone size={14} className="fill-green-600" />
                          </button>
                      </div>
                      <div className="text-xs text-gray-400">{contact.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       {contact.status === 'saved' ? (
                           <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">Base</span>
                       ) : contact.status === 'open' ? (
                           <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-100">Em Aberto</span>
                       ) : (
                           <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">{contact.source || 'Lead'}</span>
                       )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                      <button onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === contact.id ? null : contact.id); }} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"><MoreVertical size={18} /></button>
                      {actionMenuOpenId === contact.id && (
                        <div className="absolute right-8 top-8 w-48 bg-white rounded-md shadow-lg border border-gray-100 z-50 animate-fadeIn">
                           <button onClick={(e) => handleEditContact(contact, e)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"><Edit size={14} className="mr-2 text-purple-600" /> Editar</button>
                           <button onClick={(e) => confirmDeleteContact(contact.id, e)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"><Trash2 size={14} className="mr-2" /> Excluir</button>
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

      {/* Progress Widget (Import Persistence) */}
      {importJob && (
        <div className="fixed bottom-4 right-4 z-[60] w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-slideInRight">
           <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
              <h4 className="text-sm font-bold text-purple-800 flex items-center">
                 {importJob.status === 'processing' && <Loader2 size={16} className="animate-spin mr-2"/>}
                 {importJob.status === 'paused' && <PauseCircle size={16} className="mr-2"/>}
                 {importJob.status === 'completed' && <CheckCheck size={16} className="mr-2"/>}
                 Importando Contatos
              </h4>
              <button onClick={cancelImport} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
           </div>
           <div className="p-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                 <span>Arquivo: {importJob.fileName}</span>
                 <span>{Math.round((importJob.processed / importJob.total) * 100)}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                 <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(importJob.processed / importJob.total) * 100}%` }}></div>
              </div>

              <div className="flex justify-between text-xs mb-4">
                 <span className="text-green-600 flex items-center"><Check size={12} className="mr-1"/> {importJob.successCount} ok</span>
                 <span className="text-red-500 flex items-center"><AlertCircle size={12} className="mr-1"/> {importJob.errorCount} erros</span>
                 <span className="text-gray-400">{importJob.processed}/{importJob.total}</span>
              </div>

              <div className="flex justify-between gap-2">
                 {importJob.status === 'processing' ? (
                    <button onClick={pauseImport} className="flex-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded py-1.5 text-xs font-bold flex items-center justify-center hover:bg-yellow-100">
                       <PauseCircle size={14} className="mr-1" /> Pausar
                    </button>
                 ) : (
                    <button onClick={resumeImport} className="flex-1 bg-green-50 text-green-700 border border-green-200 rounded py-1.5 text-xs font-bold flex items-center justify-center hover:bg-green-100">
                       <Play size={14} className="mr-1" /> Continuar
                    </button>
                 )}
                 <button onClick={cancelImport} className="flex-1 bg-gray-50 text-gray-600 border border-gray-200 rounded py-1.5 text-xs font-bold flex items-center justify-center hover:bg-gray-100">
                    <StopCircle size={14} className="mr-1" /> Cancelar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Start Chat Modal */}
      <Modal
        isOpen={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        title="Iniciar Novo Atendimento"
        size="md"
      >
         <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Selecionar Contato</label>
               <select 
                 className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 value={newChatForm.contactId}
                 onChange={e => setNewChatForm({...newChatForm, contactId: e.target.value})}
               >
                  <option value="">Selecione um contato...</option>
                  {contacts.map(c => (
                     <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
               </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Conexão (WhatsApp)</label>
                   <select 
                     className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm"
                     value={newChatForm.connectionId}
                     onChange={e => setNewChatForm({...newChatForm, connectionId: e.target.value})}
                   >
                      {availableConnections.length === 0 && <option value="">Nenhuma conexão ativa</option>}
                      {availableConnections.map(conn => (
                         <option key={conn.id} value={conn.id}>{conn.name}</option>
                      ))}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Setor / Departamento</label>
                   <select 
                     className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm"
                     value={newChatForm.sectorId}
                     onChange={e => setNewChatForm({...newChatForm, sectorId: e.target.value})}
                   >
                      <option value="">Selecione...</option>
                      {DEPARTMENTS.map(dept => (
                         <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                   </select>
                </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem Inicial (Opcional)</label>
               <textarea 
                 className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="Olá, como podemos ajudar hoje?"
                 value={newChatForm.initialMessage}
                 onChange={e => setNewChatForm({...newChatForm, initialMessage: e.target.value})}
               ></textarea>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 mt-2">
                <button 
                  onClick={() => setNewChatModalOpen(false)} 
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg mr-2"
                >
                   Cancelar
                </button>
                <button 
                  onClick={handleStartChat} 
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-sm font-medium"
                >
                   {loading ? <RefreshCw size={16} className="animate-spin mr-2"/> : <Send size={16} className="mr-2" />} 
                   Iniciar Conversa
                </button>
            </div>
         </div>
      </Modal>

      {/* Edit/Create Modal (Strategic V2) */}
      <Modal
        isOpen={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        title={isEditing ? (editForm.id ? `Editar Contato` : `Novo Cliente Estratégico`) : `Histórico: ${selectedContact?.name || ''}`}
        size="lg"
      >
        {isEditing ? (
           <div className="max-h-[75vh] overflow-y-auto p-1 custom-scrollbar">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                  <button onClick={() => setEditTab('general')} className={`px-4 py-2 text-sm font-medium ${editTab === 'general' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>Dados Gerais</button>
                  <button onClick={() => setEditTab('strategic')} className={`px-4 py-2 text-sm font-medium ${editTab === 'strategic' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>Estratégia & Endereço</button>
              </div>

              {editTab === 'general' && (
                  <div className="space-y-4 animate-fadeIn">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <label className="block text-xs font-medium text-gray-500 mb-1">Nome Completo *</label>
                           <input type="text" className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-2 focus:ring-purple-500" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Ex: Maria Silva" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-gray-500 mb-1">Telefone (WhatsApp) *</label>
                           <input type="text" className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="Ex: 5511999999999" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                           <input type="email" className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="cliente@email.com" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-gray-500 mb-1">Empresa</label>
                           <div className="relative">
                              <Building size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                              <input type="text" className="w-full border border-gray-300 rounded-md pl-8 pr-2 py-2 bg-white text-sm" value={editForm.company || ''} onChange={e => setEditForm({...editForm, company: e.target.value})} placeholder="Nome da Organização" />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-gray-500 mb-1">CPF / CNPJ</label>
                           <input type="text" className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm" value={editForm.cpfCnpj || ''} onChange={e => setEditForm({...editForm, cpfCnpj: e.target.value})} placeholder="000.000.000-00" />
                        </div>
                     </div>
                  </div>
              )}

              {editTab === 'strategic' && (
                  <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-medium text-gray-500 mb-1">Cargo / Função</label>
                             <div className="relative">
                                <UserCheck size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                                <input type="text" className="w-full border border-gray-300 rounded-md pl-8 pr-2 py-2 bg-white text-sm" value={editForm.role || ''} onChange={e => setEditForm({...editForm, role: e.target.value})} placeholder="Ex: Diretor de Compras" />
                             </div>
                          </div>
                          <div>
                             <label className="block text-xs font-medium text-gray-500 mb-1">Data de Nascimento</label>
                             <input type="date" className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm" value={editForm.birthday || ''} onChange={e => setEditForm({...editForm, birthday: e.target.value})} />
                          </div>
                          <div>
                             <label className="block text-xs font-medium text-gray-500 mb-1">Cidade</label>
                             <input type="text" className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm" value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} placeholder="São Paulo" />
                          </div>
                          <div>
                             <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                             <input type="text" className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm" value={editForm.state || ''} onChange={e => setEditForm({...editForm, state: e.target.value})} placeholder="SP" />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Notas Estratégicas (CRM)</label>
                          <textarea 
                            className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm h-24 resize-none focus:ring-purple-500" 
                            placeholder="Ex: Cliente prefere contato pela manhã. Interessado em expansão para filial X."
                            value={editForm.strategicNotes || ''}
                            onChange={e => setEditForm({...editForm, strategicNotes: e.target.value})}
                          />
                      </div>
                  </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
                 <button onClick={handleSaveContact} className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 font-medium shadow-sm flex items-center">
                    <Save size={18} className="mr-2" /> Salvar Cadastro
                 </button>
              </div>
           </div>
        ) : (
          /* History View (Unchanged from original logic) */
          <div className="flex flex-col h-[500px]">
             <div className="flex-1 overflow-y-auto bg-[#efeae2] relative p-4 custom-scrollbar space-y-4" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}>
                {historyMessages.length === 0 && <div className="flex h-full items-center justify-center text-gray-400 text-sm bg-white/80 p-4 rounded-lg shadow-sm">Nenhum histórico de mensagens encontrado.</div>}
                {historyMessages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'} mb-2 group`}>
                        <div className={`max-w-[80%] relative shadow-sm rounded-lg px-3 py-2 text-sm ${msg.senderId === 'me' ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            <div className="flex items-center justify-end space-x-1 mt-1"><span className="text-[10px] text-gray-500">{msg.timestamp}</span></div>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        )}
      </Modal>

      {/* Sync Modal */}
      <Modal 
        isOpen={syncModalOpen} 
        onClose={() => setSyncModalOpen(false)}
        title="Sincronizar com WhatsApp"
        size="sm"
        footer={
           <div className="flex justify-end gap-2 w-full">
              <button onClick={() => setSyncModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">Cancelar</button>
              <button onClick={performSync} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center text-sm shadow-sm">
                <RefreshCw size={16} className="mr-2" /> Iniciar Sincronização
              </button>
           </div>
        }
      >
         <div className="p-2">
            <div className="flex items-center bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                <RefreshCw className="text-blue-600 mr-3 flex-shrink-0" size={24} />
                <p className="text-sm text-blue-800">Isso importará conversas e contatos recentes do seu WhatsApp conectado.</p>
            </div>
            <p className="text-xs text-gray-500 text-center">
               A operação pode levar alguns instantes dependendo do volume de dados. Certifique-se de que o aparelho esteja conectado.
            </p>
         </div>
      </Modal>

      {/* Import CSV Modal */}
      <Modal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} title="Importar Contatos (CSV)">
         <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => importFileRef.current?.click()}>
               <Upload size={32} className="text-gray-400 mb-2" />
               <p className="text-sm font-medium text-gray-700">Clique para selecionar o arquivo CSV</p>
               <p className="text-xs text-gray-500 mt-1">Formato: Nome, Telefone, Email (Opcional)</p>
               <input 
                 type="file" 
                 accept=".csv" 
                 ref={importFileRef} 
                 className="hidden" 
                 onChange={handleImportCSV} 
               />
            </div>
            
            <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 border border-gray-200">
               <p className="font-bold mb-1 flex items-center"><AlertCircle size={14} className="mr-1"/> Exemplo de formato:</p>
               <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto text-[10px]">
                  Nome,Telefone,Email{'\n'}
                  João Silva,5511999999999,joao@email.com{'\n'}
                  Maria Souza,5511888888888,
               </pre>
            </div>

            <div className="flex justify-end pt-2">
               <button onClick={() => setImportModalOpen(false)} className="text-gray-600 text-sm hover:underline">Cancelar</button>
            </div>
         </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirmationId} onClose={() => setDeleteConfirmationId(null)} title="Excluir Contato" size="sm">
         <div className="text-center p-2">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
               <AlertTriangle size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tem certeza?</h3>
            <p className="text-sm text-gray-500 mb-6">
               Esta ação removerá o contato e seu histórico local. Para apagar do WhatsApp, use o aplicativo móvel.
            </p>
            <div className="flex justify-center gap-3">
               <button onClick={() => setDeleteConfirmationId(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancelar</button>
               <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm text-sm">Excluir</button>
            </div>
         </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal isOpen={bulkDeleteConfirmation} onClose={() => setBulkDeleteConfirmation(false)} title="Exclusão em Massa" size="sm">
         <div className="text-center p-2">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
               <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Excluir {selectedIds.size} contatos?</h3>
            <p className="text-sm text-gray-500 mb-6">
               Você está prestes a remover {selectedIds.size} contatos selecionados. Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-center gap-3">
               <button onClick={() => setBulkDeleteConfirmation(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancelar</button>
               <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm text-sm">Confirmar Exclusão</button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default Contacts;
