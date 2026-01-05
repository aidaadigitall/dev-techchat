
import React, { useState, useRef, useEffect } from 'react';
import { api, adaptMessage } from '../services/api';
import { Contact, Message, MessageType } from '../types';
import { Search, MoreVertical, Paperclip, Send, Check, CheckCheck, Clock, Plus, Phone, Video, Bot, ChevronLeft, Trash2 } from 'lucide-react';
import { useToast } from '../components/ToastContext';

const Chat: React.FC = () => {
  const { addToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  // Polling for messages when a contact is selected
  useEffect(() => {
    if (!selectedContact) return;
    loadMessages(selectedContact.id);
    
    // Poll every 5s for new messages (Standard REST approach)
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
      const fetchedContacts = await api.contacts.list();
      setContacts(fetchedContacts);
  };

  const loadMessages = async (contactId: string) => {
    const data = await api.chat.getMessages(contactId);
    // Simple diff check could be here to prevent unnecessary re-renders, but React handles it ok
    setMessages(data);
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
        loadMessages(selectedContact.id); // Refresh to get real ID and status
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

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* Sidebar - Contact List */}
      <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col bg-gray-50 h-full absolute md:relative z-20 md:z-auto transition-transform duration-300 ${selectedContact ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
         <div className="p-4 bg-white border-b border-gray-100">
           <div className="relative">
               <input type="text" placeholder="Buscar conversa..." className="w-full bg-gray-100 border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-purple-500" />
               <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
           </div>
         </div>
         <div className="flex-1 overflow-y-auto">
            {contacts.map(contact => (
               <div key={contact.id} onClick={() => setSelectedContact(contact)} className={`flex items-center p-3 cursor-pointer transition-colors border-b border-gray-100 hover:bg-gray-50 ${selectedContact?.id === contact.id ? 'bg-purple-50 border-l-4 border-l-purple-600' : 'border-l-4 border-l-transparent'}`}>
                  <img src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}`} className="w-10 h-10 rounded-full object-cover mr-3" />
                  <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-sm font-semibold truncate">{contact.name}</span>
                          <span className="text-[10px] text-gray-400">{contact.lastMessageTime}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{contact.lastMessage || 'Nenhuma mensagem'}</p>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col relative bg-[#efeae2] h-full w-full absolute md:relative transition-transform duration-300 ${selectedContact ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
         {selectedContact ? (
           <>
             {/* Header */}
             <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10 shadow-sm">
                <div className="flex items-center">
                   <button onClick={() => setSelectedContact(null)} className="md:hidden mr-3 text-gray-600"><ChevronLeft size={24} /></button>
                   <img src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${selectedContact.name}`} className="w-9 h-9 rounded-full object-cover mr-3" />
                   <div>
                       <h3 className="text-sm font-bold text-gray-900">{selectedContact.name}</h3>
                       <p className="text-xs text-gray-500">{selectedContact.phone}</p>
                   </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Phone size={20} /></button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Video size={20} /></button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><MoreVertical size={20} /></button>
                </div>
             </div>

             {/* Messages */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}>
                {messages.map((msg) => (
                   <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'} group mb-2`}>
                      <div className={`max-w-[85%] relative shadow-sm rounded-lg px-3 py-2 text-sm ${msg.senderId === 'me' ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
                         <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                         <div className="flex items-center justify-end space-x-1 mt-1">
                            <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                            {msg.senderId === 'me' && (
                                msg.status === 'read' ? <CheckCheck size={14} className="text-blue-500"/> : <Check size={14} className="text-gray-400"/>
                            )}
                         </div>
                      </div>
                   </div>
                ))}
                <div ref={messagesEndRef} />
             </div>

             {/* Footer */}
             <div className="bg-[#f0f2f5] px-4 py-2 border-t border-gray-200">
                <div className="flex items-end gap-2">
                   <button className="p-3 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><Paperclip size={24} /></button>
                   <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center px-2 py-1">
                      <input 
                        type="text" 
                        placeholder="Digite uma mensagem..." 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 py-3" 
                        value={messageInput} 
                        onChange={(e) => setMessageInput(e.target.value)} 
                        onKeyDown={handleKeyPress} 
                      />
                   </div>
                   <button onClick={handleSendMessage} className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 shadow-sm"><Send size={20} /></button>
                </div>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5]">
               <Bot size={56} className="text-gray-300 mb-4"/>
               <p className="text-gray-500">Selecione um contato para iniciar.</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default Chat;
