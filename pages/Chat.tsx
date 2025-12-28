import React, { useState, useRef, useEffect } from 'react';
import { MOCK_CONTACTS, MOCK_USERS } from '../constants';
import { api } from '../services/api';
import { Contact, Message, MessageType, QuickReply, AIInsight } from '../types';
import { 
  Search, MoreVertical, Paperclip, Smile, Mic, Send, 
  Check, CheckCheck, Tag, Clock, User, MessageSquare,
  Phone, Video, FileText, Image as ImageIcon, Briefcase,
  Bot, ChevronDown, X, Loader2, ArrowRightLeft,
  Calendar, CheckSquare, Trash2, Plus, Key, Save, Settings,
  Edit, Share2, Download, Ban, Film, Repeat, MapPin, PenTool, Zap, Map, Sparkles, BrainCircuit, Lightbulb, PlayCircle, Target, Lock,
  Star, PhoneCall, Grid, List, ChevronLeft, FileSpreadsheet
} from 'lucide-react';
import Modal from '../components/Modal';

// Mock simple emoji list
const COMMON_EMOJIS = ["😀", "😂", "😅", "🥰", "😎", "🤔", "👍", "👎", "👋", "🙏", "🔥", "🎉", "❤️", "💔", "✅", "❌", "✉️", "📞"];

const DEPARTMENTS = [
  { id: 'comercial', name: 'Comercial' },
  { id: 'suporte', name: 'Suporte Técnico' },
  { id: 'financeiro', name: 'Financeiro' },
  { id: 'retencao', name: 'Retenção' }
];

