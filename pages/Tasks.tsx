
import React, { useState, useEffect, useRef } from 'react';
import { 
  Inbox, Calendar, CalendarDays, Hash, Flag, Plus, 
  CheckCircle2, Circle, MoreHorizontal, FileText, 
  Download, RefreshCw, ChevronRight, ChevronDown, 
  Trash2, X, Search, Filter, Eye, EyeOff, Edit, Save,
  Clock, Upload, Users, AlertCircle, CornerDownRight, Tag as TagIcon,
  Check, Maximize2, LayoutGrid, List as ListIcon, Share2, MessageSquare, MoreHorizontal as MoreDots
} from 'lucide-react';
import { MOCK_USERS } from '../constants';
import { Task, TaskPriority } from '../types';
import { api } from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

// --- Interfaces Locais ---

interface Project {
  id: string;
  name: string;
  color: string;
}

// --- Dados Mockados ---

const MOCK_PROJECTS: Project[] = [
  { id: 'esc_informatica', name: 'Esc Informática', color: 'text-red-500' },
  { id: 'marketing', name: 'Marketing', color: 'text-orange-500' },
  { id: 'financeiro', name: 'Financeiro', color: 'text-green-500' }
];

// Seções simuladas para o modo Board (baseadas na imagem)
const BOARD_SECTIONS = [
  { id: 'pop', title: "P.O.P.'s (Procedimento Operacional)", tagTrigger: 'POP' },
  { id: 'experience', title: "EXPERIÊNCIA DO CLIENTE", tagTrigger: 'Experiência' },
  { id: 'contracts', title: "Contratos e Renovações", tagTrigger: 'Contratos' },
  { id: 'ideas', title: "Ideias", tagTrigger: 'Ideias' },
  { id: 'backlog', title: "A Fazer (Sem Seção)", tagTrigger: null } // Fallback
];

// --- Helpers de UI ---

const PriorityFlag: React.FC<{ p: TaskPriority }> = ({ p }) => {
  const colors = {
    p1: 'text-red-600 fill-red-100',
    p2: 'text-orange-500 fill-orange-50',
    p3: 'text-blue-500 fill-blue-50',
    p4: 'text-gray-400'
  };
  return <Flag size={14} className={colors[p]} />;
};

const UserAvatar: React.FC<{ userId?: string }> = ({ userId }) => {
  if (!userId) return null;
  const user = MOCK_USERS.find(u => u.id === userId);
  if (!user) return null;
  
  return (
    <div className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[8px] font-bold text-gray-700 shadow-sm overflow-hidden" title={user.name}>
      {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0)}
    </div>
  );
};

// --- Componente Principal ---

