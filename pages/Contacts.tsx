import React, { useState, useRef } from 'react';
import { MOCK_CONTACTS } from '../constants';
import { api } from '../services/api';
import { Contact, Message, MessageType } from '../types';
import { Search, Filter, Download, Plus, MoreVertical, MessageCircle, X, CheckCheck, Check, Edit, Trash2, Upload, FileText, Ban } from 'lucide-react';
import Modal from '../components/Modal';

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter State
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilterTag, setActiveFilterTag] = useState('');

  // Menu State
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});
  
  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Fetch history
    const msgs = await api.chat.getMessages(contact.id);
    setHistoryMessages(msgs);
    setLoadingHistory(false);
  };

  const handleEditContact = (contact: Contact, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    setSelectedContact(contact);
    setEditForm(contact);
    setIsEditing(true);
    setActionMenuOpenId(null);
  };

  const handleDeleteContact = (contactId: string, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    if(confirm('Tem certeza que deseja excluir este contato?')) {
      setContacts(prev => prev.filter(c => c.id !== contactId));
    }
    setActionMenuOpenId(null);
  };

  const handleNewContact = () => {
    const newContact: Contact = {
      id: Date.now().toString(),
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

  const handleSaveContact = () => {
    if (!editForm.name || !editForm.phone) {
      alert("Nome e Telefone são obrigatórios.");
      return;
    }

    if (contacts.find(c => c.id === editForm.id)) {
      setContacts(prev => prev.map(c => c.id === editForm.id ? { ...c, ...editForm } as Contact : c));
    } else {
      setContacts(prev => [...prev, editForm as Contact]);
    }
    alert("Contato salvo com sucesso!");
    setIsEditing(false);
    setSelectedContact(null);
  };

  // --- Import / Export ---

  const handleExportContacts = () => {
    const headers = "ID,Nome,Telefone,Email,Empresa,Tags\n";
    const rows = filteredContacts.map(c => 
      `${c.id},"${c.name}","${c.phone}","${c.email || ''}","${c.company || ''}","${c.tags.join(',')}"`
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `contatos_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n');
      // Simple parsing: Name,Phone (expecting 55...)
      const newContacts: Contact[] = [];
      
      // Skip header if present (heuristic)
      const startIdx = lines[0].toLowerCase().includes('nome') ? 1 : 0;

      for(let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if(!line) continue;
        const parts = line.split(',');
        if (parts.length >= 2) {
           const name = parts[0].replace(/"/g, '').trim();
           const phone = parts[1].replace(/"/g, '').trim(); 
           
           // Basic validation for Brazilian number format roughly
           // Remove non-digits
           const cleanPhone = phone.replace(/\D/g, '');
           
           if(name && cleanPhone) {
             newContacts.push({
               id: `imp_${Date.now()}_${i}`,
               name,
               phone: `+${cleanPhone}`,
               avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
               tags: ['Importado'],
               status: 'pending'
             });
           }
        }
      }

      if(newContacts.length > 0) {
        setContacts(prev => [...prev, ...newContacts]);
        alert(`${newContacts.length} contatos importados com sucesso!`);
      } else {
        alert("Nenhum contato válido encontrado. Use o formato CSV: Nome,5511999999999");
      }
      if(fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handlePrintHistory = () => {
    if (!selectedContact) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
        <html>
          <head>
            <title>Histórico - ${selectedContact.name}</title>
            <style>
              @page { size: A4; margin: 2cm; }
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; margin: 0; color: #333; line-height: 1.6; font-size: 12px; }
              .container { max-width: 21cm; margin: 0 auto; padding: 20px; }
              .header { border-bottom: 2px solid #6d28d9; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
              .header-info h1 { margin: 0; font-size: 20px; color: #4c1d95; text-transform: uppercase; letter-spacing: 1px; }
              .header-info p { margin: 5px 0 0; color: #666; font-size: 12px; }
              .meta-tag { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 10px; margin-right: 5px; border: 1px solid #ddd; }
              .message-list { display: flex; flex-direction: column; gap: 10px; }
              .message { padding: 10px 14px; border-radius: 8px; max-width: 75%; font-size: 11px; page-break-inside: avoid; position: relative; }
              .message.me { background-color: #f3f0ff; border: 1px solid #ddd6fe; margin-left: auto; }
              .message.contact { background-color: #fff; border: 1px solid #e5e7eb; margin-right: auto; }
              .msg-content { white-space: pre-wrap; margin-bottom: 15px; color: #1f2937; }
              .msg-meta { font-size: 9px; color: #9ca3af; position: absolute; bottom: 6px; right: 10px; }
              .footer { margin-top: 50px; text-align: center; font-size: 9px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="header-info">
                  <h1>Histórico de Conversa</h1>
                  <p><strong>Cliente:</strong> ${selectedContact.name}</p>
                  <p><strong>Telefone:</strong> ${selectedContact.phone}</p>
                  <p><strong>Empresa:</strong> ${selectedContact.company || 'N/A'}</p>
                </div>
                <div style="text-align: right; font-size: 10px; color: #888;">
                  <p>Gerado em: ${new Date().toLocaleString()}</p>
                  <p>OmniConnect CRM</p>
                </div>
              </div>
              <div class="message-list">
                ${historyMessages.map(m => `
                  <div class="message ${m.senderId === 'me' ? 'me' : 'contact'}">
                    <div class="msg-content">${m.content.replace(/\n/g, '<br/>')}</div>
                    <div class="msg-meta">${m.timestamp} • ${m.senderId === 'me' ? 'Agente' : selectedContact.name}</div>
                  </div>
                `).join('')}
              </div>
              <div class="footer">
                Documento confidencial gerado automaticamente pelo sistema OmniConnect.
              </div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="p-6 h-full bg-gray-50 overflow-y-auto" onClick={() => { setActionMenuOpenId(null); setShowFilter(false); }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Contatos</h1>
           <p className="text-gray-500">Gerencie sua base de clientes.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv" 
            onChange={handleImportCSV} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center shadow-sm"
          >
             <Upload size={18} className="mr-2" /> Importar
          </button>
          <button 
            onClick={handleExportContacts}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center shadow-sm"
          >
             <Download size={18} className="mr-2" /> Exportar
          </button>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowFilter(!showFilter); }}
              className={`px-4 py-2 rounded-lg border flex items-center transition-colors ${showFilter || activeFilterTag ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={18} className="mr-2" /> Filtros {activeFilterTag && '(Ativo)'}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-12 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-3 animate-fadeIn">
                 <p className="text-xs font-bold text-gray-400 uppercase mb-2">Filtrar por Tag</p>
                 <div className="space-y-1">
                    <button onClick={() => setActiveFilterTag('')} className={`w-full text-left px-3 py-1.5 text-sm rounded ${!activeFilterTag ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}>Todas</button>
                    {['Cliente', 'Lead', 'VIP', 'Suporte', 'Importado'].map(tag => (
                       <button 
                         key={tag} 
                         onClick={() => setActiveFilterTag(tag)} 
                         className={`w-full text-left px-3 py-1.5 text-sm rounded ${activeFilterTag === tag ? 'bg-purple-100 text-purple-700 font-bold' : 'hover:bg-gray-50'}`}
                       >
                         {tag}
                       </button>
                    ))}
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Tags</th>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1 flex-wrap">
                      {contact.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === contact.id ? null : contact.id); }}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {/* Action Dropdown */}
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
        </div>
      </div>

      {/* History / Edit Modal */}
      <Modal
        isOpen={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        title={isEditing ? `Editar Contato: ${selectedContact?.name}` : `Histórico: ${selectedContact?.name || ''}`}
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
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Qtd. Funcionários</label>
                    <input 
                      type="text" 
                      className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                      value={editForm.employees || ''} 
                      onChange={e => setEditForm({...editForm, employees: e.target.value})} 
                      placeholder="Ex: 10-50" 
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Cargo</label>
                    <input 
                      type="text" 
                      className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                      value={editForm.role || ''} 
                      onChange={e => setEditForm({...editForm, role: e.target.value})} 
                      placeholder="Ex: Gerente" 
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Setor</label>
                    <input 
                      type="text" 
                      className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                      value={editForm.sector || ''} 
                      onChange={e => setEditForm({...editForm, sector: e.target.value})} 
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Endereço</label>
                    <input 
                      type="text" 
                      className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                      value={editForm.address || ''} 
                      onChange={e => setEditForm({...editForm, address: e.target.value})} 
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <input 
                      type="text" 
                      className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                      value={editForm.state || ''} 
                      onChange={e => setEditForm({...editForm, state: e.target.value})} 
                      placeholder="Ex: SP" 
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700">Tags (separadas por vírgula)</label>
                 <input 
                    type="text" 
                    className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                    value={editForm.tags?.join(', ') || ''} 
                    onChange={e => setEditForm({...editForm, tags: e.target.value.split(',').map(t => t.trim())})} 
                    placeholder="Cliente, VIP, Lead..."
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700">Informações Importantes</label>
                 <textarea 
                    className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                    rows={2}
                    value={editForm.importantInfo || ''} 
                    onChange={e => setEditForm({...editForm, importantInfo: e.target.value})}
                    placeholder="Ex: Cliente prefere contato pela manhã."
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700">Notas / Observações</label>
                 <textarea 
                    className="w-full border rounded p-2 bg-white text-gray-900 placeholder:text-gray-400" 
                    rows={3}
                    value={editForm.notes || ''} 
                    onChange={e => setEditForm({...editForm, notes: e.target.value})}
                 />
              </div>

              <div className="flex justify-end pt-2">
                 <button onClick={handleSaveContact} className="bg-purple-600 text-white px-4 py-2 rounded">Salvar Alterações</button>
              </div>
           </div>
        ) : (
          <div className="h-96 flex flex-col bg-[#efeae2] rounded-lg border border-gray-200 overflow-hidden relative">
              <div className="absolute inset-0 opacity-5 pointer-events-none" 
                 style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")'}}>
              </div>
             {loadingHistory ? (
               <div className="flex items-center justify-center h-full text-gray-500 z-10">Carregando histórico...</div>
             ) : (
               <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar z-10">
                  {historyMessages.length === 0 ? (
                    <p className="text-center text-gray-400 mt-10">Nenhuma conversa encontrada.</p>
                  ) : (
                    historyMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm relative ${
                          msg.senderId === 'me' 
                            ? 'bg-[#9333ea] text-white rounded-tr-none' 
                            : 'bg-white text-gray-800 rounded-tl-none'
                        }`}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          <div className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${msg.senderId === 'me' ? 'text-purple-200' : 'text-gray-400'}`}>
                             <span>{msg.timestamp}</span>
                             {msg.senderId === 'me' && (
                                msg.status === 'read' 
                                ? <CheckCheck size={14} className="text-blue-300" /> 
                                : (msg.status === 'delivered' ? <CheckCheck size={14} /> : <Check size={14} />)
                             )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
               </div>
             )}
             <div className="p-3 bg-white border-t border-gray-200 flex justify-between z-10">
                <button onClick={handlePrintHistory} className="text-sm text-purple-600 font-bold hover:text-purple-800 flex items-center">
                   <FileText size={16} className="mr-1" /> Exportar PDF
                </button>
                <button onClick={() => setSelectedContact(null)} className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded border hover:bg-gray-50">Fechar</button>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Contacts;