const Chat: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'pending' | 'resolved'>('open');
  
  // Right Panel States
  const [rightPanelOpen, setRightPanelOpen] = useState(false); // Contact Details
  const [rightPanelView, setRightPanelView] = useState<'info' | 'starred'>('info'); // View Mode
  const [infoTab, setInfoTab] = useState<'crm' | 'notes' | 'media'>('crm');
  const [mediaFilter, setMediaFilter] = useState<'images' | 'docs'>('images');

  const [aiPanelOpen, setAiPanelOpen] = useState(false); // AI Copilot
  
  // Chat States
  const [isTyping, setIsTyping] = useState(false);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageMenuOpenId, setMessageMenuOpenId] = useState<string | null>(null);
  
  // Call State
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  
  // Advanced Features States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [signatureEnabled, setSignatureEnabled] = useState(true); // Agent Signature
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  // Attachment State
  const [attachment, setAttachment] = useState<{ file?: File, preview?: string, type: MessageType, text?: string, location?: {lat: number, lng: number} } | null>(null);
  
  // Right Panel States (Notes & Follow Up)
  const [notes, setNotes] = useState<{id: string, text: string, date: string, author: string}[]>([
    { id: '1', text: 'Cliente interessado no plano Enterprise.', date: '20/12/2024 10:00', author: 'Você' }
  ]);
  const [newNote, setNewNote] = useState('');

  // AI State
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState(''); // Chat with AI
  const [aiChatHistory, setAiChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'Olá! Sou seu CEO Virtual. Analisei essa conversa e vejo uma oportunidade de upsell. Quer que eu escreva uma abordagem?' }
  ]);

  // Modals State
  const [activeModal, setActiveModal] = useState<'transfer' | 'export' | 'task' | 'schedule' | 'tags' | 'edit_contact' | 'forward' | 'quick_replies' | null>(null);
  const [transferData, setTransferData] = useState({ userId: '', sector: '' });
  
  // Edit Contact Form
  const [editContactForm, setEditContactForm] = useState<Partial<Contact>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<number | null>(null);

  // Initialize selected contact if provided in props or default
  useEffect(() => {
    // If we have a contact in "pending" or "open" set it active if list not empty
    if (!selectedContact && contacts.length > 0) {
       const initial = contacts.find(c => c.status === activeTab) || contacts[0];
       if (initial && initial.status === activeTab) setSelectedContact(initial);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
      loadQuickReplies();
      setAttachment(null);
      setMessageInput('');
      setIsTyping(false);
      setIsContactTyping(false);
      setHeaderMenuOpen(false);
      setAttachmentMenuOpen(false);
      setShowEmojiPicker(false);
      setEditContactForm(selectedContact);
      setAiInsights([]); // Reset AI
      setAiChatHistory([{ role: 'ai', content: 'Olá! Sou seu CEO Virtual. Analisei essa conversa e vejo uma oportunidade de upsell. Quer que eu escreva uma abordagem?' }]);
      setRightPanelView('info'); // Reset right panel
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, attachment, isContactTyping]);

  const loadMessages = async (contactId: string) => {
    const data = await api.chat.getMessages(contactId);
    setMessages(data);
  };

  const loadQuickReplies = async () => {
    const data = await api.chat.getQuickReplies();
    setQuickReplies(data);
  };

  // --- Call Handlers ---
  const handleStartCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setCallStatus('calling');
    // Simulate call connection
    setTimeout(() => {
        setCallStatus('connected');
    }, 2000);
  };

  const handleEndCall = () => {
    setCallStatus('idle');
  };

  // --- Message Actions ---
  const toggleStarMessage = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, starred: !msg.starred } : msg
    ));
    setMessageMenuOpenId(null);
  };

  // --- Workflow Actions (Status) ---

  const updateContactStatus = (contactId: string, newStatus: Contact['status']) => {
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, status: newStatus } : c));
    if (selectedContact && selectedContact.id === contactId) {
       setSelectedContact({ ...selectedContact, status: newStatus });
    }
    // Switch tab if needed or keep user flow smooth
    if (newStatus === 'open') setActiveTab('open');
    if (newStatus === 'resolved') setActiveTab('resolved');
  };

  const handleAcceptTicket = () => {
    if (!selectedContact) return;
    updateContactStatus(selectedContact.id, 'open');
  };

  const handleResolveTicket = () => {
    if (!selectedContact) return;
    if (confirm("Deseja realmente finalizar este atendimento?")) {
       updateContactStatus(selectedContact.id, 'resolved');
       
       // Add system message
       const systemMsg: Message = {
           id: Date.now().toString(),
           content: 'Atendimento finalizado pelo agente.',
           senderId: 'system',
           timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           type: MessageType.TEXT,
           status: 'read'
       };
       setMessages(prev => [...prev, systemMsg]);
    }
  };

  // --- Transfer Logic ---
  const handleTransferTicket = () => {
    if (!selectedContact) return;
    if (!transferData.sector && !transferData.userId) {
      alert("Selecione um setor ou usuário para transferir.");
      return;
    }

    const target = transferData.userId 
      ? MOCK_USERS.find(u => u.id === transferData.userId)?.name 
      : DEPARTMENTS.find(d => d.id === transferData.sector)?.name;

    if (confirm(`Confirmar transferência para: ${target}?`)) {
       // Simulate Transfer
       const systemMsg: Message = {
           id: Date.now().toString(),
           content: `Atendimento transferido para ${target}.`,
           senderId: 'system',
           timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           type: MessageType.TEXT,
           status: 'read'
       };
       setMessages(prev => [...prev, systemMsg]);
       alert("Transferência realizada com sucesso!");
       setActiveModal(null);
       setTransferData({ userId: '', sector: '' });
    }
  };

  // --- AI Copilot Logic ---
  const handleAnalyzeChat = async () => {
     if (!selectedContact) return;
     setAiLoading(true);
     setAiPanelOpen(true);
     // Simulate loading delay for better UX
     const insights = await api.ai.generateInsight('chat', { messages });
     setAiInsights(insights);
     setAiLoading(false);
  };

  const handleSendAiPrompt = () => {
    if (!aiMessage.trim()) return;

    // Add user message
    const userMsg = aiMessage;
    setAiChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiMessage('');

    // Simulate AI response
    setTimeout(() => {
      setAiChatHistory(prev => [...prev, { 
        role: 'ai', 
        content: `Entendi! Aqui está uma sugestão baseada em "${userMsg}": "Olá ${selectedContact?.name}, vi que você tem interesse em escalar. Nosso plano Enterprise oferece suporte dedicado que resolveria X e Y. Podemos agendar uma demo?"` 
      }]);
    }, 1000);
  };

  // --- Audio Recording Logic (Simulation) ---
  const toggleRecording = () => {
    if (isRecording) {
      // Stop & Send
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
      }
      setIsRecording(false);
      setRecordingTime(0);
      
      // Simulate sending audio
      const newMessage: Message = {
        id: Date.now().toString(),
        content: '',
        senderId: 'me',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: MessageType.AUDIO,
        status: 'sent',
        channel: 'whatsapp',
        mediaUrl: 'audio-mock-url.mp3'
      };
      setMessages(prev => [...prev, newMessage]);
      simulateReply();
      
    } else {
      // Start
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- Location Logic ---
  const handleSendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setAttachment({
          type: MessageType.LOCATION,
          text: 'Localização Atual',
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        });
        setAttachmentMenuOpen(false);
      }, (error) => {
        alert("Erro ao obter localização: " + error.message);
      });
    } else {
      alert("Geolocalização não suportada neste navegador.");
    }
  };

  // --- Attachment Handlers ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      
      let type = MessageType.DOCUMENT;
      if (file.type.startsWith('image/')) type = MessageType.IMAGE;
      if (file.type.startsWith('video/')) type = MessageType.VIDEO;
      if (file.type.startsWith('audio/')) type = MessageType.AUDIO;

      setAttachment({
        file,
        preview: objectUrl,
        type
      });
      setAttachmentMenuOpen(false);
    }
  };

  const clearAttachment = () => {
    if (attachment && attachment.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEmojiClick = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !attachment) || !selectedContact) return;
    
    setIsSending(true);
    setShowEmojiPicker(false);

    let contentToSend = messageInput;
    
    // Append Signature
    if (signatureEnabled && !attachment) {
      contentToSend += `\n\n~ Admin User`;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      content: contentToSend,
      senderId: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: attachment ? attachment.type : MessageType.TEXT,
      status: 'sent',
      channel: 'whatsapp',
      mediaUrl: attachment?.preview,
      fileName: attachment?.file?.name,
      location: attachment?.location
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');
    setAttachment(null); 
    if (fileInputRef.current) fileInputRef.current.value = '';

    await api.chat.sendMessage(selectedContact.id, contentToSend, newMessage.type);
    
    setIsSending(false);
    simulateReply();
  };

  const simulateReply = () => {
    setTimeout(() => {
       setMessages(prev => prev.map(m => m.status === 'sent' ? { ...m, status: 'delivered' } : m));
    }, 1000);

    setTimeout(() => {
       setMessages(prev => prev.map(m => m.status === 'delivered' ? { ...m, status: 'read' } : m));
       setIsContactTyping(true);
       
       setTimeout(() => {
          setIsContactTyping(false);
          const replyMessage: Message = {
            id: Date.now().toString(),
            content: "Recebido! Obrigado.",
            senderId: selectedContact!.id,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: MessageType.TEXT,
            status: 'read'
          };
          setMessages(prev => [...prev, replyMessage]);

          // Logic: If resolved, goes back to Pending or Open on customer reply
          if (selectedContact?.status === 'resolved') {
              updateContactStatus(selectedContact.id, 'pending');
          }

       }, 2000); 
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- Actions Implementations ---

  const handleBlockContact = () => {
    if (!selectedContact) return;
    const isBlocked = !selectedContact.blocked;
    
    // Optimistic Update
    const updatedContact = { ...selectedContact, blocked: isBlocked };
    setSelectedContact(updatedContact);
    setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
    
    setHeaderMenuOpen(false);
    alert(isBlocked ? "Contato bloqueado com sucesso." : "Contato desbloqueado.");
  };

  const handleOpenExportModal = () => {
    if (!selectedContact) return;
    setActiveModal('export');
    setHeaderMenuOpen(false);
  };

  const exportToCSV = () => {
    if (!selectedContact) return;
    const headers = "Data,Remetente,Mensagem\n";
    const rows = messages.map(m => `${m.timestamp},${m.senderId === 'me' ? 'Agente' : selectedContact.name},"${m.content.replace(/"/g, '""')}"`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `conversa_${selectedContact.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActiveModal(null);
  };

  const exportToPDF = () => {
    if (!selectedContact) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
        <html>
          <head>
            <title>Histórico - ${selectedContact.name}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111827; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
              .header h1 { font-size: 24px; margin: 0 0 10px 0; }
              .header p { margin: 5px 0; color: #6b7280; font-size: 14px; }
              .chat-container { display: flex; flex-direction: column; gap: 12px; }
              .message { padding: 12px 16px; border-radius: 8px; max-width: 80%; line-height: 1.5; font-size: 14px; page-break-inside: avoid; }
              .me { background-color: #f3f4f6; margin-left: auto; border: 1px solid #e5e7eb; }
              .contact { background-color: #fdf2f8; margin-right: auto; border: 1px solid #fce7f3; }
              .meta { font-size: 11px; color: #6b7280; margin-top: 6px; text-align: right; }
              .content { white-space: pre-wrap; }
              @media print {
                body { padding: 20px; }
              }
            </style>
          </head>
          <body>
            <div class="header">
               <h1>${selectedContact.name}</h1>
               <p>${selectedContact.phone} - ${selectedContact.company || 'N/A'}</p>
            </div>
            <div class="chat-container">
              ${messages.map(m => `
                <div class="message ${m.senderId === 'me' ? 'me' : 'contact'}">
                  <div class="content">${m.content || '[Mídia]'}</div>
                  <div class="meta">${m.timestamp}</div>
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
      setActiveModal(null);
    }
  };

  // --- Helper for Media ---
  const getMediaMessages = (type: 'images' | 'docs') => {
    return messages.filter(m => {
      if (type === 'images') return m.type === MessageType.IMAGE || m.type === MessageType.VIDEO;
      if (type === 'docs') return m.type === MessageType.DOCUMENT;
      return false;
    });
  };

  // --- Rendering UI ---

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* 1. Sidebar - Contact List */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50 h-full">
         <div className="p-4 bg-white border-b border-gray-100">
           <div className="relative mb-3">
              <input 
                type="text" 
                placeholder="Buscar conversa..." 
                className="w-full bg-gray-100 border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 transition-all"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
           </div>
           
           <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'open', label: 'Abertos' },
                { id: 'pending', label: 'Pendentes' },
                { id: 'resolved', label: 'Fechados' }
              ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   {tab.label}
                 </button>
              ))}
           </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar">
            {contacts.filter(c => c.status === activeTab).map(contact => (
               <div 
                 key={contact.id}
                 onClick={() => setSelectedContact(contact)}
                 className={`flex items-center p-3 cursor-pointer transition-colors border-b border-gray-100 hover:bg-gray-50 ${selectedContact?.id === contact.id ? 'bg-purple-50 border-l-4 border-l-purple-600' : 'border-l-4 border-l-transparent'}`}
               >
                  <div className="relative">
                     <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover" />
                     {contact.channel === 'whatsapp' && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white"><MessageSquare size={8} className="text-white" /></div>}
                  </div>
                  <div className="ml-3 flex-1 overflow-hidden">
                     <div className="flex justify-between items-baseline mb-0.5">
                        <span className={`text-sm font-semibold truncate ${selectedContact?.id === contact.id ? 'text-purple-800' : 'text-gray-900'}`}>{contact.name}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{contact.lastMessageTime}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500 truncate max-w-[140px]">{contact.lastMessage}</p>
                        {contact.unreadCount && contact.unreadCount > 0 && (
                           <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                             {contact.unreadCount}
                           </span>
                        )}
                     </div>
                     <div className="mt-1 flex gap-1">
                        {contact.tags.slice(0, 2).map(tag => (
                           <span key={tag} className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded">{tag}</span>
                        ))}
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* 2. Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#efeae2]">
         {selectedContact ? (
           <>
             {/* Chat Header */}
             <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10 shadow-sm">
                <div className="flex items-center cursor-pointer" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
                   <img src={selectedContact.avatar} alt="Profile" className="w-9 h-9 rounded-full object-cover" />
                   <div className="ml-3">
                      <h3 className="text-sm font-bold text-gray-900">{selectedContact.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center">
                         {selectedContact.company || 'Pessoa Física'} • <span className="text-green-600 ml-1">Online</span>
                      </p>
                   </div>
                </div>
                
                <div className="flex items-center space-x-2">
                   {/* Resolver Button (Outside Menu) */}
                   <button 
                      onClick={handleResolveTicket} 
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-green-100 hover:text-green-700 transition-colors flex items-center border border-gray-200"
                   >
                      <CheckSquare size={14} className="mr-1" /> Resolver
                   </button>
                   
                   <button 
                     onClick={handleAnalyzeChat}
                     className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors relative group"
                     title="AI Copilot"
                   >
                     <Sparkles size={18} />
                   </button>
                   
                   <div className="relative">
                      <button onClick={() => setHeaderMenuOpen(!headerMenuOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                         <MoreVertical size={20} />
                      </button>
                      
                      {headerMenuOpen && (
                         <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 animate-fadeIn overflow-hidden">
                            <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                               <User size={16} className="mr-2 text-gray-400" /> Dados do Contato
                            </button>
                            <button onClick={() => { setActiveModal('transfer'); setHeaderMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                               <ArrowRightLeft size={16} className="mr-2 text-gray-400" /> Transferir
                            </button>
                            <button onClick={handleOpenExportModal} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                               <Download size={16} className="mr-2 text-gray-400" /> Exportar Histórico
                            </button>
                            <div className="h-px bg-gray-100 my-1"></div>
                            <button onClick={handleBlockContact} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center font-medium">
                               <Ban size={16} className="mr-2" /> {selectedContact.blocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                         </div>
                      )}
                   </div>
                </div>
             </div>

             {/* Messages Area */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}>
                {messages.map((msg, idx) => (
                   <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'} group mb-2`}>
                      <div className={`max-w-[70%] relative shadow-sm rounded-lg px-3 py-2 text-sm ${
                         msg.senderId === 'me' 
                           ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' 
                           : 'bg-white text-gray-900 rounded-tl-none'
                      }`}>
                         {/* Reply Context (Example) */}
                         {idx === 2 && msg.senderId === 'me' && (
                            <div className="bg-black/5 rounded px-2 py-1 mb-2 border-l-4 border-purple-500 text-xs text-gray-600">
                               <p className="font-bold text-purple-700">Elisa Maria</p>
                               <p className="truncate">Poderia me informar media de valores?</p>
                            </div>
                         )}

                         {/* Content Types */}
                         {msg.type === MessageType.TEXT && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                         
                         {msg.type === MessageType.IMAGE && (
                            <div className="mb-1">
                               <img src={msg.mediaUrl || 'https://via.placeholder.com/300'} alt="Media" className="rounded-lg max-w-full h-auto" />
                               {msg.content && <p className="mt-2">{msg.content}</p>}
                            </div>
                         )}
                         
                         {msg.type === MessageType.AUDIO && (
                            <div className="flex items-center gap-2 min-w-[200px] py-1">
                               <button className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300">
                                  <PlayCircle size={18} fill="currentColor" />
                               </button>
                               <div className="flex-1 h-1 bg-gray-300 rounded overflow-hidden">
                                  <div className="h-full bg-gray-500 w-1/3"></div>
                               </div>
                               <span className="text-xs text-gray-500">0:45</span>
                            </div>
                         )}

                         {msg.type === MessageType.LOCATION && (
                            <div className="bg-gray-100 rounded p-1 mb-1">
                               <div className="w-full h-32 bg-gray-300 rounded flex items-center justify-center text-gray-500 mb-2">
                                  <MapPin size={24} />
                               </div>
                               <p className="text-xs font-bold text-center text-blue-600">Localização em Tempo Real</p>
                            </div>
                         )}

                         {/* Metadata */}
                         <div className="flex items-center justify-end space-x-1 mt-1">
                            {msg.starred && <Star size={10} className="fill-yellow-400 text-yellow-400 mr-1" />}
                            <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                            {msg.senderId === 'me' && (
                               msg.status === 'read' ? <CheckCheck size={14} className="text-[#53bdeb]" /> : <CheckCheck size={14} className="text-gray-400" />
                            )}
                         </div>
                         
                         {/* Context Menu Trigger */}
                         <button 
                           onClick={(e) => { e.stopPropagation(); setMessageMenuOpenId(messageMenuOpenId === msg.id ? null : msg.id); }}
                           className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-gray-100 rounded-full shadow transition-opacity"
                         >
                            <ChevronDown size={12} className="text-gray-500" />
                         </button>

                         {/* Message Context Menu */}
                         {messageMenuOpenId === msg.id && (
                            <div className="absolute top-6 right-2 bg-white rounded shadow-lg border border-gray-100 z-20 w-32 overflow-hidden py-1">
                               <button 
                                 onClick={() => toggleStarMessage(msg.id)} 
                                 className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                               >
                                  <Star size={12} className="mr-2" /> {msg.starred ? 'Desfavoritar' : 'Favoritar'}
                               </button>
                               <button className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center">
                                  <ArrowRightLeft size={12} className="mr-2" /> Responder
                               </button>
                               <button className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center">
                                  <Trash2 size={12} className="mr-2" /> Apagar
                               </button>
                            </div>
                         )}
                      </div>
                   </div>
                ))}
                
                {isContactTyping && (
                   <div className="flex justify-start animate-fadeIn">
                      <div className="bg-white px-4 py-3 rounded-xl rounded-tl-none shadow-sm flex items-center space-x-1">
                         <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                         <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                         <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                   </div>
                )}
                
                <div ref={messagesEndRef} />
             </div>

             {/* Footer / Input Area */}
             <div className="bg-[#f0f2f5] px-4 py-2 border-t border-gray-200" onClick={() => setMessageMenuOpenId(null)}>
                {/* ... (Existing Input Logic) */}
                {attachment && (
                   <div className="mb-2 p-2 bg-white rounded-lg shadow-sm flex items-center justify-between border-l-4 border-green-500 animate-slideUp">
                      <div className="flex items-center">
                         {attachment.type === MessageType.IMAGE ? (
                            <img src={attachment.preview} className="w-10 h-10 object-cover rounded mr-3" />
                         ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-3 text-gray-500">
                               <FileText size={20} />
                            </div>
                         )}
                         <div>
                            <p className="text-sm font-medium text-gray-800">{attachment.file?.name || 'Arquivo'}</p>
                            <p className="text-xs text-gray-500 uppercase">{attachment.type}</p>
                         </div>
                      </div>
                      <button onClick={clearAttachment} className="p-1 hover:bg-gray-100 rounded-full">
                         <X size={16} className="text-gray-500" />
                      </button>
                   </div>
                )}

                <div className="flex items-end gap-2">
                   {/* Attachments Menu */}
                   <div className="relative">
                      <button 
                        onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
                        className={`p-3 rounded-full transition-colors ${attachmentMenuOpen ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
                      >
                         <Plus size={24} />
                      </button>
                      
                      {attachmentMenuOpen && (
                         <div className="absolute bottom-14 left-0 mb-2 flex flex-col gap-2 animate-scaleIn origin-bottom-left z-20">
                            {[
                               { icon: <ImageIcon size={20} />, color: 'bg-purple-600', label: 'Fotos', onClick: () => fileInputRef.current?.click() },
                               { icon: <FileText size={20} />, color: 'bg-blue-600', label: 'Documento', onClick: () => fileInputRef.current?.click() },
                               { icon: <MapPin size={20} />, color: 'bg-red-500', label: 'Localização', onClick: handleSendLocation },
                               { icon: <Zap size={20} />, color: 'bg-yellow-500', label: 'Rápida', onClick: () => setShowQuickReplies(true) },
                            ].map((item, i) => (
                               <div key={i} className="flex items-center gap-2 group cursor-pointer" onClick={item.onClick}>
                                  <div className={`w-10 h-10 rounded-full ${item.color} text-white flex items-center justify-center shadow-lg hover:brightness-110 transition-all`}>
                                     {item.icon}
                                  </div>
                                  <span className="bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                     {item.label}
                                  </span>
                               </div>
                            ))}
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} multiple={false} />
                         </div>
                      )}
                   </div>

                   {/* Input Box */}
                   <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center px-2 py-1 relative">
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-400 hover:text-gray-600">
                         <Smile size={24} />
                      </button>
                      
                      {showEmojiPicker && (
                         <div className="absolute bottom-12 left-0 bg-white border border-gray-200 shadow-lg rounded-lg p-2 grid grid-cols-6 gap-2 z-20 w-64">
                            {COMMON_EMOJIS.map(e => (
                               <button key={e} onClick={() => handleEmojiClick(e)} className="text-xl hover:bg-gray-100 rounded p-1">{e}</button>
                            ))}
                         </div>
                      )}

                      <input 
                        type="text" 
                        placeholder={isRecording ? "Gravando áudio..." : "Digite uma mensagem..."}
                        className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 text-sm px-2 py-3 overflow-y-auto disabled:bg-transparent"
                        value={messageInput}
                        onChange={(e) => {
                           setMessageInput(e.target.value);
                           setIsTyping(true);
                           setTimeout(() => setIsTyping(false), 2000);
                        }}
                        onKeyDown={handleKeyPress}
                        disabled={isRecording}
                      />
                   </div>

                   {/* Send / Mic Button */}
                   {messageInput || attachment ? (
                      <button 
                        onClick={handleSendMessage}
                        disabled={isSending}
                        className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                      >
                         <Send size={20} />
                      </button>
                   ) : (
                      <button 
                        onClick={toggleRecording}
                        className={`p-3 rounded-full shadow-sm transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                      >
                         {isRecording ? <div className="flex items-center"><span className="mr-2 text-xs font-bold">{formatTime(recordingTime)}</span> <X size={20} /></div> : <Mic size={20} />}
                      </button>
                   )}
                </div>
                <div className="text-center mt-1">
                   <p className="text-[10px] text-gray-400 flex items-center justify-center">
                      <Lock size={8} className="mr-1" /> Protegido por criptografia de ponta-a-ponta
                   </p>
                </div>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-l border-gray-200">
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                 <MessageSquare size={64} className="text-gray-400" />
              </div>
              <h2 className="text-2xl font-light text-gray-600 mb-2">OmniConnect Web</h2>
              <p className="text-gray-400 text-sm max-w-md text-center">
                 Selecione um contato para iniciar o atendimento. Use o menu lateral para filtrar entre abertos, pendentes e resolvidos.
              </p>
              <div className="mt-8 flex items-center text-xs text-gray-400">
                 <Lock size={12} className="mr-1" /> Suas mensagens pessoais são protegidas.
              </div>
           </div>
         )}
      </div>

      {/* 3. Right Panel - Details & CRM & Starred */}
      {rightPanelOpen && selectedContact && (
         <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto animate-slideInRight flex flex-col">
            {/* ... Existing Right Panel Code ... */}
            <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50 flex-shrink-0">
               <button onClick={() => {
                  if (rightPanelView === 'starred') setRightPanelView('info');
                  else setRightPanelOpen(false);
               }} className="mr-3 text-gray-500 hover:text-gray-800">
                  {rightPanelView === 'starred' ? <ChevronLeft size={20} /> : <X size={20}/>}
               </button>
               <span className="font-semibold text-gray-700">
                  {rightPanelView === 'starred' ? 'Mensagens Favoritas' : 'Detalhes do Contato'}
               </span>
            </div>
            
            {rightPanelView === 'info' ? (
               <>
                  <div className="p-6 flex flex-col items-center border-b border-gray-100 flex-shrink-0">
                     <img src={selectedContact.avatar} className="w-24 h-24 rounded-full mb-3 object-cover border-4 border-gray-100" />
                     <h3 className="text-lg font-bold text-gray-900">{selectedContact.name}</h3>
                     <p className="text-gray-500 text-sm mb-4">{selectedContact.phone}</p>
                     
                     <div className="flex gap-4 w-full justify-center">
                        <div className="text-center">
                           <button 
                              onClick={() => handleStartCall('audio')}
                              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-purple-100 hover:text-purple-600 transition-colors mx-auto mb-1"
                           >
                              <PhoneCall size={18} />
                           </button>
                           <span className="text-[10px] text-gray-500">Ligar</span>
                        </div>
                        <div className="text-center">
                           <button 
                              onClick={() => handleStartCall('video')}
                              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-purple-100 hover:text-purple-600 transition-colors mx-auto mb-1"
                           >
                              <Video size={18} />
                           </button>
                           <span className="text-[10px] text-gray-500">Vídeo</span>
                        </div>
                        <div className="text-center">
                           <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-purple-100 hover:text-purple-600 transition-colors mx-auto mb-1">
                              <Search size={18} />
                           </button>
                           <span className="text-[10px] text-gray-500">Buscar</span>
                        </div>
                     </div>
                  </div>

                  <div className="border-b border-gray-100 flex-shrink-0">
                     <div className="flex">
                        <button 
                           onClick={() => setInfoTab('crm')} 
                           className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${infoTab === 'crm' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                           CRM
                        </button>
                        <button 
                           onClick={() => setInfoTab('notes')} 
                           className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${infoTab === 'notes' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                           Notas
                        </button>
                        <button 
                           onClick={() => setInfoTab('media')} 
                           className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${infoTab === 'media' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                           Mídia
                        </button>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {infoTab === 'crm' && (
                        <>
                           <div className="space-y-3">
                              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                 <p className="text-xs text-purple-800 font-bold uppercase mb-1">Oportunidade (Deal)</p>
                                 <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-800">R$ {selectedContact.pipelineValue?.toLocaleString() || '0,00'}</span>
                                    <span className="text-xs bg-white px-2 py-0.5 rounded text-purple-600 border border-purple-200">Em Negociação</span>
                                 </div>
                              </div>

                              <div>
                                 <label className="text-xs text-gray-500 font-bold uppercase">Empresa</label>
                                 <div className="flex items-center mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                    <Briefcase size={14} className="mr-2 text-gray-400" />
                                    {selectedContact.company || 'Não informado'}
                                 </div>
                              </div>

                              <div>
                                 <label className="text-xs text-gray-500 font-bold uppercase">Email</label>
                                 <div className="flex items-center mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                    <span className="truncate">{selectedContact.email || 'Não informado'}</span>
                                 </div>
                              </div>
                              
                              <div>
                                 <label className="text-xs text-gray-500 font-bold uppercase">Tags</label>
                                 <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedContact.tags.map(tag => (
                                       <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full flex items-center">
                                          <Tag size={10} className="mr-1" /> {tag}
                                       </span>
                                    ))}
                                    <button className="text-xs text-purple-600 hover:underline px-1">+ Add</button>
                                 </div>
                              </div>
                           </div>
                           
                           {/* Link to Favorites */}
                           <div className="mt-4 pt-4 border-t border-gray-100">
                              <button 
                                 onClick={() => setRightPanelView('starred')}
                                 className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                              >
                                 <span className="flex items-center"><Star size={16} className="mr-2 text-yellow-500" /> Mensagens Favoritas</span>
                                 <ChevronDown size={16} className="-rotate-90 text-gray-400" />
                              </button>
                           </div>
                        </>
                     )}

                     {infoTab === 'notes' && (
                        <div className="space-y-4">
                           <div>
                              <textarea 
                                className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                                rows={3}
                                placeholder="Adicionar nota interna..."
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                              />
                              <div className="flex justify-end mt-1">
                                 <button className="text-xs bg-gray-900 text-white px-3 py-1 rounded hover:bg-black">Salvar Nota</button>
                              </div>
                           </div>

                           <div className="space-y-3">
                              {notes.map(note => (
                                 <div key={note.id} className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 relative group">
                                    <p className="text-sm text-gray-800 leading-snug">{note.text}</p>
                                    <div className="flex justify-between items-center mt-2">
                                       <span className="text-[10px] text-gray-400">{note.date} • {note.author}</span>
                                       <button className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {infoTab === 'media' && (
                        <div className="h-full flex flex-col">
                           <div className="flex mb-3 border-b border-gray-100 pb-1">
                              <button 
                                 onClick={() => setMediaFilter('images')}
                                 className={`flex-1 text-xs font-medium pb-2 ${mediaFilter === 'images' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
                              >
                                 Mídia
                              </button>
                              <button 
                                 onClick={() => setMediaFilter('docs')}
                                 className={`flex-1 text-xs font-medium pb-2 ${mediaFilter === 'docs' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
                              >
                                 Docs
                              </button>
                           </div>
                           
                           <div className="flex-1 overflow-y-auto">
                              {mediaFilter === 'images' ? (
                                 <div className="grid grid-cols-3 gap-2">
                                    {getMediaMessages('images').map(m => (
                                       <div key={m.id} className="aspect-square bg-gray-100 rounded cursor-pointer overflow-hidden border border-gray-200">
                                          {m.type === MessageType.IMAGE ? (
                                             <img src={m.mediaUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                                          ) : (
                                             <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                                                <PlayCircle size={24} />
                                             </div>
                                          )}
                                       </div>
                                    ))}
                                    {getMediaMessages('images').length === 0 && <p className="col-span-3 text-center text-xs text-gray-400 py-4">Nenhuma imagem</p>}
                                 </div>
                              ) : (
                                 <div className="space-y-2">
                                    {getMediaMessages('docs').map(m => (
                                       <div key={m.id} className="flex items-center p-2 border border-gray-100 rounded bg-gray-50">
                                          <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-red-500 border border-gray-200 mr-2">
                                             <FileText size={16} />
                                          </div>
                                          <div className="overflow-hidden">
                                             <p className="text-xs font-medium truncate text-gray-700">{m.fileName || 'Documento'}</p>
                                             <p className="text-[10px] text-gray-400">{m.timestamp}</p>
                                          </div>
                                       </div>
                                    ))}
                                    {getMediaMessages('docs').length === 0 && <p className="text-center text-xs text-gray-400 py-4">Nenhum documento</p>}
                                 </div>
                              )}
                           </div>
                        </div>
                     )}
                  </div>
               </>
            ) : (
               /* Starred View */
               <div className="flex-1 overflow-y-auto bg-gray-50 p-3 space-y-3">
                  {messages.filter(m => m.starred).map(msg => (
                     <div key={msg.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 text-sm relative">
                        <div className="flex justify-between items-start mb-1">
                           <span className="font-bold text-xs text-purple-700">{msg.senderId === 'me' ? 'Você' : selectedContact.name}</span>
                           <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                        </div>
                        <p className="text-gray-700 mb-2">{msg.content || (msg.type !== 'TEXT' ? `[${msg.type}]` : '')}</p>
                        <div className="flex justify-end">
                           <button onClick={() => toggleStarMessage(msg.id)} className="text-xs text-gray-400 hover:text-yellow-500">
                              <Star size={14} className="fill-yellow-400 text-yellow-400" />
                           </button>
                        </div>
                     </div>
                  ))}
                  {messages.filter(m => m.starred).length === 0 && (
                     <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <Star size={32} className="mb-2 opacity-20" />
                        <p className="text-xs">Nenhuma mensagem favorita.</p>
                     </div>
                  )}
               </div>
            )}
         </div>
      )}

      {/* AI Panel */}
      {aiPanelOpen && (
        <div className="fixed right-4 bottom-20 w-80 bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden z-30 animate-scaleIn origin-bottom-right">
           <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center">
                 <Bot size={20} className="mr-2" />
                 <span className="font-bold">AI Copilot</span>
              </div>
              <button onClick={() => setAiPanelOpen(false)} className="text-white/80 hover:text-white"><X size={18} /></button>
           </div>
           
           <div className="h-80 overflow-y-auto p-4 bg-gray-50 space-y-3">
              {aiLoading ? (
                 <div className="flex flex-col items-center justify-center h-full text-purple-600">
                    <Loader2 size={32} className="animate-spin mb-2" />
                    <span className="text-xs font-medium">Analisando conversa...</span>
                 </div>
              ) : (
                 <>
                    {aiInsights.map((insight, i) => (
                       <div key={i} className={`p-3 rounded-lg border text-sm ${
                          insight.type === 'risk' ? 'bg-red-50 border-red-100 text-red-800' :
                          insight.type === 'suggestion' ? 'bg-blue-50 border-blue-100 text-blue-800' :
                          'bg-white border-gray-200 text-gray-700'
                       }`}>
                          <div className="flex items-start mb-1">
                             {insight.type === 'risk' && <Ban size={14} className="mr-1 mt-0.5" />}
                             {insight.type === 'suggestion' && <Lightbulb size={14} className="mr-1 mt-0.5" />}
                             <span className="font-bold text-xs uppercase">{insight.type}</span>
                          </div>
                          {insight.content}
                       </div>
                    ))}
                    
                    {/* Chat with AI History */}
                    {aiChatHistory.map((msg, i) => (
                       <div key={i} className={`text-sm p-3 rounded-lg ${msg.role === 'ai' ? 'bg-white border border-gray-200 text-gray-700' : 'bg-purple-100 text-purple-900 ml-8'}`}>
                          {msg.content}
                       </div>
                    ))}
                 </>
              )}
           </div>

           <div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
              <input 
                type="text" 
                className="flex-1 bg-gray-100 border-none rounded-full px-3 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                placeholder="Peça ajuda à IA..."
                value={aiMessage}
                onChange={e => setAiMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendAiPrompt()}
              />
              <button onClick={handleSendAiPrompt} className="p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700">
                 <ArrowRightLeft size={14} />
              </button>
           </div>
        </div>
      )}

      {/* Quick Replies Modal */}
      <Modal isOpen={showQuickReplies} onClose={() => setShowQuickReplies(false)} title="Respostas Rápidas">
         <div className="space-y-2">
            {quickReplies.map(qr => (
               <button 
                 key={qr.id}
                 onClick={() => {
                    setMessageInput(prev => prev + qr.content);
                    setShowQuickReplies(false);
                 }}
                 className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200 group"
               >
                  <div className="flex justify-between">
                     <span className="font-bold text-gray-800 text-sm">{qr.shortcut}</span>
                     <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">Usar</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{qr.content}</p>
               </button>
            ))}
            <button className="w-full py-2 border border-dashed border-gray-300 rounded text-gray-500 text-sm hover:bg-gray-50 mt-2">
               + Criar nova resposta
            </button>
         </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={activeModal === 'transfer'} onClose={() => setActiveModal(null)} title="Transferir Atendimento">
         <div className="space-y-4">
            <p className="text-sm text-gray-600">Selecione o setor ou o usuário para transferir este atendimento.</p>
            
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Setor / Departamento</label>
               <select 
                 className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white"
                 value={transferData.sector}
                 onChange={(e) => setTransferData({ ...transferData, sector: e.target.value, userId: '' })}
               >
                  <option value="">Selecione um setor...</option>
                  {DEPARTMENTS.map(dept => (
                     <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
               </select>
            </div>

            <div className="relative">
               <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-300"></div>
               </div>
               <div className="relative flex justify-center">
                  <span className="px-2 bg-white text-xs text-gray-500">OU</span>
               </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Usuário / Agente</label>
               <select 
                 className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white"
                 value={transferData.userId}
                 onChange={(e) => setTransferData({ ...transferData, userId: e.target.value, sector: '' })}
               >
                  <option value="">Selecione um usuário...</option>
                  {MOCK_USERS.map(user => (
                     <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                  ))}
               </select>
            </div>

            <div className="flex justify-end pt-2">
               <button 
                 onClick={handleTransferTicket}
                 className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 flex items-center"
               >
                  <ArrowRightLeft size={16} className="mr-2" /> Transferir Agora
               </button>
            </div>
         </div>
      </Modal>

      {/* Export Modal */}
      <Modal isOpen={activeModal === 'export'} onClose={() => setActiveModal(null)} title="Exportar Histórico">
         <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">Escolha o formato desejado para exportar a conversa completa com <strong>{selectedContact?.name}</strong>.</p>
            
            <div className="grid grid-cols-2 gap-4">
               <button 
                 onClick={exportToPDF}
                 className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
               >
                  <FileText size={40} className="text-gray-400 group-hover:text-purple-600 mb-2" />
                  <span className="font-bold text-gray-700 group-hover:text-purple-700">PDF</span>
                  <span className="text-xs text-gray-500 mt-1">Para impressão</span>
               </button>

               <button 
                 onClick={exportToCSV}
                 className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
               >
                  <FileSpreadsheet size={40} className="text-gray-400 group-hover:text-green-600 mb-2" />
                  <span className="font-bold text-gray-700 group-hover:text-green-700">CSV / Excel</span>
                  <span className="text-xs text-gray-500 mt-1">Para análise de dados</span>
               </button>
            </div>
         </div>
      </Modal>

      {/* Call Overlay Modal */}
      {callStatus !== 'idle' && selectedContact && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="flex flex-col items-center text-white">
               <div className="w-32 h-32 rounded-full border-4 border-white/20 p-1 mb-6 relative">
                  <img src={selectedContact.avatar} className="w-full h-full rounded-full object-cover" />
                  <div className="absolute inset-0 rounded-full animate-ping border-2 border-white/50"></div>
               </div>
               <h2 className="text-2xl font-bold mb-2">{selectedContact.name}</h2>
               <p className="text-white/60 mb-8 animate-pulse">
                  {callStatus === 'calling' ? 'Chamando...' : 'Conectado - 00:12'}
               </p>
               
               <div className="flex gap-6">
                  {callType === 'video' && (
                     <button className="p-4 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur">
                        <Video size={24} />
                     </button>
                  )}
                  <button className="p-4 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur">
                     <Mic size={24} />
                  </button>
                  <button 
                     onClick={handleEndCall}
                     className="p-4 rounded-full bg-red-500 hover:bg-red-600 shadow-lg transform hover:scale-110 transition-all"
                  >
                     <PhoneCall size={24} className="rotate-[135deg]" />
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default Chat;