const Tasks: React.FC = () => {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('esc_informatica'); // Default to main project
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [loading, setLoading] = useState(false);
  
  // Quick Add State
  const [quickAddValue, setQuickAddValue] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState<{columnId?: string, visible: boolean}>({ visible: false });
  
  // Modals & Edits
  const [activeModal, setActiveModal] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
  const [tagInput, setTagInput] = useState(''); 

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const data = await api.tasks.list();
    setTasks(data);
    setLoading(false);
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = !task.completed;
    
    // Optimistic
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: newStatus } : t));
    await api.tasks.update(taskId, { completed: newStatus });
    
    if (newStatus) addToast('Tarefa concluída', 'success');
  };

  const handleQuickAdd = async (columnId?: string) => {
    if (!quickAddValue.trim()) return;

    // Determina tags baseada na coluna (seção)
    const section = BOARD_SECTIONS.find(s => s.id === columnId);
    const tags = section && section.tagTrigger ? [section.tagTrigger] : [];

    const newTaskData: Partial<Task> = {
      title: quickAddValue,
      projectId: activeFilter,
      priority: 'p4',
      tags: tags,
      subtasks: []
    };

    const tempTask = { ...newTaskData, id: Date.now().toString(), completed: false } as Task;
    setTasks([...tasks, tempTask]);
    setQuickAddValue('');
    setShowQuickAdd({ visible: false });

    await api.tasks.create(newTaskData);
    loadTasks();
  };

  // --- Renderização de Seções (Board) ---
  const getTasksForSection = (section: typeof BOARD_SECTIONS[0]) => {
    return tasks.filter(t => {
      // Se a task está completada, geralmente não mostramos no board principal ou mostramos no final
      if (t.completed) return false; 

      if (section.tagTrigger) {
        return t.tags?.some(tag => tag.toLowerCase().includes(section.tagTrigger!.toLowerCase()));
      }
      // Backlog: Tasks sem tags das outras seções
      const otherTags = BOARD_SECTIONS.filter(s => s.tagTrigger).map(s => s.tagTrigger!.toLowerCase());
      const hasOtherTag = t.tags?.some(tag => otherTags.some(ot => tag.toLowerCase().includes(ot)));
      return !hasOtherTag;
    });
  };

  const openEditModal = (task: Task) => {
    setCurrentTask(task);
    setActiveModal(true);
  };

  const handleSaveTask = async () => {
    if (!currentTask.title) return;
    if (currentTask.id) {
       const updated = await api.tasks.update(currentTask.id, currentTask);
       setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    } else {
       const created = await api.tasks.create(currentTask);
       setTasks(prev => [...prev, created]);
    }
    setActiveModal(false);
    setCurrentTask({});
  };

  const handleDeleteTask = async () => {
    if (currentTask.id) {
      if (confirm('Excluir esta tarefa?')) {
        await api.tasks.delete(currentTask.id);
        setTasks(prev => prev.filter(t => t.id !== currentTask.id));
        setActiveModal(false);
      }
    }
  };

  return (
    <div className="flex h-full bg-[#1e1e1e] text-gray-200 overflow-hidden font-sans">
      {/* 1. Sidebar (Todoist Style - Dark Theme for contrast) */}
      <aside className="w-64 bg-[#1e1e1e] border-r border-[#333] flex-col pt-4 hidden md:flex">
        <div className="px-4 mb-4">
           <div className="flex items-center gap-2 mb-6 cursor-pointer hover:bg-[#2a2a2a] p-2 rounded transition-colors">
              <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">E</div>
              <div className="flex-1">
                 <p className="text-sm font-bold text-gray-200">Elton</p>
                 <p className="text-xs text-gray-500">Online</p>
              </div>
              <ChevronDown size={14} className="text-gray-500" />
           </div>

           <button 
             onClick={() => { setShowQuickAdd({ visible: true }); }}
             className="w-full flex items-center gap-2 text-[#de4c4a] hover:bg-[#2a2a2a] p-2 rounded transition-colors font-semibold text-sm mb-4"
           >
             <div className="w-6 h-6 rounded-full bg-[#de4c4a] flex items-center justify-center text-white"><Plus size={16} /></div>
             Adicionar tarefa
           </button>

           <div className="space-y-1">
              <div className="flex items-center gap-3 p-2 hover:bg-[#2a2a2a] rounded cursor-pointer text-gray-300">
                 <Search size={18} /> <span className="text-sm">Buscar</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-[#2a2a2a] rounded cursor-pointer text-gray-300">
                 <Inbox size={18} /> <span className="text-sm">Entrada</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-[#2a2a2a] rounded cursor-pointer text-gray-300">
                 <div className="flex items-center gap-3"><CalendarDays size={18} /> <span className="text-sm">Hoje</span></div>
                 <span className="text-xs text-gray-500">{tasks.filter(t => t.dueDate?.startsWith(new Date().toISOString().slice(0,10))).length || ''}</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-[#2a2a2a] rounded cursor-pointer text-gray-300">
                 <Calendar size={18} /> <span className="text-sm">Em breve</span>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-[#2a2a2a] rounded cursor-pointer text-gray-300">
                 <LayoutGrid size={18} /> <span className="text-sm">Filtros e Etiquetas</span>
              </div>
           </div>
        </div>

        <div className="mt-4 px-4">
           <div className="flex justify-between items-center text-gray-500 mb-2 hover:text-gray-300 cursor-pointer">
              <span className="text-xs font-bold uppercase">Favoritos</span>
              <Plus size={14} />
           </div>
           <div className="space-y-1">
              {['Suporte', 'DOCUMENTAÇÃO', 'ESC ESTRUTURA'].map(fav => (
                 <div key={fav} className="flex items-center justify-between p-1.5 hover:bg-[#2a2a2a] rounded cursor-pointer group">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                       <span className="text-gray-500 text-xs">#</span> {fav}
                    </div>
                    <span className="text-xs text-gray-600 group-hover:text-gray-400">{Math.floor(Math.random() * 200)}</span>
                 </div>
              ))}
           </div>
        </div>

        <div className="mt-6 px-4 flex-1">
           <div className="flex justify-between items-center text-gray-500 mb-2 hover:text-gray-300 cursor-pointer">
              <span className="text-xs font-bold uppercase">Meus Projetos</span>
              <Plus size={14} />
           </div>
           <div className="space-y-1">
              {MOCK_PROJECTS.map(proj => (
                 <div 
                   key={proj.id} 
                   onClick={() => setActiveFilter(proj.id)}
                   className={`flex items-center justify-between p-1.5 rounded cursor-pointer group ${activeFilter === proj.id ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}
                 >
                    <div className="flex items-center gap-2 text-sm">
                       <span className={`${proj.color}`}>#</span> {proj.name}
                    </div>
                    {activeFilter === proj.id && <MoreHorizontal size={14} className="text-gray-500" />}
                 </div>
              ))}
           </div>
        </div>
      </aside>

      {/* 2. Main Board Content */}
      <main className="flex-1 flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
         {/* Header */}
         <header className="h-16 border-b border-[#333] flex items-center justify-between px-6 bg-[#1e1e1e]">
            <div className="flex flex-col">
               <div className="flex items-center text-xs text-gray-500 mb-1">
                  <span>Meus projetos</span> <ChevronRight size={12} className="mx-1"/>
               </div>
               <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white">Esc Informática</h1>
                  <span className="text-2xl">🎯</span>
               </div>
            </div>

            <div className="flex items-center gap-3">
               <button className="flex items-center gap-1 text-gray-400 hover:text-white px-3 py-1.5 hover:bg-[#2a2a2a] rounded transition-colors text-sm">
                  <Users size={16} /> Compartilhar
               </button>
               <button 
                 onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
                 className="flex items-center gap-1 text-gray-400 hover:text-white px-3 py-1.5 hover:bg-[#2a2a2a] rounded transition-colors text-sm"
               >
                  {viewMode === 'board' ? <ListIcon size={16} /> : <LayoutGrid size={16} />} 
                  {viewMode === 'board' ? 'Visualizar' : 'Board'}
               </button>
               <button className="text-gray-400 hover:text-white p-2 hover:bg-[#2a2a2a] rounded"><MoreHorizontal size={18}/></button>
            </div>
         </header>

         {/* Board Area */}
         <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            {viewMode === 'board' ? (
               <div className="flex h-full space-x-6">
                  {BOARD_SECTIONS.map(section => {
                     const sectionTasks = getTasksForSection(section);
                     return (
                        <div key={section.id} className="w-80 flex flex-col h-full">
                           {/* Section Header */}
                           <div className="flex items-center justify-between mb-3 px-1 group">
                              <div className="flex items-center gap-2">
                                 <h3 className="font-bold text-sm text-gray-300">{section.title}</h3>
                                 <span className="text-xs text-gray-600">{sectionTasks.length}</span>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="text-gray-500 hover:text-white"><Plus size={16}/></button>
                                 <button className="text-gray-500 hover:text-white"><MoreHorizontal size={16}/></button>
                              </div>
                           </div>

                           {/* Tasks Container */}
                           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pb-10">
                              {sectionTasks.map(task => (
                                 <div 
                                   key={task.id} 
                                   onClick={() => openEditModal(task)}
                                   className="bg-[#2a2a2a] rounded-lg p-3 group border border-transparent hover:border-gray-600 shadow-sm cursor-pointer relative"
                                 >
                                    <div className="flex items-start gap-3">
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task.id); }}
                                         className={`mt-0.5 w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center hover:bg-gray-600 transition-colors group/check`}
                                       >
                                          <Check size={12} className="opacity-0 group-hover/check:opacity-100 text-white" />
                                       </button>
                                       <div className="flex-1">
                                          <p className="text-sm text-gray-200 leading-snug">{task.title}</p>
                                          
                                          {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>}
                                          
                                          <div className="flex items-center gap-3 mt-2">
                                             {task.dueDate && (
                                                <div className="flex items-center text-[11px] text-gray-400 group-hover:text-red-400 transition-colors">
                                                   <Calendar size={12} className="mr-1" />
                                                   {new Date(task.dueDate).toLocaleDateString('pt-BR', {day: 'numeric', month: 'short'})}
                                                </div>
                                             )}
                                             {task.subtasks && task.subtasks.length > 0 && (
                                                <div className="flex items-center text-[11px] text-gray-500">
                                                   <CornerDownRight size={12} className="mr-1" />
                                                   {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                                                </div>
                                             )}
                                             {task.tags && task.tags.length > 0 && (
                                                <div className="flex gap-1">
                                                   {task.tags.map(t => (
                                                      <span key={t} className="text-[9px] text-gray-500 bg-[#333] px-1 rounded">{t}</span>
                                                   ))}
                                                </div>
                                             )}
                                             <div className="ml-auto">
                                                <UserAvatar userId={task.assigneeId} />
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              ))}

                              {/* Add Task Button (Bottom of column) */}
                              {showQuickAdd.columnId === section.id && showQuickAdd.visible ? (
                                 <div className="bg-[#2a2a2a] p-3 rounded-lg border border-gray-600 animate-fadeIn">
                                    <input 
                                      autoFocus
                                      type="text" 
                                      className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 mb-2"
                                      placeholder="Escreva o nome da tarefa"
                                      value={quickAddValue}
                                      onChange={e => setQuickAddValue(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleQuickAdd(section.id)}
                                    />
                                    <div className="flex justify-between items-center">
                                       <div className="flex gap-2">
                                          <button className="p-1 rounded border border-gray-600 text-gray-400 text-xs px-2 hover:bg-[#333]">📅 Data</button>
                                          <button className="p-1 rounded border border-gray-600 text-gray-400 text-xs px-2 hover:bg-[#333]">👤 Prioridade</button>
                                       </div>
                                       <div className="flex gap-2">
                                          <button onClick={() => setShowQuickAdd({visible: false})} className="px-3 py-1.5 text-xs text-gray-400 font-bold hover:bg-[#333] rounded">Cancelar</button>
                                          <button onClick={() => handleQuickAdd(section.id)} className="px-3 py-1.5 text-xs bg-[#de4c4a] text-white font-bold rounded hover:bg-[#c53b39]">Adicionar</button>
                                       </div>
                                    </div>
                                 </div>
                              ) : (
                                 <button 
                                   onClick={() => setShowQuickAdd({columnId: section.id, visible: true})}
                                   className="flex items-center text-gray-500 hover:text-[#de4c4a] text-sm group py-1"
                                 >
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center mr-2 text-[#de4c4a] group-hover:bg-[#de4c4a] group-hover:text-white transition-colors">
                                       <Plus size={14} />
                                    </div>
                                    Adicionar tarefa
                                 </button>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>
            ) : (
               <div className="max-w-3xl mx-auto space-y-1">
                  {tasks.filter(t => !t.completed).map(task => (
                     <div key={task.id} className="flex items-start py-3 border-b border-[#333] group hover:bg-[#2a2a2a] px-2 rounded -mx-2 cursor-pointer" onClick={() => openEditModal(task)}>
                        <button 
                           onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task.id); }}
                           className="mt-1 mr-3 w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center hover:bg-gray-600"
                        >
                           <Check size={12} className="opacity-0 group-hover:opacity-50 text-white" />
                        </button>
                        <div className="flex-1">
                           <p className="text-sm text-gray-200">{task.title}</p>
                           <p className="text-xs text-gray-500">{task.description}</p>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </main>

      {/* Edit Modal (Light Theme inside for standard form usage) */}
      <Modal isOpen={activeModal} onClose={() => setActiveModal(false)} title="Detalhes da Tarefa">
         <div className="space-y-4">
            <input 
               type="text" 
               className="w-full text-lg font-bold border-none focus:ring-0 p-0 text-gray-800 placeholder-gray-400"
               placeholder="Nome da Tarefa"
               value={currentTask.title || ''}
               onChange={e => setCurrentTask({...currentTask, title: e.target.value})}
            />
            <textarea 
               className="w-full text-sm text-gray-600 border-none focus:ring-0 p-0 resize-none h-20 placeholder-gray-400"
               placeholder="Descrição..."
               value={currentTask.description || ''}
               onChange={e => setCurrentTask({...currentTask, description: e.target.value})}
            />
            <div className="flex gap-4 border-t pt-4 border-gray-100">
               <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Data de Vencimento</label>
                  <input type="date" className="w-full border rounded p-2 text-sm bg-white" value={currentTask.dueDate?.slice(0,10) || ''} onChange={e => setCurrentTask({...currentTask, dueDate: e.target.value})} />
               </div>
               <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prioridade</label>
                  <select className="w-full border rounded p-2 text-sm bg-white" value={currentTask.priority} onChange={e => setCurrentTask({...currentTask, priority: e.target.value as any})}>
                     <option value="p1">Alta 🔴</option>
                     <option value="p2">Média 🟠</option>
                     <option value="p3">Baixa 🔵</option>
                     <option value="p4">Normal ⚪</option>
                  </select>
               </div>
            </div>
            
            {/* Tags Edit */}
            <div>
               <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Etiquetas</label>
               <div className="flex flex-wrap gap-2 mb-2">
                  {currentTask.tags?.map(t => (
                     <span key={t} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs flex items-center">
                        {t} <button onClick={() => setCurrentTask({...currentTask, tags: currentTask.tags?.filter(tag => tag !== t)})} className="ml-1 hover:text-red-500"><X size={10}/></button>
                     </span>
                  ))}
               </div>
               <input 
                  type="text" 
                  placeholder="+ Adicionar etiqueta" 
                  className="text-xs border border-dashed border-gray-300 rounded p-1"
                  onKeyDown={e => { if(e.key === 'Enter') { const val = e.currentTarget.value; if(val) setCurrentTask({...currentTask, tags: [...(currentTask.tags||[]), val]}); e.currentTarget.value = ''; } }}
               />
            </div>

            <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-100">
               <button onClick={handleDeleteTask} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={18}/></button>
               <div className="flex gap-2">
                  <button onClick={() => setActiveModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded text-sm font-bold">Cancelar</button>
                  <button onClick={handleSaveTask} className="px-4 py-2 bg-[#de4c4a] text-white rounded text-sm font-bold hover:bg-[#c53b39]">Salvar</button>
               </div>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default Tasks;
