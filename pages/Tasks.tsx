
import React, { useState, useEffect, useRef } from 'react';
import { 
  Inbox, Calendar, CalendarDays, Hash, Flag, Plus, 
  CheckCircle2, Circle, MoreHorizontal, FileText, 
  Download, RefreshCw, ChevronRight, ChevronDown, 
  Trash2, X, Search, Filter, Eye, EyeOff, Edit, Save,
  Clock, Upload, Users, AlertCircle, CornerDownRight, Tag as TagIcon,
  Check, Maximize2, LayoutGrid, List as ListIcon, Share2, MessageSquare, MoreHorizontal as MoreDots,
  Sun, Moon, FolderPlus, GripVertical
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

interface Section {
  id: string;
  projectId: string;
  title: string;
  order: number;
}

// --- Componente Principal ---

const Tasks: React.FC = () => {
  const { addToast } = useToast();
  
  // --- Estados de Dados ---
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Projetos (Inicializa com Inbox padrão + Projetos salvos)
  const [projects, setProjects] = useState<Project[]>(() => {
      const saved = localStorage.getItem('tasks_projects');
      return saved ? JSON.parse(saved) : [
          { id: 'inbox', name: 'Entrada', color: 'text-gray-500' }
      ];
  });

  // Seções do Board (Inicializa com salvos ou vazios)
  const [sections, setSections] = useState<Section[]>(() => {
      const saved = localStorage.getItem('tasks_sections');
      return saved ? JSON.parse(saved) : [];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>('inbox');
  
  // --- Estados de UI ---
  const [isDark, setIsDark] = useState(true); // Default Dark como pedido, mas alterável
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [loading, setLoading] = useState(false);
  
  // Quick Add State
  const [quickAddValue, setQuickAddValue] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState<{sectionId?: string, visible: boolean}>({ visible: false });
  
  // Project/Section Creation State
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Modals & Edits
  const [activeModal, setActiveModal] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({});

  // --- Effects ---

  useEffect(() => {
    loadTasks();
  }, []);

  // Persistência local para Projetos e Seções (Simulação de Backend para essas entidades)
  useEffect(() => {
      localStorage.setItem('tasks_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
      localStorage.setItem('tasks_sections', JSON.stringify(sections));
  }, [sections]);

  const loadTasks = async () => {
    setLoading(true);
    const data = await api.tasks.list();
    setTasks(data);
    setLoading(false);
  };

  // --- Helpers de Cores (Tema Dinâmico) ---
  const theme = {
      bg: isDark ? 'bg-[#1e1e1e]' : 'bg-gray-50',
      sidebar: isDark ? 'bg-[#1e1e1e] border-[#333]' : 'bg-gray-100 border-gray-200',
      text: isDark ? 'text-gray-200' : 'text-gray-800',
      textSec: isDark ? 'text-gray-500' : 'text-gray-500',
      hover: isDark ? 'hover:bg-[#2a2a2a]' : 'hover:bg-white',
      input: isDark ? 'bg-transparent text-white placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200',
      card: isDark ? 'bg-[#2a2a2a] border-transparent hover:border-gray-600' : 'bg-white border-gray-200 hover:border-purple-300 shadow-sm',
      header: isDark ? 'bg-[#1e1e1e] border-[#333]' : 'bg-white border-gray-200',
      modal: isDark ? 'bg-[#2a2a2a] text-white' : 'bg-white text-gray-900'
  };

  // --- Lógica de Negócio ---

  const handleAddProject = () => {
      if (!newProjectName.trim()) return;
      const newProj: Project = {
          id: `proj_${Date.now()}`,
          name: newProjectName,
          color: 'text-purple-500'
      };
      setProjects([...projects, newProj]);
      setNewProjectName('');
      setIsCreatingProject(false);
      setActiveProjectId(newProj.id);
      addToast('Projeto criado!', 'success');
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (id === 'inbox') return; // Cannot delete inbox
      if (confirm('Excluir projeto e suas tarefas?')) {
          setProjects(prev => prev.filter(p => p.id !== id));
          if (activeProjectId === id) setActiveProjectId('inbox');
          // Clean up sections
          setSections(prev => prev.filter(s => s.projectId !== id));
      }
  };

  const handleAddSection = () => {
      if (!newSectionName.trim()) return;
      const newSec: Section = {
          id: `sec_${Date.now()}`,
          projectId: activeProjectId,
          title: newSectionName,
          order: sections.filter(s => s.projectId === activeProjectId).length
      };
      setSections([...sections, newSec]);
      setNewSectionName('');
      setIsCreatingSection(false);
  };

  const handleDeleteSection = (id: string) => {
      if (confirm('Excluir seção?')) {
          setSections(prev => prev.filter(s => s.id !== id));
      }
  };

  const handleQuickAdd = async (sectionId?: string) => {
    if (!quickAddValue.trim()) return;

    const newTaskData: Partial<Task> = {
      title: quickAddValue,
      projectId: activeProjectId,
      priority: 'p4',
      // Store section info in tags for persistence simulation since API creates generic Tasks
      tags: sectionId ? [`section:${sectionId}`] : [], 
      subtasks: []
    };

    // Optimistic UI
    const tempTask = { ...newTaskData, id: Date.now().toString(), completed: false } as Task;
    setTasks([...tasks, tempTask]);
    
    setQuickAddValue('');
    setShowQuickAdd({ visible: false });

    try {
        const created = await api.tasks.create(newTaskData);
        // Replace temp task with real one
        setTasks(prev => prev.map(t => t.id === tempTask.id ? created : t));
    } catch (e) {
        addToast('Erro ao salvar tarefa', 'error');
    }
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

  const getTasksForSection = (sectionId: string) => {
      return tasks.filter(t => {
          if (t.projectId !== activeProjectId) return false;
          if (t.completed) return false;
          
          // Check if task belongs to this section via tag hack
          const sectionTag = t.tags?.find(tag => tag.startsWith('section:'));
          if (sectionTag) {
              return sectionTag === `section:${sectionId}`;
          }
          return false; // If it has a section tag but not this one
      });
  };

  const getBacklogTasks = () => {
      // Tasks in this project that have NO section tag
      return tasks.filter(t => {
          if (t.projectId !== activeProjectId) return false;
          if (t.completed) return false;
          const hasSection = t.tags?.some(tag => tag.startsWith('section:'));
          return !hasSection;
      });
  };

  // --- Render Helpers ---

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

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const activeSections = sections.filter(s => s.projectId === activeProjectId).sort((a,b) => a.order - b.order);

  return (
    <div className={`flex h-full ${theme.bg} ${theme.text} overflow-hidden font-sans transition-colors duration-300`}>
      
      {/* 1. Sidebar */}
      <aside className={`w-64 border-r flex-col pt-4 hidden md:flex ${theme.sidebar}`}>
        <div className="px-4 mb-4">
           {/* Header User/Toggle */}
           <div className={`flex items-center justify-between mb-6 p-2 rounded ${theme.hover} transition-colors`}>
              <div className="flex items-center gap-2 cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">E</div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${theme.text}`}>Elton</p>
                    <p className="text-xs text-gray-500">Online</p>
                  </div>
              </div>
              <button onClick={() => setIsDark(!isDark)} className={`p-1.5 rounded-full ${isDark ? 'bg-gray-800 text-yellow-400' : 'bg-gray-200 text-gray-600'}`}>
                  {isDark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
           </div>

           <button 
             onClick={() => { setShowQuickAdd({ visible: true }); }}
             className={`w-full flex items-center gap-2 ${isDark ? 'text-[#de4c4a]' : 'text-purple-600'} ${theme.hover} p-2 rounded transition-colors font-semibold text-sm mb-4`}
           >
             <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-[#de4c4a]' : 'bg-purple-600'} flex items-center justify-center text-white`}><Plus size={16} /></div>
             Adicionar tarefa
           </button>

           <div className="space-y-1">
              <div className={`flex items-center gap-3 p-2 ${theme.hover} rounded cursor-pointer ${theme.textSec}`}>
                 <Inbox size={18} /> <span className="text-sm">Entrada</span>
              </div>
              <div className={`flex items-center justify-between p-2 ${theme.hover} rounded cursor-pointer ${theme.textSec}`}>
                 <div className="flex items-center gap-3"><CalendarDays size={18} /> <span className="text-sm">Hoje</span></div>
                 <span className="text-xs opacity-60">{tasks.filter(t => t.dueDate?.startsWith(new Date().toISOString().slice(0,10))).length || ''}</span>
              </div>
              <div className={`flex items-center gap-3 p-2 ${theme.hover} rounded cursor-pointer ${theme.textSec}`}>
                 <Calendar size={18} /> <span className="text-sm">Em breve</span>
              </div>
           </div>
        </div>

        <div className="mt-6 px-4 flex-1 overflow-y-auto">
           <div className="flex justify-between items-center text-gray-500 mb-2 group cursor-pointer" onClick={() => setIsCreatingProject(true)}>
              <span className="text-xs font-bold uppercase hover:text-gray-400">Meus Projetos</span>
              <Plus size={14} className="opacity-0 group-hover:opacity-100" />
           </div>
           
           {isCreatingProject && (
               <div className="mb-2 px-1 animate-fadeIn">
                   <input 
                     autoFocus
                     type="text" 
                     className={`w-full text-sm p-1.5 rounded border ${isDark ? 'bg-[#333] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                     placeholder="Nome do projeto..."
                     value={newProjectName}
                     onChange={e => setNewProjectName(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleAddProject()}
                     onBlur={() => setIsCreatingProject(false)}
                   />
               </div>
           )}

           <div className="space-y-1">
              {projects.map(proj => (
                 <div 
                   key={proj.id} 
                   onClick={() => setActiveProjectId(proj.id)}
                   className={`flex items-center justify-between p-1.5 rounded cursor-pointer group ${activeProjectId === proj.id ? (isDark ? 'bg-[#2a2a2a] text-white' : 'bg-purple-50 text-purple-700 font-medium') : `${theme.textSec} ${theme.hover}`}`}
                 >
                    <div className="flex items-center gap-2 text-sm truncate">
                       <span className={`${proj.color}`}>#</span> {proj.name}
                    </div>
                    {proj.id !== 'inbox' && activeProjectId === proj.id && (
                        <button onClick={(e) => handleDeleteProject(e, proj.id)} className="text-gray-500 hover:text-red-500">
                            <Trash2 size={12} />
                        </button>
                    )}
                 </div>
              ))}
           </div>
        </div>
      </aside>

      {/* 2. Main Content */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden ${theme.bg}`}>
         {/* Header */}
         <header className={`h-16 border-b flex items-center justify-between px-6 ${theme.header}`}>
            <div className="flex flex-col">
               <div className="flex items-center text-xs text-gray-500 mb-1">
                  <span>Projetos</span> <ChevronRight size={12} className="mx-1"/>
               </div>
               <div className="flex items-center gap-2">
                  <h1 className={`text-xl font-bold ${theme.text}`}>{activeProject.name}</h1>
               </div>
            </div>

            <div className="flex items-center gap-3">
               <button className={`flex items-center gap-1 text-gray-400 ${isDark ? 'hover:text-white' : 'hover:text-gray-900'} px-3 py-1.5 ${theme.hover} rounded transition-colors text-sm`}>
                  <Users size={16} /> Compartilhar
               </button>
               <button 
                 onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
                 className={`flex items-center gap-1 text-gray-400 ${isDark ? 'hover:text-white' : 'hover:text-gray-900'} px-3 py-1.5 ${theme.hover} rounded transition-colors text-sm`}
               >
                  {viewMode === 'board' ? <ListIcon size={16} /> : <LayoutGrid size={16} />} 
                  {viewMode === 'board' ? 'Visualizar' : 'Board'}
               </button>
            </div>
         </header>

         {/* Board Area */}
         <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            {viewMode === 'board' ? (
               <div className="flex h-full space-x-6 items-start">
                  
                  {/* Render Dynamic Sections */}
                  {activeSections.map(section => {
                     const sectionTasks = getTasksForSection(section.id);
                     return (
                        <div key={section.id} className="w-80 flex flex-col h-full max-h-full">
                           {/* Section Header */}
                           <div className="flex items-center justify-between mb-3 px-1 group flex-shrink-0">
                              <div className="flex items-center gap-2">
                                 <h3 className={`font-bold text-sm ${theme.text}`}>{section.title}</h3>
                                 <span className="text-xs text-gray-500">{sectionTasks.length}</span>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => setShowQuickAdd({sectionId: section.id, visible: true})} className="text-gray-500 hover:text-gray-300"><Plus size={16}/></button>
                                 <button onClick={() => handleDeleteSection(section.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16}/></button>
                              </div>
                           </div>

                           {/* Tasks Container */}
                           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pb-10 min-h-0">
                              {sectionTasks.map(task => (
                                 <div 
                                   key={task.id} 
                                   onClick={() => { setCurrentTask(task); setActiveModal(true); }}
                                   className={`${theme.card} border rounded-lg p-3 group cursor-pointer relative transition-colors`}
                                 >
                                    <div className="flex items-start gap-3">
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task.id); }}
                                         className={`mt-0.5 w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center hover:bg-gray-600 transition-colors group/check`}
                                       >
                                          <Check size={12} className={`opacity-0 group-hover/check:opacity-100 ${isDark ? 'text-white' : 'text-gray-600'}`} />
                                       </button>
                                       <div className="flex-1">
                                          <p className={`text-sm ${theme.text} leading-snug`}>{task.title}</p>
                                          <div className="flex items-center gap-3 mt-2">
                                             {task.dueDate && (
                                                <div className="flex items-center text-[11px] text-gray-400 group-hover:text-red-400 transition-colors">
                                                   <Calendar size={12} className="mr-1" />
                                                   {new Date(task.dueDate).toLocaleDateString('pt-BR', {day: 'numeric', month: 'short'})}
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

                              {/* Add Task Input (Inside Column) */}
                              {showQuickAdd.sectionId === section.id && showQuickAdd.visible ? (
                                 <div className={`${isDark ? 'bg-[#2a2a2a]' : 'bg-white'} p-3 rounded-lg border ${isDark ? 'border-gray-600' : 'border-purple-200 shadow-md'} animate-fadeIn`}>
                                    <input 
                                      autoFocus
                                      type="text" 
                                      className={`w-full border-none text-sm focus:ring-0 mb-2 ${theme.input}`}
                                      placeholder="Nome da tarefa..."
                                      value={quickAddValue}
                                      onChange={e => setQuickAddValue(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleQuickAdd(section.id)}
                                    />
                                    <div className="flex justify-end gap-2">
                                       <button onClick={() => setShowQuickAdd({visible: false})} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                                       <button onClick={() => handleQuickAdd(section.id)} className={`px-3 py-1.5 text-xs font-bold rounded ${isDark ? 'bg-[#de4c4a] hover:bg-[#c53b39]' : 'bg-purple-600 hover:bg-purple-700'} text-white`}>Adicionar</button>
                                    </div>
                                 </div>
                              ) : (
                                 <button 
                                   onClick={() => setShowQuickAdd({sectionId: section.id, visible: true})}
                                   className={`flex items-center text-gray-500 hover:${isDark ? 'text-[#de4c4a]' : 'text-purple-600'} text-sm group py-1 w-full`}
                                 >
                                    <Plus size={14} className="mr-2"/> Adicionar tarefa
                                 </button>
                              )}
                           </div>
                        </div>
                     );
                  })}

                  {/* Generic "Backlog" or "No Section" Column */}
                  <div className="w-80 flex flex-col h-full max-h-full opacity-80">
                      <div className="flex items-center justify-between mb-3 px-1">
                          <h3 className={`font-bold text-sm ${theme.text}`}>Sem Seção</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pb-10 min-h-0">
                          {getBacklogTasks().map(task => (
                              <div key={task.id} className={`${theme.card} border rounded-lg p-3 cursor-pointer`} onClick={() => { setCurrentTask(task); setActiveModal(true); }}>
                                  <p className={`text-sm ${theme.text}`}>{task.title}</p>
                              </div>
                          ))}
                          <button onClick={() => setShowQuickAdd({sectionId: undefined, visible: true})} className="flex items-center text-gray-500 text-sm py-1 w-full hover:underline"><Plus size={14} className="mr-2"/> Adicionar aqui</button>
                          
                          {/* Global Quick Add for Backlog */}
                          {showQuickAdd.visible && !showQuickAdd.sectionId && (
                             <div className={`mt-2 ${isDark ? 'bg-[#2a2a2a]' : 'bg-white'} p-3 rounded border animate-fadeIn`}>
                                <input 
                                  autoFocus 
                                  className={`w-full text-sm ${theme.input}`} 
                                  placeholder="Tarefa..." 
                                  value={quickAddValue} 
                                  onChange={e => setQuickAddValue(e.target.value)} 
                                  onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} 
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                   <button onClick={() => setShowQuickAdd({visible: false})} className="text-xs text-gray-500">Cancelar</button>
                                   <button onClick={() => handleQuickAdd()} className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Add</button>
                                </div>
                             </div>
                          )}
                      </div>
                  </div>

                  {/* Add Section Button */}
                  <div className="w-80 flex-shrink-0">
                      {isCreatingSection ? (
                          <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-white'} border border-gray-300`}>
                              <input 
                                autoFocus
                                type="text" 
                                className={`w-full mb-2 p-1.5 text-sm rounded ${isDark ? 'bg-[#333] text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-200'}`}
                                placeholder="Nome da seção"
                                value={newSectionName}
                                onChange={e => setNewSectionName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddSection()}
                              />
                              <div className="flex justify-end gap-2">
                                  <button onClick={() => setIsCreatingSection(false)} className="text-xs text-gray-500">Cancelar</button>
                                  <button onClick={handleAddSection} className={`text-xs px-3 py-1.5 rounded text-white ${isDark ? 'bg-[#de4c4a]' : 'bg-purple-600'}`}>Adicionar Seção</button>
                              </div>
                          </div>
                      ) : (
                          <button 
                            onClick={() => setIsCreatingSection(true)}
                            className={`flex items-center gap-2 w-full p-2 rounded-lg transition-colors text-sm font-medium ${isDark ? 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                          >
                              <Plus size={18} /> Adicionar Seção
                          </button>
                      )}
                  </div>

               </div>
            ) : (
               <div className="max-w-3xl mx-auto space-y-1">
                  {/* List View Implementation */}
                  <h2 className={`font-bold mb-4 ${theme.text}`}>Tarefas do Projeto</h2>
                  {tasks.filter(t => t.projectId === activeProjectId && !t.completed).map(task => (
                     <div key={task.id} className={`flex items-start py-3 border-b ${isDark ? 'border-[#333]' : 'border-gray-100'} group ${theme.hover} px-2 rounded -mx-2 cursor-pointer`} onClick={() => { setCurrentTask(task); setActiveModal(true); }}>
                        <button 
                           onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task.id); }}
                           className={`mt-1 mr-3 w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center hover:bg-gray-600`}
                        >
                           <Check size={12} className={`opacity-0 group-hover:opacity-50 ${isDark ? 'text-white' : 'text-gray-600'}`} />
                        </button>
                        <div className="flex-1">
                           <p className={`text-sm ${theme.text}`}>{task.title}</p>
                           {task.description && <p className="text-xs text-gray-500">{task.description}</p>}
                        </div>
                     </div>
                  ))}
                  <button onClick={() => setShowQuickAdd({visible: true})} className="flex items-center gap-2 text-gray-500 mt-4 hover:text-purple-600">
                      <Plus size={16} /> Adicionar tarefa
                  </button>
               </div>
            )}
         </div>
      </main>

      {/* Edit Modal (Adapts to Theme) */}
      <Modal isOpen={activeModal} onClose={() => setActiveModal(false)} title="Detalhes da Tarefa">
         <div className={`space-y-4 ${isDark ? '' : 'text-gray-800'}`}>
            <input 
               type="text" 
               className="w-full text-lg font-bold border-none focus:ring-0 p-0 placeholder-gray-400 bg-transparent outline-none"
               placeholder="Nome da Tarefa"
               value={currentTask.title || ''}
               onChange={e => setCurrentTask({...currentTask, title: e.target.value})}
            />
            <textarea 
               className="w-full text-sm text-gray-500 border-none focus:ring-0 p-0 resize-none h-20 placeholder-gray-400 bg-transparent outline-none"
               placeholder="Descrição..."
               value={currentTask.description || ''}
               onChange={e => setCurrentTask({...currentTask, description: e.target.value})}
            />
            
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200/20">
               <button onClick={() => setActiveModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100/10 rounded">Fechar</button>
               <button className={`px-4 py-2 text-sm text-white rounded ${isDark ? 'bg-[#de4c4a]' : 'bg-purple-600'}`}>Salvar</button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default Tasks;
