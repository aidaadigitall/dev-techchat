
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Contact, Message, MessageType } from '../types';
import { Search, MoreVertical, Paperclip, Send, Check, CheckCheck, Clock, Plus, Phone, Video, Bot, ChevronLeft, Trash2, Filter, Inbox, Clock3, CheckCircle } from 'lucide-react';
import { useToast } from '../components/ToastContext';

type ChatTab = 'open' | 'pending' | 'chatbot';

const Chat: React.FC = () => {
  const { addToast } = useToast();
  
  // UI States
  const [activeTab, setActiveTab] = useState<ChatTab>('open');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  
  // Data States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  // Polling for messages
  useEffect(() => {
    if (!selectedContact) return;
    loadMessages(selectedContact.id);
    
    const interval = setInterval(() => {
        loadMessages(selectedContact.id);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedContact]);

  useEffect(() => {
      scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadContacts = async () => {
      try {
        const fetchedContacts = await api.contacts.list();
        setContacts(fetchedContacts);
      } catch (e) {
        console.error(e);
      }
  };

  const loadMessages = async (contactId: string) => {
    try {
        const data = await api.chat.getMessages(contactId);
        setMessages(data);
    } catch (e) {
        console.error(e);
    }
  };

  const handleContactSelect = (contact: Contact) => {
      setSelectedContact(contact);
      setMobileChatOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContact) return;
    
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
        id: tempId, content: messageInput, senderId: 'me', timestamp: new Date().toLocaleTimeString(),
        type: MessageType.TEXT, status: 'sent', channel: 'whatsapp'
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');

    try { 
        await api.chat.sendMessage(selectedContact.id, optimisticMessage.content, MessageType.TEXT);
        loadMessages(selectedContact.id);
        // Atualizar lista de contatos para subir o contato para o topo (simulado)
        loadContacts();
    } catch (e: any) { 
        addToast(`Erro: ${e.message}`, 'error'); 
    } 
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { 
      if (e.key === 'Enter' && !e.shiftKey) { 
          e.preventDefault(); 
          handleSendMessage(); 
      } 
  };

  // --- Filtering Logic ---
  const filteredContacts = contacts.filter(contact => {
      // 1. Filter by Tab Logic
      // Open: status 'open'
      // Pending: status 'pending' (Aguardando)
      // Chatbot: status 'saved' or 'resolved' (Finalizados ou automáticos)
      if (activeTab === 'open') return contact.status === 'open';
      if (activeTab === 'pending') return contact.status === 'pending';
      if (activeTab === 'chatbot') return contact.status === 'resolved' || contact.status === 'saved';
      return true;
  });

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* Sidebar - Contact List */}
      <div className={`w-full md:w-96 border-r border-gray-200 flex flex-col bg-white h-full absolute md:relative z-20 md:z-auto transition-transform duration-300 ${mobileChatOpen ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
         
         {/* Search & Header */}
         <div className="p-4 border-b border-gray-100 bg-gray-50/50">
           <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Atendimento</h2>
           <div className="relative">
               <input type="text" placeholder="Buscar conversa..." className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all shadow-sm" />
               <Search className="absolute left-3 top-3 text-gray-400" size={16} />
           </div>
         </div>

         {/* Tabs */}
         <div className="flex items-center justify-between px-2 pt-2 border-b border-gray-200 bg-white">
            <button 
                onClick={() => setActiveTab('open')}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'open' ? 'border-green-500 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Abertas ({contacts.filter(c => c.status === 'open').length})
            </button>
            <button 
                onClick={() => setActiveTab('pending')}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-yellow-500 text-yellow-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Aguardando
            </button>
            <button 
                onClick={() => setActiveTab('chatbot')}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chatbot' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                Chatbot
            </button>
         </div>

         {/* List */}
         <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <Inbox size={32} className="mb-2 opacity-20"/>
                    <p className="text-sm">Nenhuma conversa nesta aba.</p>
                </div>
            )}
            {filteredContacts.map(contact => (
               <div 
                 key={contact.id} 
                 onClick={() => handleContactSelect(contact)} 
                 className={`flex items-center p-4 cursor-pointer transition-colors border-b border-gray-50 hover:bg-gray-50 group ${selectedContact?.id === contact.id ? 'bg-green-50' : ''}`}
               >
                  <div className="relative mr-3">
                    <img src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}&background=random`} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                    {contact.channel === 'whatsapp' && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white rounded-full p-0.5">
                            <Phone size={10} className="text-white fill-white" />
                        </div>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-baseline mb-1">
                          <span className={`text-sm font-semibold truncate ${selectedContact?.id === contact.id ? 'text-green-900' : 'text-gray-900'}`}>
                              {contact.name}
                          </span>
                          <span className="text-[10px] text-gray-400">{contact.lastMessageTime || 'Hoje'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500 truncate max-w-[80%]">
                              {contact.lastMessage || 'Iniciar conversa...'}
                          </p>
                          {contact.unreadCount && contact.unreadCount > 0 ? (
                              <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                  {contact.unreadCount}
                              </span>
                          ) : null}
                      </div>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col relative bg-[#efeae2] h-full w-full absolute md:relative transition-transform duration-300 ${mobileChatOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
         {selectedContact ? (
           <>
             {/* Header */}
             <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10 shadow-sm">
                <div className="flex items-center">
                   <button onClick={() => setMobileChatOpen(false)} className="md:hidden mr-3 text-gray-600 hover:bg-gray-100 p-1 rounded-full"><ChevronLeft size={24} /></button>
                   <img src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${selectedContact.name}`} className="w-10 h-10 rounded-full object-cover mr-3 cursor-pointer" />
                   <div className="cursor-pointer">
                       <h3 className="text-sm font-bold text-gray-900">{selectedContact.name}</h3>
                       <p className="text-xs text-gray-500 flex items-center">
                           {selectedContact.phone} 
                           {selectedContact.status === 'pending' && <span className="ml-2 bg-yellow-100 text-yellow-700 px-1.5 rounded text-[9px] font-bold uppercase">Aguardando</span>}
                       </p>
                   </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Transferir"><Bot size={20} /></button>
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Search size={20} /></button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><MoreVertical size={20} /></button>
                </div>
             </div>

             {/* Messages */}
             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}>
                {messages.length === 0 && (
                    <div className="flex justify-center mt-10">
                        <div className="bg-yellow-50 text-yellow-800 text-xs px-3 py-2 rounded-lg shadow-sm border border-yellow-100">
                            Esta conversa está sincronizada com o backend.
                        </div>
                    </div>
                )}
                {messages.map((msg) => (
                   <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'} group mb-1`}>
                      <div className={`max-w-[80%] md:max-w-[60%] relative shadow-sm rounded-lg px-3 py-1.5 text-sm ${msg.senderId === 'me' ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
                         <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                         <div className="flex items-center justify-end space-x-1 mt-0.5 select-none">
                            <span className="text-[10px] text-gray-500 min-w-[30px] text-right">{msg.timestamp}</span>
                            {msg.senderId === 'me' && (
                                <span className={msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}>
                                    <CheckCheck size={14} />
                                </span>
                            )}
                         </div>
                      </div>
                   </div>
                ))}
                <div ref={messagesEndRef} />
             </div>

             {/* Footer */}
             <div className="bg-[#f0f2f5] px-4 py-2 border-t border-gray-200">
                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                   <button className="p-2.5 mb-0.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><Plus size={24} /></button>
                   <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center px-2 py-1">
                      <input 
                        type="text" 
                        placeholder="Digite uma mensagem..." 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 py-2.5 max-h-32" 
                        value={messageInput} 
                        onChange={(e) => setMessageInput(e.target.value)} 
                        onKeyDown={handleKeyPress} 
                      />
                   </div>
                   {messageInput.trim() ? (
                       <button onClick={handleSendMessage} className="p-2.5 mb-0.5 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-sm transition-transform transform hover:scale-105"><Send size={20} /></button>
                   ) : (
                       <button className="p-2.5 mb-0.5 text-gray-500 hover:bg-gray-200 rounded-full"><Bot size={24} /></button>
                   )}
                </div>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-l border-gray-200">
               <div className="w-64 h-64 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                   <img src="https://cdni.iconscout.com/illustration/premium/thumb/web-development-3454633-2918522.png" alt="Select" className="w-48 opacity-80" />
               </div>
               <h2 className="text-2xl font-light text-gray-600">TechChat Web</h2>
               <p className="text-gray-500 mt-2 text-sm">Selecione um contato para iniciar o atendimento.</p>
               <div className="mt-8 text-xs text-gray-400 flex items-center">
                   <Bot size={12} className="mr-1" /> Protegido com criptografia de ponta-a-ponta
               </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default Chat;
