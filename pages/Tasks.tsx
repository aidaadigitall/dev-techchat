
import React, { useState, useEffect, useRef } from 'react';
import { 
  Inbox, Calendar, CalendarDays, Hash, Flag, Plus, 
  CheckCircle2, Circle, MoreHorizontal, FileText, 
  Download, RefreshCw, ChevronRight, ChevronDown, 
  Trash2, X, Search, Filter, Eye, EyeOff, Edit, Save,
  Clock, Upload, Users, AlertCircle, CornerDownRight, Tag as TagIcon,
  Check, Maximize2, LayoutGrid, List as ListIcon, Share2, MessageSquare,
  Sun, Moon, FolderPlus, GripVertical, GripHorizontal, Sparkles, BrainCircuit, BarChart3,
  CalendarRange, Repeat, Bell, BellRing
} from 'lucide-react';
import { MOCK_USERS } from '../constants';
import { Task, TaskPriority, TaskRecurrence } from '../types';
import { api } from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

// --- Interfaces ---

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

// --- Sound Effect ---
const completionSound = new Audio('https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3'); // Sound "Pop/Check"

// --- Componente Principal ---

const Tasks: React.FC = () => {
  const { addToast } = useToast();
  
  // --- Estados de Dados ---
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Projetos
  const [projects, setProjects] = useState<Project[]>(() => {
      const saved = localStorage.getItem('tasks_projects');
      return saved ? JSON.parse(saved) : [
          { id: 'inbox', name: 'Entrada', color: 'text-gray-500' },
          { id: 'marketing', name: 'Marketing', color: 'text-red-500' },
          { id: 'financeiro', name: 'Financeiro', color: 'text-green-500' }
      ];
  });

  // Seções
  const [sections, setSections] = useState<Section[]>(() => {
      const saved = localStorage.getItem('tasks_sections');
      return saved ? JSON.parse(saved) : [
          { id: 'sec_1', projectId: 'marketing', title: 'A Fazer', order: 0 },
          { id: 'sec_2', projectId: 'marketing', title: 'Em Andamento', order: 1 }
      ];
  });

  // Estado de Navegação
  const [activeView, setActiveView] = useState<string>('inbox'); // 'inbox', 'today', 'upcoming', or projectID
  
  // --- Estados de UI ---
  const [isDark, setIsDark] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [loading, setLoading] = useState(false);
  
  // Filtros Avançados
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');

  // Inputs e Edição
  const [quickAddValue, setQuickAddValue] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState<{sectionId?: string, visible: boolean}>({ visible: false });
  
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');

  // Drag & Drop
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // Modals & IA
  const [activeModal, setActiveModal] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  // Menu Contexto Tarefa
  const [taskMenuOpenId, setTaskMenuOpenId] = useState<string | null>(null);

  // --- Effects ---

  useEffect(() => {
    // Detect System Theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDark(true);
    }
    loadTasks();
  }, []);

  // Check Overdue Tasks on Load
  useEffect(() => {
      const today = new Date().toISOString().split('T')[0];
      const overdueCount = tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed).length;
      if (overdueCount > 0) {
          addToast(`Você tem ${overdueCount} tarefas atrasadas!`, 'warning');
      }
  }, [tasks]);

  useEffect(() => { localStorage.setItem('tasks_projects', JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem('tasks_sections', JSON.stringify(sections)); }, [sections]);

  const loadTasks = async () => {
    setLoading(true);
    const data = await api.tasks.list();
    setTasks(data);
    setLoading(false);
  };

  // --- Helpers de Tema ---
  const theme = {
      bg: isDark ? 'bg-[#1e1e1e]' : 'bg-[#fafafa]',
      sidebar: isDark ? 'bg-[#252526] border-[#333]' : 'bg-[#f7f7f7] border-gray-200',
      text: isDark ? 'text-gray-200' : 'text-gray-800',
      textSec: isDark ? 'text-gray-400' : 'text-gray-500',
      hover: isDark ? 'hover:bg-[#2a2d2e]' : 'hover:bg-white hover:shadow-sm',
      activeItem: isDark ? 'bg-[#37373d] text-white' : 'bg-white text-gray-900 shadow-sm',
      input: isDark ? 'bg-[#2a2a2a] text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300',
      card: isDark ? 'bg-[#252526] border-[#333] hover:border-[#444]' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm',
      header: isDark ? 'bg-[#1e1e1e] border-[#333]' : 'bg-white border-gray-200',
      modal: isDark ? 'bg-[#252526] text-white' : 'bg-white text-gray-900',
      select: isDark ? 'bg-[#2a2a2a] border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'
  };

  // --- Lógica de Filtros ---

  const getFilteredTasks = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();
      const todayStr = today.toISOString().split('T')[0];
      
      // 1. Filtragem Base por Contexto (Sidebar)
      let filtered = tasks.filter(t => !t.completed);

      if (activeView === 'inbox') {
          filtered = filtered.filter(t => t.projectId === 'inbox');
      } else if (activeView === 'today') {
          filtered = filtered.filter(t => t.dueDate && t.dueDate.startsWith(todayStr));
      } else if (activeView === 'upcoming') {
          filtered = filtered.filter(t => t.dueDate && t.dueDate > todayStr);
      } else {
          // Project View
          filtered = filtered.filter(t => t.projectId === activeView);
      }

      // 2. Filtragem por Prioridade (Barra Superior)
      if (filterPriority !== 'all') {
          filtered = filtered.filter(t => t.priority === filterPriority);
      }

      // 3. Filtragem por Data (Barra Superior)
      if (filterDate !== 'all') {
          filtered = filtered.filter(t => {
              if (!t.dueDate) return false;
              const taskDate = new Date(t.dueDate);
              taskDate.setHours(0, 0, 0, 0); // Normalizar para meia-noite
              const taskTime = taskDate.getTime();
              
              // Diferença em dias
              const diffTime = taskTime - todayTime;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

              switch (filterDate) {
                  case 'overdue':
                      return taskTime < todayTime;
                  case 'today':
                      return taskTime === todayTime;
                  case '7':
                      return diffDays >= 0 && diffDays <= 7;
                  case '15':
                      return diffDays >= 0 && diffDays <= 15;
                  case '30':
                      return diffDays >= 0 && diffDays <= 30;
                  case '90': // 3 meses
                      return diffDays >= 0 && diffDays <= 90;
                  case '180': // 6 meses
                      return diffDays >= 0 && diffDays <= 180;
                  case '365': // 1 ano
                      return diffDays >= 0 && diffDays <= 365;
                  default:
                      return true;
              }
          });
      }

      return filtered;
  };

  const getSectionsForView = () => {
      // Inbox, Today, Upcoming don't have user-defined sections usually, 
      // but for consistency we can show a "Main" section or just list.
      if (['inbox', 'today', 'upcoming'].includes(activeView)) {
          return []; // Will trigger List View or Default Board
      }
      return sections.filter(s => s.projectId === activeView).sort((a,b) => a.order - b.order);
  };

  const currentProjectName = () => {
      if (activeView === 'inbox') return 'Entrada';
      if (activeView === 'today') return 'Hoje';
      if (activeView === 'upcoming') return 'Em Breve';
      return projects.find(p => p.id === activeView)?.name || 'Projeto';
  };

  // --- Drag and Drop Logic (HTML5 Native) ---

  const handleDragStartTask = (e: React.DragEvent, taskId: string) => {
      e.stopPropagation(); // IMPORTANTE: Impede que o evento suba para a seção
      setDraggedTask(taskId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
  };

  const handleDropTask = async (e: React.DragEvent, targetSectionId?: string) => {
      e.preventDefault();
      if (!draggedTask) return;

      // Optimistic Update
      setTasks(prev => prev.map(t => {
          if (t.id === draggedTask) {
              // Remove old section tags
              const cleanTags = t.tags?.filter(tag => !tag.startsWith('section:')) || [];
              if (targetSectionId) {
                  cleanTags.push(`section:${targetSectionId}`);
              }
              return { ...t, tags: cleanTags };
          }
          return t;
      }));

      setDraggedTask(null);
      // In a real backend, you'd call api.tasks.update(draggedTask, { sectionId: targetSectionId })
  };

  const handleDragStartSection = (e: React.DragEvent, sectionId: string) => {
      // Only set dragged section if not already dragging a task
      if (!draggedTask) {
          setDraggedSection(sectionId);
          e.dataTransfer.effectAllowed = "move";
      }
  };

  const handleDropSection = (e: React.DragEvent, targetSectionId: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      // If dropping a task, handle as task drop
      if (draggedTask) {
          handleDropTask(e, targetSectionId);
          return;
      }

      if (!draggedSection || draggedSection === targetSectionId) return;

      const items = [...sections.filter(s => s.projectId === activeView)];
      const draggedIdx = items.findIndex(s => s.id === draggedSection);
      const targetIdx = items.findIndex(s => s.id === targetSectionId);

      const [reorderedItem] = items.splice(draggedIdx, 1);
      items.splice(targetIdx, 0, reorderedItem);

      // Update orders based on new index
      const updatedSections = items.map((s, idx) => ({ ...s, order: idx }));
      
      // Merge with other project sections
      const otherSections = sections.filter(s => s.projectId !== activeView);
      setSections([...otherSections, ...updatedSections]);
      setDraggedSection(null);
  };

  // --- CRUD Operations ---

  const handleAddProject = () => {
      if (!newProjectName.trim()) return;
      const newProj: Project = { id: `proj_${Date.now()}`, name: newProjectName, color: 'text-purple-500' };
      setProjects([...projects, newProj]);
      setNewProjectName('');
      setIsCreatingProject(false);
      setActiveView(newProj.id);
      addToast('Projeto criado!', 'success');
  };

  const handleRenameProject = (id: string) => {
      if (!editProjectName.trim()) return;
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: editProjectName } : p));
      setEditingProjectId(null);
  };

  const handleRenameSection = (id: string) => {
      if (!editSectionName.trim()) return;
      setSections(prev => prev.map(s => s.id === id ? { ...s, title: editSectionName } : s));
      setEditingSectionId(null);
  };

  const handleAddSection = () => {
      const newSec: Section = {
          id: `sec_${Date.now()}`,
          projectId: activeView,
          title: 'Nova Seção',
          order: sections.filter(s => s.projectId === activeView).length
      };
      setSections([...sections, newSec]);
      setEditingSectionId(newSec.id);
      setEditSectionName('Nova Seção');
  };

  const handleQuickAdd = async (sectionId?: string) => {
    if (!quickAddValue.trim()) return;
    const newTaskData: Partial<Task> = {
      title: quickAddValue,
      projectId: activeView === 'today' || activeView === 'upcoming' ? 'inbox' : activeView,
      priority: 'p4',
      tags: sectionId ? [`section:${sectionId}`] : [],
      dueDate: activeView === 'today' ? new Date().toISOString().split('T')[0] : undefined
    };

    const tempTask = { ...newTaskData, id: Date.now().toString(), completed: false } as Task;
    setTasks([...tasks, tempTask]);
    setQuickAddValue('');
    setShowQuickAdd({ visible: false });

    try {
        await api.tasks.create(newTaskData);
    } catch (e) {
        addToast('Erro ao salvar tarefa', 'error');
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = !task.completed;
    
    // Play Sound
    if (newStatus) {
        try {
            completionSound.currentTime = 0;
            completionSound.play();
        } catch(e) {}
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: newStatus } : t));
    await api.tasks.update(taskId, { completed: newStatus });
    if (newStatus) addToast('Tarefa concluída', 'success');
  };

  const moveTaskToProject = async (taskId: string, targetProjectId: string) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, projectId: targetProjectId, tags: [] } : t)); // Clear section tags when moving project
      await api.tasks.update(taskId, { projectId: targetProjectId, tags: [] });
      setTaskMenuOpenId(null);
      addToast('Tarefa movida de projeto', 'success');
  };

  // --- AI Analyst Logic ---
  const handleRunAI = () => {
      setShowAIModal(true);
      setAiLoading(true);
      
      // Simulate AI Analysis
      setTimeout(() => {
          const pendingCount = tasks.filter(t => !t.completed).length;
          const highPriority = tasks.filter(t => !t.completed && t.priority === 'p1').length;
          const completedCount = tasks.filter(t => t.completed).length;
          
          const advice = `
### 🤖 Análise de Produtividade

**Resumo Atual:**
- Você tem **${pendingCount} tarefas pendentes**.
- **${highPriority}** delas são de alta prioridade (P1).
- Você já completou **${completedCount}** tarefas. Ótimo trabalho!

**Sugestões Estratégicas:**
1. **Foco no Essencial:** Tente resolver as ${highPriority > 0 ? highPriority : 'tarefas principais'} antes do almoço.
2. **Regra dos 2 Minutos:** Se você tem tarefas rápidas na "Entrada", faça agora para limpar a mente.
3. **Organização:** Notei que algumas tarefas estão sem data. Agende-as para não perder prazos.

*Continue focado! Estou aqui para ajudar a organizar seu fluxo.*
          `;
          setAiAnalysis(advice);
          setAiLoading(false);
      }, 2000);
  };

  // --- Render Helpers ---
  const activeSections = getSectionsForView();
  const showBoard = viewMode === 'board' && !['inbox', 'today', 'upcoming'].includes(activeView);
  const finalFilteredTasks = getFilteredTasks();

  return (
    <div className={`flex h-full ${theme.bg} ${theme.text} overflow-hidden font-sans transition-colors duration-300`}>
      
      {/* 1. Sidebar */}
      <aside className={`w-64 border-r flex-col pt-4 hidden md:flex ${theme.sidebar}`}>
        <div className="px-4 mb-4">
           {/* Header User/Toggle */}
           <div className={`flex items-center justify-between mb-6 p-2 rounded-lg ${theme.hover} transition-colors cursor-pointer`}>
              <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">E</div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${theme.text}`}>Elton</p>
                    <p className="text-xs opacity-60">Produtividade Máxima</p>
                  </div>
              </div>
              <button onClick={() => setIsDark(!isDark)} className={`p-1.5 rounded-full transition-colors ${isDark ? 'bg-gray-800 text-yellow-400' : 'bg-gray-200 text-gray-600'}`}>
                  {isDark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
           </div>

           <button 
             onClick={() => { setShowQuickAdd({ visible: true }); }}
             className={`w-full flex items-center gap-2 bg-[#de4c4a] hover:bg-[#c53b39] text-white p-2 rounded-lg transition-all shadow-md font-semibold text-sm mb-6 active:scale-95`}
           >
             <div className="bg-white/20 rounded-full p-0.5"><Plus size={16} /></div>
             Adicionar tarefa
           </button>

           <div className="space-y-1">
              {[
                  { id: 'inbox', label: 'Entrada', icon: Inbox, color: 'text-blue-500' },
                  { id: 'today', label: 'Hoje', icon: CalendarDays, color: 'text-green-500' },
                  { id: 'upcoming', label: 'Em Breve', icon: Calendar, color: 'text-purple-500' }
              ].map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${activeView === item.id ? theme.activeItem : `${theme.textSec} ${theme.hover}`}`}
                  >
                     <div className="flex items-center gap-3">
                        <item.icon size={18} className={item.color} /> <span className="text-sm font-medium">{item.label}</span>
                     </div>
                     <span className="text-xs opacity-60 font-mono">
                         {item.id === 'inbox' ? tasks.filter(t => t.projectId === 'inbox' && !t.completed).length : ''}
                         {item.id === 'today' ? tasks.filter(t => t.dueDate?.startsWith(new Date().toISOString().slice(0,10)) && !t.completed).length : ''}
                     </span>
                  </div>
              ))}
           </div>
        </div>

        <div className="mt-4 px-4 flex-1 overflow-y-auto">
           <div className="flex justify-between items-center text-gray-500 mb-2 group cursor-pointer" onClick={() => setIsCreatingProject(true)}>
              <span className="text-xs font-bold uppercase tracking-wider hover:text-gray-700">Meus Projetos</span>
              <Plus size={14} className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded" />
           </div>
           
           {isCreatingProject && (
               <div className="mb-2 animate-fadeIn">
                   <input 
                     autoFocus
                     type="text" 
                     className={`w-full text-sm p-1.5 rounded border outline-none focus:ring-2 focus:ring-purple-500 ${theme.input}`}
                     placeholder="Nome do projeto..."
                     value={newProjectName}
                     onChange={e => setNewProjectName(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleAddProject()}
                     onBlur={() => setIsCreatingProject(false)}
                   />
               </div>
           )}

           <div className="space-y-0.5">
              {projects.filter(p => p.id !== 'inbox').map(proj => (
                 <div 
                   key={proj.id} 
                   className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${activeView === proj.id ? theme.activeItem : `${theme.textSec} ${theme.hover}`}`}
                   onClick={() => setActiveView(proj.id)}
                 >
                    {editingProjectId === proj.id ? (
                        <input 
                            autoFocus
                            className={`w-full bg-transparent border-b border-purple-500 outline-none text-sm ${theme.text}`}
                            value={editProjectName}
                            onChange={e => setEditProjectName(e.target.value)}
                            onBlur={() => handleRenameProject(proj.id)}
                            onKeyDown={e => e.key === 'Enter' && handleRenameProject(proj.id)}
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-sm truncate">
                                <span className={`w-2.5 h-2.5 rounded-full ${proj.color.replace('text-', 'bg-')}`}></span> 
                                {proj.name}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center">
                                <button onClick={(e) => { e.stopPropagation(); setEditingProjectId(proj.id); setEditProjectName(proj.name); }} className="p-1 hover:text-purple-500"><Edit size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setProjects(prev => prev.filter(p => p.id !== proj.id)); }} className="p-1 hover:text-red-500"><Trash2 size={12} /></button>
                            </div>
                        </>
                    )}
                 </div>
              ))}
           </div>
        </div>
      </aside>

      {/* 2. Main Content */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden ${theme.bg}`}>
         {/* Header */}
         <header className={`h-16 border-b flex items-center justify-between px-6 shrink-0 ${theme.header} gap-4`}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
               <h1 className={`text-xl font-bold flex items-center gap-2 ${theme.text} whitespace-nowrap`}>
                   {currentProjectName()}
                   <span className="text-xs font-normal opacity-50 border px-1.5 py-0.5 rounded-md border-gray-400">
                       {finalFilteredTasks.length}
                   </span>
               </h1>

               <div className={`h-6 w-px mx-1 hidden md:block ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}></div>

               {/* Advanced Filters */}
               <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-400">
                          <CalendarRange size={14} />
                      </div>
                      <select 
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className={`pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer ${theme.select}`}
                      >
                          <option value="all">Todas as Datas</option>
                          <option value="overdue">🔴 Atrasadas</option>
                          <option value="today">📅 Hoje</option>
                          <option value="7">Próx. 7 dias</option>
                          <option value="15">Próx. 15 dias</option>
                          <option value="30">Próx. 30 dias</option>
                          <option value="90">Próx. 3 meses</option>
                          <option value="180">Próx. 6 meses</option>
                          <option value="365">Próx. 1 ano</option>
                      </select>
                  </div>

                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-400">
                          <Flag size={14} />
                      </div>
                      <select 
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className={`pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer ${theme.select}`}
                      >
                          <option value="all">Todas Prioridades</option>
                          <option value="p1">🔴 P1 - Urgente</option>
                          <option value="p2">🟠 P2 - Alta</option>
                          <option value="p3">🔵 P3 - Média</option>
                          <option value="p4">⚪ P4 - Baixa</option>
                      </select>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
               <button 
                 onClick={handleRunAI}
                 className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow hover:opacity-90 transition-opacity"
               >
                  <Sparkles size={16} /> IA Analista
               </button>
               
               <div className={`h-6 w-px mx-2 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}></div>

               <button 
                 onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
                 className={`flex items-center gap-1 ${theme.textSec} hover:${theme.text} px-3 py-1.5 rounded transition-colors text-sm`}
               >
                  {viewMode === 'board' ? <ListIcon size={16} /> : <LayoutGrid size={16} />} 
                  {viewMode === 'board' ? 'Lista' : 'Board'}
               </button>
            </div>
         </header>

         {/* Content Area */}
         <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            {showBoard ? (
               // --- KANBAN VIEW ---
               <div className="flex h-full space-x-6 items-start">
                  
                  {activeSections.map(section => {
                     // Filter Tasks for Section based on Tags AND global filters
                     const sectionTasks = finalFilteredTasks.filter(t => t.tags?.includes(`section:${section.id}`));
                     
                     return (
                        <div 
                            key={section.id} 
                            className="w-72 flex flex-col h-full max-h-full"
                            draggable
                            onDragStart={(e) => handleDragStartSection(e, section.id)}
                            onDrop={(e) => handleDropSection(e, section.id)}
                            onDragOver={handleDragOver}
                        >
                           {/* Section Header */}
                           <div className="flex items-center justify-between mb-3 px-1 group cursor-grab active:cursor-grabbing">
                              {editingSectionId === section.id ? (
                                  <input 
                                    autoFocus
                                    className={`bg-transparent border-b-2 border-purple-500 outline-none font-bold text-sm ${theme.text} w-full`}
                                    value={editSectionName}
                                    onChange={e => setEditSectionName(e.target.value)}
                                    onBlur={() => handleRenameSection(section.id)}
                                    onKeyDown={e => e.key === 'Enter' && handleRenameSection(section.id)}
                                  />
                              ) : (
                                  <div className="flex items-center gap-2 w-full">
                                      <GripHorizontal size={14} className="text-gray-400 opacity-0 group-hover:opacity-50" />
                                      <h3 
                                        className={`font-bold text-sm ${theme.text} cursor-pointer hover:underline decoration-dashed decoration-gray-400 underline-offset-4`}
                                        onClick={() => { setEditingSectionId(section.id); setEditSectionName(section.title); }}
                                      >
                                          {section.title}
                                      </h3>
                                      <span className="text-xs text-gray-400 font-mono ml-auto">{sectionTasks.length}</span>
                                  </div>
                              )}
                           </div>

                           {/* Tasks Container (Droppable) */}
                           <div 
                             className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-10 min-h-[100px]"
                             onDrop={(e) => handleDropTask(e, section.id)}
                             onDragOver={handleDragOver}
                           >
                              {sectionTasks.map(task => (
                                 <div 
                                   key={task.id} 
                                   draggable
                                   onDragStart={(e) => handleDragStartTask(e, task.id)}
                                   onClick={() => { setCurrentTask(task); setActiveModal(true); }}
                                   className={`${theme.card} border rounded-xl p-3 group cursor-grab active:cursor-grabbing relative transition-all hover:-translate-y-0.5 duration-200`}
                                 >
                                    <div className="flex items-start gap-3">
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task.id); }}
                                         className={`mt-0.5 w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center hover:bg-gray-200 hover:border-gray-500 transition-colors group/check`}
                                       >
                                          <Check size={12} className={`opacity-0 group-hover/check:opacity-100 text-gray-600`} />
                                       </button>
                                       <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium ${theme.text} leading-snug truncate`}>{task.title}</p>
                                          <div className="flex items-center gap-2 mt-2">
                                             {task.priority && task.priority !== 'p4' && (
                                                 <span className={`text-[10px] font-bold uppercase px-1.5 rounded ${
                                                     task.priority === 'p1' ? 'text-red-600 bg-red-100' :
                                                     task.priority === 'p2' ? 'text-orange-600 bg-orange-100' : 'text-blue-600 bg-blue-100'
                                                 }`}>
                                                     {task.priority}
                                                 </span>
                                             )}
                                             {task.dueDate && (
                                                <div className={`flex items-center text-[10px] font-medium ${task.dueDate < new Date().toISOString().split('T')[0] ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                                   <Calendar size={10} className="mr-1" />
                                                   {new Date(task.dueDate).toLocaleDateString('pt-BR', {day: 'numeric', month: 'short'})}
                                                </div>
                                             )}
                                             {task.recurrence && task.recurrence !== 'none' && (
                                                 <div className="text-gray-400"><Repeat size={10} /></div>
                                             )}
                                          </div>
                                       </div>
                                       
                                       {/* Context Menu Button */}
                                       <div className="relative">
                                           <button onClick={(e) => { e.stopPropagation(); setTaskMenuOpenId(taskMenuOpenId === task.id ? null : task.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-purple-600 p-1 rounded">
                                               <MoreHorizontal size={16} />
                                           </button>
                                           
                                           {taskMenuOpenId === task.id && (
                                               <div className="absolute right-0 top-6 w-40 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-fadeIn">
                                                   <div className="p-1 text-xs text-gray-500 font-bold px-3 py-1">Mover para:</div>
                                                   {projects.map(p => (
                                                       <button 
                                                         key={p.id} 
                                                         onClick={(e) => { e.stopPropagation(); moveTaskToProject(task.id, p.id); }}
                                                         className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                                                       >
                                                           <span className={`w-2 h-2 rounded-full ${p.color.replace('text-', 'bg-')}`}></span> {p.name}
                                                       </button>
                                                   ))}
                                               </div>
                                           )}
                                       </div>
                                    </div>
                                 </div>
                              ))}

                              <button 
                                   onClick={() => setShowQuickAdd({sectionId: section.id, visible: true})}
                                   className={`flex items-center justify-center gap-2 w-full py-2 text-sm rounded-lg opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity ${isDark ? 'text-gray-400 hover:bg-[#2a2a2a]' : 'text-gray-500 hover:bg-gray-100'}`}
                                 >
                                    <Plus size={14}/> Adicionar tarefa
                              </button>

                              {showQuickAdd.sectionId === section.id && showQuickAdd.visible && (
                                 <div className={`p-3 rounded-xl border shadow-lg animate-fadeIn ${theme.card}`}>
                                    <input 
                                      autoFocus
                                      type="text" 
                                      className={`w-full border-none text-sm focus:ring-0 mb-3 font-medium bg-transparent outline-none ${theme.text}`}
                                      placeholder="O que precisa ser feito?"
                                      value={quickAddValue}
                                      onChange={e => setQuickAddValue(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleQuickAdd(section.id)}
                                    />
                                    <div className="flex justify-between items-center">
                                       <div className="flex gap-2">
                                           <span className="p-1 rounded hover:bg-gray-100 cursor-pointer text-gray-400"><Calendar size={16}/></span>
                                           <span className="p-1 rounded hover:bg-gray-100 cursor-pointer text-gray-400"><Flag size={16}/></span>
                                       </div>
                                       <div className="flex gap-2">
                                           <button onClick={() => setShowQuickAdd({visible: false})} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                                           <button onClick={() => handleQuickAdd(section.id)} className="px-3 py-1.5 text-xs font-bold bg-[#de4c4a] text-white rounded hover:bg-[#c53b39]">Adicionar</button>
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     );
                  })}

                  {/* Generic "No Section" Column (Hidden in Kanban typically, but useful for DnD catch-all) */}
                  <div 
                    className="w-72 flex flex-col h-full opacity-60 hover:opacity-100 transition-opacity"
                    onDrop={(e) => handleDropTask(e, undefined)}
                    onDragOver={handleDragOver}
                  >
                      <div className="flex items-center justify-between mb-3 px-1">
                          <h3 className={`font-bold text-sm ${theme.text}`}>Sem Seção</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-10">
                          {finalFilteredTasks.filter(t => t.projectId === activeView && (!t.tags || !t.tags.some(tag => tag.startsWith('section:')))).map(task => (
                              <div key={task.id} draggable onDragStart={(e) => handleDragStartTask(e, task.id)} className={`${theme.card} border rounded-xl p-3 cursor-grab`}>
                                  <div className="flex justify-between items-start">
                                      <p className={`text-sm ${theme.text}`}>{task.title}</p>
                                      {task.priority && task.priority !== 'p4' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                  </div>
                              </div>
                          ))}
                          <div className="h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400">
                              Solte tarefas aqui
                          </div>
                      </div>
                  </div>

                  {/* Add Section Button */}
                  <div className="w-72 flex-shrink-0">
                      <button 
                        onClick={handleAddSection}
                        className={`flex items-center gap-2 w-full p-2 rounded-lg transition-colors text-sm font-bold ${isDark ? 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                      >
                          <div className="p-1"><Plus size={18} /></div> Adicionar Seção
                      </button>
                  </div>

               </div>
            ) : (
               <div className="max-w-3xl mx-auto space-y-4">
                  {/* List View Implementation */}
                  
                  {/* Quick Add Top */}
                  <div 
                    onClick={() => setShowQuickAdd({visible: true})}
                    className="flex items-center gap-2 text-gray-500 hover:text-[#de4c4a] cursor-pointer group py-2"
                  >
                      <div className="w-5 h-5 rounded-full border-2 border-transparent group-hover:bg-[#de4c4a] group-hover:text-white flex items-center justify-center text-[#de4c4a] transition-all">
                          <Plus size={14} />
                      </div>
                      <span className="text-sm font-medium">Adicionar tarefa</span>
                  </div>

                  {showQuickAdd.visible && !showQuickAdd.sectionId && (
                     <div className={`p-4 rounded-xl border shadow-lg mb-4 animate-fadeIn ${theme.card}`}>
                        <input 
                          autoFocus
                          type="text" 
                          className={`w-full border-none text-base focus:ring-0 mb-3 font-medium bg-transparent outline-none ${theme.text}`}
                          placeholder="Nome da tarefa..."
                          value={quickAddValue}
                          onChange={e => setQuickAddValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                        />
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100/10">
                           <button onClick={() => setShowQuickAdd({visible: false})} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                           <button onClick={() => handleQuickAdd()} className="px-3 py-1.5 text-xs font-bold bg-[#de4c4a] text-white rounded hover:bg-[#c53b39]">Adicionar tarefa</button>
                        </div>
                     </div>
                  )}

                  {finalFilteredTasks.map(task => (
                     <div key={task.id} className={`flex items-start py-3 border-b ${isDark ? 'border-[#333]' : 'border-gray-100'} group ${theme.hover} px-2 rounded -mx-2 cursor-pointer transition-all`} onClick={() => { setCurrentTask(task); setActiveModal(true); }}>
                        <button 
                           onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task.id); }}
                           className={`mt-1 mr-3 w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center hover:bg-gray-200 transition-colors`}
                        >
                           <Check size={12} className={`opacity-0 group-hover:opacity-50 text-gray-600`} />
                        </button>
                        <div className="flex-1">
                           <div className="flex items-center gap-2">
                               <p className={`text-sm ${theme.text}`}>{task.title}</p>
                               {task.priority && task.priority !== 'p4' && <Flag size={12} className={task.priority === 'p1' ? 'text-red-500' : task.priority === 'p2' ? 'text-orange-500' : 'text-blue-500'} />}
                           </div>
                           <div className="flex items-center gap-2 mt-1">
                               {task.description && <FileText size={10} className="text-gray-400"/>}
                               {task.dueDate && (
                                   <span className={`text-[10px] flex items-center ${task.dueDate < new Date().toISOString().split('T')[0] ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                       <Calendar size={10} className="mr-1"/> {new Date(task.dueDate).toLocaleDateString()}
                                   </span>
                               )}
                               <span className="text-[10px] text-gray-400">{projects.find(p=>p.id===task.projectId)?.name}</span>
                           </div>
                        </div>
                     </div>
                  ))}
                  
                  {finalFilteredTasks.length === 0 && (
                      <div className="text-center py-20">
                          <img src="https://todoist.b-cdn.net/assets/images/44245c5165ed8dae89d66dfb44c9797e.png" className="w-48 mx-auto mb-4 opacity-50" />
                          <p className={`text-sm ${theme.textSec}`}>
                              {filterDate !== 'all' || filterPriority !== 'all' ? 'Nenhuma tarefa com estes filtros.' : 'Tudo limpo! Aproveite o descanso.'}
                          </p>
                      </div>
                  )}
               </div>
            )}
         </div>
      </main>

      {/* Edit Task Modal */}
      <Modal isOpen={activeModal} onClose={() => setActiveModal(false)} title="" size="lg">
         <div className={`space-y-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            <div className="flex gap-2 mb-2">
                <span className="text-xs border px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">
                    {projects.find(p=>p.id===currentTask.projectId)?.name || 'Entrada'}
                </span>
            </div>
            
            <input 
               type="text" 
               className={`w-full text-xl font-bold border-b border-transparent focus:border-purple-500 p-2 placeholder-gray-400 outline-none ${isDark ? 'bg-[#2a2a2a] text-white' : 'bg-white text-gray-900'}`}
               placeholder="Nome da Tarefa"
               value={currentTask.title || ''}
               onChange={e => setCurrentTask({...currentTask, title: e.target.value})}
            />
            
            {/* New Features: Date, Recurrence, Reminder */}
            <div className="flex flex-wrap gap-4 border-b border-gray-100 pb-4">
                <div>
                    <label className="text-xs text-gray-500 block mb-1 flex items-center"><Calendar size={12} className="mr-1"/> Vencimento</label>
                    <input 
                      type="date" 
                      className={`text-sm border rounded p-2 ${isDark ? 'bg-[#333] text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                      value={currentTask.dueDate || ''} 
                      onChange={e => setCurrentTask({...currentTask, dueDate: e.target.value})} 
                    />
                </div>
                
                <div>
                    <label className="text-xs text-gray-500 block mb-1 flex items-center"><Flag size={12} className="mr-1"/> Prioridade</label>
                    <select 
                      className={`text-sm border rounded p-2 ${isDark ? 'bg-[#333] text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                      value={currentTask.priority || 'p4'} 
                      onChange={e => setCurrentTask({...currentTask, priority: e.target.value as any})}
                    >
                        <option value="p1">P1 - Urgente</option>
                        <option value="p2">P2 - Alta</option>
                        <option value="p3">P3 - Média</option>
                        <option value="p4">P4 - Baixa</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs text-gray-500 block mb-1 flex items-center"><Repeat size={12} className="mr-1"/> Repetir</label>
                    <select 
                      className={`text-sm border rounded p-2 ${isDark ? 'bg-[#333] text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                      value={currentTask.recurrence || 'none'} 
                      onChange={e => setCurrentTask({...currentTask, recurrence: e.target.value as any})}
                    >
                        <option value="none">Não repetir</option>
                        <option value="daily">Diariamente</option>
                        <option value="weekly">Semanalmente</option>
                        <option value="monthly">Mensalmente</option>
                        <option value="quarterly">A cada 3 meses</option>
                        <option value="yearly">Anualmente</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs text-gray-500 block mb-1 flex items-center"><BellRing size={12} className="mr-1"/> Lembrete</label>
                    <input 
                      type="time" 
                      className={`text-sm border rounded p-2 ${isDark ? 'bg-[#333] text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                      value={currentTask.reminderTime || ''} 
                      onChange={e => setCurrentTask({...currentTask, reminderTime: e.target.value})} 
                    />
                </div>
            </div>

            <textarea 
               className={`w-full text-sm border rounded-lg p-3 resize-none h-32 outline-none leading-relaxed ${isDark ? 'bg-[#2a2a2a] text-white border-gray-600' : 'bg-gray-50 text-gray-800 border-gray-200'}`}
               placeholder="Descrição / Notas..."
               value={currentTask.description || ''}
               onChange={e => setCurrentTask({...currentTask, description: e.target.value})}
            />
            
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
               <button onClick={() => setActiveModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded font-medium">Cancelar</button>
               <button className={`px-6 py-2 text-sm text-white rounded font-bold bg-[#de4c4a] hover:bg-[#c53b39]`}>Salvar</button>
            </div>
         </div>
      </Modal>

      {/* AI Analyst Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="IA Analista de Produtividade" size="md">
          {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                  <p className="text-gray-500 text-sm animate-pulse">Analisando seus padrões de trabalho...</p>
              </div>
          ) : (
              <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-start gap-4">
                      <div className="bg-white p-2 rounded-full shadow-sm"><BrainCircuit size={24} className="text-purple-600"/></div>
                      <div>
                          <h4 className="font-bold text-purple-900 text-sm mb-1">Análise Concluída</h4>
                          <div className="text-sm text-purple-800 leading-relaxed whitespace-pre-line">{aiAnalysis}</div>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                          <p className="text-xs text-gray-500 uppercase font-bold">Tarefas Pendentes</p>
                          <p className="text-2xl font-bold text-gray-800">{tasks.filter(t=>!t.completed).length}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                          <p className="text-xs text-gray-500 uppercase font-bold">Taxa de Conclusão</p>
                          <p className="text-2xl font-bold text-green-600">
                              {tasks.length > 0 ? Math.round((tasks.filter(t=>t.completed).length / tasks.length) * 100) : 0}%
                          </p>
                      </div>
                  </div>

                  <div className="flex justify-end pt-2">
                      <button onClick={() => setShowAIModal(false)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black">Entendido</button>
                  </div>
              </div>
          )}
      </Modal>
    </div>
  );
};

export default Tasks;
