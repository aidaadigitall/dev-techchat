import React, { useState, useEffect, useRef } from 'react';
import { 
  Inbox, Calendar, CalendarDays, Hash, Flag, Plus, 
  CheckCircle2, Circle, MoreHorizontal, FileText, 
  Download, RefreshCw, ChevronRight, ChevronDown, 
  Trash2, X, Search, Filter, Eye, EyeOff, Edit, Save,
  Clock, Upload, Users, AlertCircle, CornerDownRight, Tag as TagIcon,
  Check, Maximize2
} from 'lucide-react';
import { MOCK_USERS } from '../constants';
import { Task, TaskPriority } from '../types';
import { api } from '../services/api';
import Modal from '../components/Modal';

// --- Interfaces Locais ---

interface Project {
  id: string;
  name: string;
  color: string;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number | string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, count, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <div className="flex items-center">
      <span className={`mr-3 ${isActive ? 'text-purple-600' : 'text-gray-500'}`}>{icon}</span>
      {label}
    </div>
    {count !== undefined && count !== 0 && (
      <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    )}
  </button>
);

// --- Dados Mockados ---

const MOCK_PROJECTS: Project[] = [
  { id: 'comercial', name: 'Comercial', color: 'text-blue-500' },
  { id: 'financeiro', name: 'Financeiro', color: 'text-green-500' },
  { id: 'marketing', name: 'Marketing', color: 'text-purple-500' },
  { id: 'dev', name: 'Desenvolvimento', color: 'text-orange-500' }
];

// --- Helpers de UI ---

const PriorityFlag: React.FC<{ p: TaskPriority }> = ({ p }) => {
  const colors = {
    p1: 'text-red-600 fill-red-100',
    p2: 'text-orange-500 fill-orange-50',
    p3: 'text-blue-500 fill-blue-50',
    p4: 'text-gray-400'
  };
  return <Flag size={16} className={colors[p]} />;
};

const UserAvatar: React.FC<{ userId?: string }> = ({ userId }) => {
  if (!userId) return null;
  const user = MOCK_USERS.find(u => u.id === userId);
  if (!user) return null;
  
  return (
    <div className="w-6 h-6 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[10px] font-bold text-gray-700 shadow-sm overflow-hidden" title={user.name}>
      {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0)}
    </div>
  );
};

// --- Componente Principal ---

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<'inbox' | 'today' | 'upcoming' | string>('today');
  const [loading, setLoading] = useState(false);
  
  // Quick Add State
  const [quickAddValue, setQuickAddValue] = useState('');
  const [quickAddDate, setQuickAddDate] = useState('');
  const [quickAddPriority, setQuickAddPriority] = useState<TaskPriority>('p4');
  
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<'all' | TaskPriority>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('pending');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'overdue' | 'today' | 'week'>('all');
  const [customDateFilter, setCustomDateFilter] = useState('');

  // UI States
  const [collaboratorTyping, setCollaboratorTyping] = useState(false);
  const [priorityMenuOpenId, setPriorityMenuOpenId] = useState<string | null>(null);

  // Estados para Modais
  const [activeModal, setActiveModal] = useState<boolean>(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
  const [tagInput, setTagInput] = useState(''); 
  
  // Inline Edit State
  const [quickEditingTaskId, setQuickEditingTaskId] = useState<string | null>(null);
  const [quickEditForm, setQuickEditForm] = useState<{title: string, dueDate: string}>({ title: '', dueDate: '' });
  
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTasks();
    
    // Simula atividade de colaboração aleatória
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setCollaboratorTyping(true);
        setTimeout(() => setCollaboratorTyping(false), 3000);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => setPriorityMenuOpenId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const data = await api.tasks.list();
    setTasks(data);
    setLoading(false);
  };

  // --- Lógica de Filtros ---
  const getFilteredTasks = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let filtered = tasks;

    // 1. Filtro Principal (Navegação Lateral)
    if (customDateFilter) {
      filtered = filtered.filter(t => t.dueDate && t.dueDate.startsWith(customDateFilter));
    } else {
      switch (activeFilter) {
        case 'inbox':
          filtered = filtered.filter(t => t.projectId === 'inbox');
          break;
        case 'today':
          filtered = filtered.filter(t => t.dueDate && t.dueDate.startsWith(todayStr));
          break;
        case 'upcoming':
          filtered = filtered.filter(t => t.dueDate && t.dueDate > todayStr);
          break;
        default: // Projetos
          filtered = filtered.filter(t => t.projectId === activeFilter);
      }
    }

    // 2. Filtros Avançados (Toolbar)
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => filterStatus === 'completed' ? t.completed : !t.completed);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }

    if (filterDateRange !== 'all') {
      filtered = filtered.filter(t => {
        if (!t.dueDate) return false;
        const taskDate = new Date(t.dueDate);
        const diffTime = taskDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (filterDateRange === 'overdue') return taskDate < today && !t.dueDate.startsWith(todayStr);
        if (filterDateRange === 'today') return t.dueDate.startsWith(todayStr);
        if (filterDateRange === 'week') return diffDays >= 0 && diffDays <= 7;
        return true;
      });
    }

    return filtered;
  };

  // --- Ações ---
  const toggleTaskCompletion = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Optimistic Update
    const newStatus = !task.completed;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) return { ...t, completed: newStatus };
      if (t.subtasks) {
        return {
          ...t,
          subtasks: t.subtasks.map(st => st.id === taskId ? { ...st, completed: !st.completed } : st)
        }
      }
      return t;
    }));

    if (!task.subtasks?.find(st => st.id === taskId)) {
       await api.tasks.update(taskId, { completed: newStatus });
    }
  };

  const updateTaskPriority = async (taskId: string, priority: TaskPriority) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority } : t));
    setPriorityMenuOpenId(null);
    await api.tasks.update(taskId, { priority });
  };

  const toggleSubtaskExpand = (taskId: string) => {
    setExpandedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleRefresh = () => {
    loadTasks();
  };

  const handleExport = () => {
    const filtered = getFilteredTasks();
    const headers = "ID,Título,Descrição,Data Vencimento,Prioridade,Projeto,Concluído\n";
    const rows = filtered.map(t => 
      `${t.id},"${t.title.replace(/"/g, '""')}", "${(t.description || '').replace(/"/g, '""')}",${t.dueDate || ''},${t.priority},${t.projectId},${t.completed ? 'Sim' : 'Não'}`
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURI(headers + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `tarefas_${activeFilter}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Inline Edit Handlers ---
  const startQuickEdit = (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault(); // Prevent double click default (selection)
    setQuickEditingTaskId(task.id);
    setQuickEditForm({
      title: task.title,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : ''
    });
  };

  const cancelQuickEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setQuickEditingTaskId(null);
  };

  const saveQuickEdit = async (taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!quickEditForm.title.trim()) return;

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: quickEditForm.title, dueDate: quickEditForm.dueDate || undefined } : t));
    setQuickEditingTaskId(null);

    await api.tasks.update(taskId, { 
      title: quickEditForm.title, 
      dueDate: quickEditForm.dueDate || undefined 
    });
  };

  const handleQuickEditKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === 'Enter') {
      saveQuickEdit(taskId);
    } else if (e.key === 'Escape') {
      cancelQuickEdit();
    }
  };

  // --- Importação CSV ---
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n');
      
      const newTasks: Task[] = [];
      
      const startIdx = lines[0].toLowerCase().includes('titulo') ? 1 : 0;

      for(let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if(!line) continue;
        
        const parts = line.split(',');
        if (parts.length >= 1) {
           const title = parts[0]?.trim();
           if (!title) continue;

           const description = parts[1]?.trim();
           const dueDate = parts[2]?.trim(); // Esperado ISO
           const priority = (parts[3]?.trim() as TaskPriority) || 'p4';
           const projectId = parts[4]?.trim() || 'inbox';

           newTasks.push({
             id: `imp_${Date.now()}_${i}`,
             title,
             description,
             dueDate: dueDate && dueDate.includes('-') ? dueDate : undefined,
             priority: ['p1','p2','p3','p4'].includes(priority) ? priority : 'p4',
             projectId,
             completed: false,
             subtasks: []
           });
        }
      }

      if(newTasks.length > 0) {
        setTasks(prev => [...prev, ...newTasks]);
        alert(`${newTasks.length} tarefas importadas com sucesso!`);
        setImportModalOpen(false);
      } else {
        alert("Nenhum formato válido encontrado. Use: Título, Descrição, Data(YYYY-MM-DD), Prioridade, ProjetoID");
      }
      if (importFileRef.current) importFileRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddValue.trim()) return;

    let finalDate = quickAddDate;
    if (!finalDate && activeFilter === 'today') {
       finalDate = new Date().toISOString().slice(0, 16);
    }

    const newTaskData: Partial<Task> = {
      title: quickAddValue,
      projectId: activeFilter === 'today' || activeFilter === 'upcoming' ? 'inbox' : activeFilter,
      priority: quickAddPriority,
      dueDate: finalDate || undefined,
      subtasks: []
    };

    const tempTask = { ...newTaskData, id: Date.now().toString(), completed: false } as Task;
    setTasks([...tasks, tempTask]);
    
    setQuickAddValue('');
    setQuickAddDate('');
    setQuickAddPriority('p4');
    setShowQuickAdd(false);

    await api.tasks.create(newTaskData);
    loadTasks();
  };

  // --- Modal Editing Logic ---

  const openEditModal = (task: Task) => {
    let formattedDate = '';
    if (task.dueDate) {
        formattedDate = task.dueDate.length > 16 ? task.dueDate.slice(0, 16) : task.dueDate;
    }
    setCurrentTask({ ...task, dueDate: formattedDate });
    setTagInput('');
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

  const handleAddSubtaskInModal = () => {
    const newSubtask: Task = {
      id: `st_${Date.now()}`,
      title: 'Nova Subtarefa',
      projectId: currentTask.projectId || 'inbox',
      priority: 'p4',
      completed: false
    };
    setCurrentTask(prev => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), newSubtask]
    }));
  };

  const handleUpdateSubtaskInModal = (id: string, field: string, value: any) => {
    setCurrentTask(prev => ({
      ...prev,
      subtasks: prev.subtasks?.map(st => st.id === id ? { ...st, [field]: value } : st)
    }));
  };

  const handleRemoveSubtaskInModal = (id: string) => {
    setCurrentTask(prev => ({
      ...prev,
      subtasks: prev.subtasks?.filter(st => st.id !== id)
    }));
  };

  const handleDeleteTask = async () => {
    if (currentTask.id) {
      if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        await api.tasks.delete(currentTask.id);
        setTasks(prev => prev.filter(t => t.id !== currentTask.id));
        setActiveModal(false);
        setCurrentTask({});
      }
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const newTags = [...(currentTask.tags || []), tagInput.trim()];
    // Remove duplicates
    const uniqueTags = Array.from(new Set(newTags));
    setCurrentTask({ ...currentTask, tags: uniqueTags });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCurrentTask({ ...currentTask, tags: currentTask.tags?.filter(tag => tag !== tagToRemove) });
  };

  // Renderizador de Lista de Tarefas
  const renderTaskList = () => {
    const filtered = getFilteredTasks();
    
    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <CheckCircle2 size={48} className="mb-4 opacity-20" />
          <p>Tudo feito! Aproveite o seu dia.</p>
          {filterStatus === 'completed' && <p className="text-xs mt-2">Nenhuma tarefa concluída encontrada.</p>}
        </div>
      );
    }

    return (
      <div className="space-y-1 print:space-y-4 pb-20">
        {filtered.map(task => {
          const isQuickEditing = quickEditingTaskId === task.id;

          return (
            <div key={task.id} className="group">
              {/* Task Row */}
              <div 
                className={`flex items-start py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors group/row border-b border-gray-100 last:border-0 ${task.completed ? 'bg-gray-50/60' : ''}`}
                onDoubleClick={() => !isQuickEditing && openEditModal(task)} // Fallback double click to modal if clicking on whitespace
              >
                {/* Checkbox Area */}
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task.id); }}
                  className={`mt-1 mr-3 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-95 transform ${
                    task.completed ? 'bg-purple-600 border-purple-600 text-white scale-100' :
                    task.priority === 'p1' ? 'border-red-400 hover:bg-red-50 text-red-600' : 
                    task.priority === 'p2' ? 'border-orange-400 hover:bg-orange-50 text-orange-500' :
                    task.priority === 'p3' ? 'border-blue-400 hover:bg-blue-50 text-blue-500' :
                    'border-gray-300 hover:bg-gray-100 text-gray-400'
                  }`}
                >
                  <CheckCircle2 size={14} className={`transition-opacity duration-300 ${task.completed ? 'opacity-100' : 'opacity-0'}`} />
                </button>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1">
                    {isQuickEditing ? (
                      <input 
                        type="text" 
                        autoFocus
                        className="flex-1 text-sm font-medium border border-purple-300 rounded px-2 py-0.5 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                        value={quickEditForm.title}
                        onChange={(e) => setQuickEditForm({...quickEditForm, title: e.target.value})}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => handleQuickEditKeyDown(e, task.id)}
                      />
                    ) : (
                      <span 
                        className={`text-sm font-medium mr-1 transition-all duration-300 cursor-text ${task.completed ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-800'}`}
                        onDoubleClick={(e) => startQuickEdit(task, e)}
                        title="Duplo clique para editar o título"
                      >
                        {task.title}
                      </span>
                    )}
                    
                    {!isQuickEditing && task.tags?.map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium print:border print:border-gray-300 border border-gray-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {!isQuickEditing && task.description && (
                    <p className={`text-xs mt-0.5 line-clamp-1 transition-all duration-300 ${task.completed ? 'text-gray-300 line-through' : 'text-gray-500'}`}>{task.description}</p>
                  )}

                  {/* Metadata Row */}
                  <div className="flex items-center mt-1.5 space-x-3">
                    {/* Due Date - Editable */}
                    <div className="flex items-center">
                       {isQuickEditing ? (
                          <input 
                            type="date" 
                            className="text-xs border border-purple-300 rounded px-1 py-0 bg-white"
                            value={quickEditForm.dueDate}
                            onChange={(e) => setQuickEditForm({...quickEditForm, dueDate: e.target.value})}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => handleQuickEditKeyDown(e, task.id)}
                          />
                       ) : (
                          task.dueDate && (
                            <div 
                              className={`flex items-center text-xs cursor-pointer hover:bg-gray-100 rounded px-1 -ml-1 transition-colors ${!task.completed && new Date(task.dueDate) < new Date() ? 'text-red-600 font-medium' : 'text-gray-500'}`}
                              onDoubleClick={(e) => startQuickEdit(task, e)}
                              title="Duplo clique para alterar a data"
                            >
                              <Calendar size={12} className="mr-1" />
                              {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )
                       )}
                    </div>
                    
                    {/* Subtasks Count / Expand */}
                    {task.subtasks && task.subtasks.length > 0 && !isQuickEditing && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleSubtaskExpand(task.id); }}
                        className="flex items-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <div className="flex items-center justify-center w-3 h-3 bg-gray-200 rounded-full mr-1 text-[8px] font-bold text-gray-600">
                          {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                        </div>
                        <span className="text-[10px]">subtarefas</span>
                        {expandedTasks.includes(task.id) ? <ChevronDown size={10} className="ml-1"/> : <ChevronRight size={10} className="ml-1"/>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className={`flex items-center space-x-2 ${isQuickEditing ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'} transition-opacity print:hidden relative`}>
                  {isQuickEditing ? (
                    <>
                      <button onClick={(e) => saveQuickEdit(task.id, e)} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Salvar (Enter)">
                        <Check size={16} />
                      </button>
                      <button onClick={(e) => cancelQuickEdit(e)} className="text-red-600 hover:bg-red-50 p-1 rounded" title="Cancelar (Esc)">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={(e) => startQuickEdit(task, e)} className="text-gray-400 hover:text-purple-600 p-1 rounded hover:bg-gray-100" title="Edição Rápida">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => openEditModal(task)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-gray-100" title="Ver Detalhes">
                        <Maximize2 size={14} />
                      </button>
                      <UserAvatar userId={task.assigneeId} />
                      
                      {/* Priority Inline Dropdown */}
                      <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPriorityMenuOpenId(priorityMenuOpenId === task.id ? null : task.id); }}
                          className="p-1 hover:bg-gray-100 rounded focus:outline-none"
                        >
                            <PriorityFlag p={task.priority} />
                        </button>
                        {priorityMenuOpenId === task.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 w-32 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                              {['p1', 'p2', 'p3', 'p4'].map((p) => (
                                  <button
                                    key={p}
                                    className="w-full px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 text-xs text-left"
                                    onClick={() => updateTaskPriority(task.id, p as TaskPriority)}
                                  >
                                    <PriorityFlag p={p as TaskPriority} />
                                    <span className="capitalize text-gray-700">{p.toUpperCase()}</span>
                                    {task.priority === p && <CheckCircle2 size={12} className="ml-auto text-purple-600"/>}
                                  </button>
                              ))}
                            </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Subtasks Render (Indented List) */}
              {expandedTasks.includes(task.id) && task.subtasks && !isQuickEditing && (
                <div className="pl-8 pr-2 pb-2 space-y-1">
                  {task.subtasks.map(st => (
                    <div key={st.id} className="flex items-center py-1.5 border-l-2 border-gray-200 pl-3 hover:bg-gray-50 rounded-r transition-colors group/sub">
                      <button 
                        onClick={() => toggleTaskCompletion(st.id)}
                        className={`mr-3 w-3.5 h-3.5 rounded-full border flex items-center justify-center hover:bg-gray-100 transition-all duration-300 ${st.completed ? 'bg-gray-400 border-gray-400 scale-90' : 'border-gray-300'}`}
                      >
                        {st.completed && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </button>
                      <span className={`text-xs flex-1 transition-all duration-300 ${st.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{st.title}</span>
                      <PriorityFlag p={st.priority} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const EditIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
  );

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* 1. Sidebar (Task Navigation) - Desktop Hidden on Mobile */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 flex-col pt-6 print:hidden hidden md:flex">
        <div className="px-4 mb-6">
          <button 
            onClick={() => setShowQuickAdd(true)}
            className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            <Plus size={16} className="mr-2" /> Adicionar Tarefa
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          <NavItem 
            icon={<Inbox size={18} />} 
            label="Entrada" 
            count={tasks.filter(t => t.projectId === 'inbox' && !t.completed).length} 
            isActive={activeFilter === 'inbox' && !customDateFilter}
            onClick={() => { setActiveFilter('inbox'); setCustomDateFilter(''); }}
          />
          <NavItem 
            icon={<CalendarDays size={18} className="text-green-600" />} 
            label="Hoje" 
            count={tasks.filter(t => (t.dueDate && t.dueDate.startsWith(new Date().toISOString().split('T')[0])) && !t.completed).length}
            isActive={activeFilter === 'today' && !customDateFilter}
            onClick={() => { setActiveFilter('today'); setCustomDateFilter(''); }}
          />
          <NavItem 
            icon={<Calendar size={18} className="text-purple-600" />} 
            label="Próximos" 
            isActive={activeFilter === 'upcoming' && !customDateFilter}
            onClick={() => { setActiveFilter('upcoming'); setCustomDateFilter(''); }}
          />

          <div className="pt-6 pb-2 px-3 flex justify-between items-center group">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Projetos</span>
            <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={14} /></button>
          </div>
          
          {MOCK_PROJECTS.map(proj => (
            <button
              key={proj.id}
              onClick={() => { setActiveFilter(proj.id); setCustomDateFilter(''); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeFilter === proj.id && !customDateFilter ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <Hash size={16} className={`mr-3 ${proj.color}`} />
                {proj.name}
              </div>
              <span className="text-xs text-gray-400">
                {tasks.filter(t => t.projectId === proj.id && !t.completed).length || ''}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 2. Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Navigation Dropdown */}
        <div className="md:hidden px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
           <select 
             className="flex-1 bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
             value={activeFilter}
             onChange={(e) => setActiveFilter(e.target.value)}
           >
              <option value="inbox">📥 Entrada</option>
              <option value="today">📅 Hoje</option>
              <option value="upcoming">🗓️ Próximos</option>
              {MOCK_PROJECTS.map(p => (
                 <option key={p.id} value={p.id}># {p.name}</option>
              ))}
           </select>
           <button 
             onClick={() => setShowQuickAdd(true)}
             className="bg-purple-600 text-white p-2 rounded-lg"
           >
             <Plus size={20} />
           </button>
        </div>

        {/* Header */}
        <header className="px-4 md:px-8 py-5 border-b border-gray-100 bg-white z-10 print:hidden flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-800 capitalize flex items-center">
                {customDateFilter ? `Tarefas de ${new Date(customDateFilter + 'T12:00:00').toLocaleDateString('pt-BR')}` :
                 activeFilter === 'inbox' ? 'Entrada' : 
                 activeFilter === 'today' ? 'Hoje' :
                 activeFilter === 'upcoming' ? 'Próximos' :
                 MOCK_PROJECTS.find(p => p.id === activeFilter)?.name || activeFilter}
              </h1>
              <span className="text-xs text-gray-400 font-medium hidden sm:inline-block">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              {/* Typing Indicator */}
              {collaboratorTyping && (
                 <div className="flex items-center text-xs text-gray-400 ml-4 animate-pulse">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1"></span>
                    Alguém está editando...
                 </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              <button 
                onClick={() => setImportModalOpen(true)}
                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex-shrink-0"
                title="Importar CSV"
              >
                <Upload size={18} />
              </button>
              <button onClick={() => handleExport()} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg flex-shrink-0" title="Exportar CSV">
                <FileText size={18} />
              </button>
              <button onClick={handleRefresh} className={`p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg flex-shrink-0 ${loading ? 'animate-spin' : ''}`} title="Atualizar">
                <RefreshCw size={18} />
              </button>
              
              <div className="h-6 w-px bg-gray-200 mx-1 flex-shrink-0"></div>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${showFilters ? 'bg-purple-100 text-purple-600' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Filter size={18} />
              </button>
            </div>
          </div>

          {/* Advanced Filters Bar */}
          {showFilters && (
            <div className="flex flex-col md:flex-row flex-wrap gap-3 p-3 bg-gray-50 rounded-lg animate-fadeIn border border-gray-200">
               <div className="flex items-center justify-between md:justify-start">
                  <span className="text-xs font-bold text-gray-500 mr-2 uppercase">Status:</span>
                  <select 
                    className="text-xs border-gray-300 rounded p-1 bg-white focus:ring-purple-500 w-32 md:w-auto"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                  >
                    <option value="pending">Pendente</option>
                    <option value="completed">Concluído</option>
                    <option value="all">Todas</option>
                  </select>
               </div>
               <div className="flex items-center justify-between md:justify-start">
                  <span className="text-xs font-bold text-gray-500 mr-2 uppercase">Prioridade:</span>
                  <select 
                    className="text-xs border-gray-300 rounded p-1 bg-white focus:ring-purple-500 w-32 md:w-auto"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value as any)}
                  >
                    <option value="all">Todas</option>
                    <option value="p1">P1 (Alta)</option>
                    <option value="p2">P2 (Média)</option>
                    <option value="p3">P3 (Baixa)</option>
                    <option value="p4">P4 (Sem)</option>
                  </select>
               </div>
               <div className="flex items-center justify-between md:justify-start">
                  <span className="text-xs font-bold text-gray-500 mr-2 uppercase">Vencimento:</span>
                  <select 
                    className="text-xs border-gray-300 rounded p-1 bg-white focus:ring-purple-500 w-32 md:w-auto"
                    value={filterDateRange}
                    onChange={(e) => setFilterDateRange(e.target.value as any)}
                  >
                    <option value="all">Qualquer data</option>
                    <option value="today">Hoje</option>
                    <option value="week">Próx. 7 dias</option>
                    <option value="overdue">Atrasadas</option>
                  </select>
               </div>
               <div className="flex items-center ml-auto w-full md:w-auto justify-end">
                  <span className="text-xs font-bold text-gray-500 mr-2 uppercase">Data Esp.:</span>
                  <input 
                    type="date" 
                    className="text-xs border-gray-300 rounded p-1 bg-white"
                    value={customDateFilter}
                    onChange={(e) => setCustomDateFilter(e.target.value)}
                  />
                  {customDateFilter && (
                    <button onClick={() => setCustomDateFilter('')} className="ml-1 text-red-500 hover:bg-red-50 p-1 rounded"><X size={12} /></button>
                  )}
               </div>
            </div>
          )}
        </header>

        {/* Task List Container */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            {/* Quick Add Inline (Top) */}
            {showQuickAdd && (
              <form onSubmit={handleQuickAdd} className="mb-6 border border-gray-300 rounded-lg p-3 shadow-sm bg-white animate-fadeIn">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Nome da tarefa ex: Revisar contrato amanhã #comercial"
                  className="w-full text-sm font-medium outline-none text-gray-800 placeholder:text-gray-400 mb-2 bg-white" 
                  value={quickAddValue}
                  onChange={e => setQuickAddValue(e.target.value)}
                />
                <div className="flex justify-between items-center pt-2 border-t border-gray-100 flex-wrap gap-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative">
                       {/* Ensure input covers the button and is clickable with cursor pointer */}
                       <input 
                         type="datetime-local" 
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                         value={quickAddDate}
                         onChange={(e) => setQuickAddDate(e.target.value)}
                         title="Escolher data e hora"
                       />
                       <button type="button" className={`flex items-center px-2 py-1 rounded border text-xs hover:bg-gray-50 bg-white ${quickAddDate ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-gray-200 text-gray-500'}`}>
                         <Calendar size={12} className="mr-1"/> 
                         {quickAddDate ? new Date(quickAddDate).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'}) : 'Data & Hora'}
                       </button>
                    </div>

                    <div className="relative group">
                       <button type="button" className="flex items-center px-2 py-1 rounded border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 bg-white">
                         <PriorityFlag p={quickAddPriority} /> <span className="ml-1 capitalize">{quickAddPriority}</span>
                       </button>
                       <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 hidden group-hover:block w-32">
                          {['p1', 'p2', 'p3', 'p4'].map((p) => (
                             <div 
                               key={p} 
                               className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex items-center gap-2 text-xs"
                               onClick={() => setQuickAddPriority(p as TaskPriority)}
                             >
                                <PriorityFlag p={p as TaskPriority} /> {p.toUpperCase()}
                             </div>
                          ))}
                       </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto justify-end">
                    <button type="button" onClick={() => setShowQuickAdd(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" disabled={!quickAddValue.trim()} className="px-3 py-1.5 text-xs font-bold bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">Adicionar Tarefa</button>
                  </div>
                </div>
              </form>
            )}

            {renderTaskList()}

            {!showQuickAdd && (
              <button 
                onClick={() => setShowQuickAdd(true)}
                className="flex items-center mt-4 text-gray-500 hover:text-purple-600 transition-colors group text-sm font-medium print:hidden"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center mr-3 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Plus size={16} />
                </div>
                Adicionar tarefa
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      <Modal isOpen={activeModal} onClose={() => setActiveModal(false)} title="Editar Tarefa" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
             <input 
               type="text" 
               className="w-full border border-gray-300 rounded-md p-2 bg-white font-medium focus:ring-purple-500" 
               value={currentTask.title || ''}
               onChange={e => setCurrentTask({...currentTask, title: e.target.value})}
               placeholder="O que precisa ser feito?"
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
             <textarea 
               className="w-full border border-gray-300 rounded-md p-2 bg-white h-20 resize-none text-sm focus:ring-purple-500" 
               value={currentTask.description || ''}
               onChange={e => setCurrentTask({...currentTask, description: e.target.value})}
               placeholder="Detalhes adicionais..."
             />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Vencimento & Hora</label>
                <input 
                  type="datetime-local" 
                  className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm"
                  value={currentTask.dueDate || ''}
                  onChange={e => setCurrentTask({...currentTask, dueDate: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                <select 
                  className="w-full border border-gray-300 rounded-md p-2 bg-white"
                  value={currentTask.priority}
                  onChange={e => setCurrentTask({...currentTask, priority: e.target.value as TaskPriority})}
                >
                   <option value="p1">P1 - Alta (Vermelho)</option>
                   <option value="p2">P2 - Média (Laranja)</option>
                   <option value="p3">P3 - Baixa (Azul)</option>
                   <option value="p4">P4 - Sem prioridade</option>
                </select>
              </div>
           </div>

           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Projeto</label>
              <select 
                className="w-full border border-gray-300 rounded-md p-2 bg-white"
                value={currentTask.projectId}
                onChange={e => setCurrentTask({...currentTask, projectId: e.target.value})}
              >
                 <option value="inbox">Entrada</option>
                 {MOCK_PROJECTS.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                 ))}
              </select>
           </div>

           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
              <select 
                className="w-full border border-gray-300 rounded-md p-2 bg-white"
                value={currentTask.assigneeId || ''}
                onChange={e => setCurrentTask({...currentTask, assigneeId: e.target.value})}
              >
                 <option value="">Sem responsável</option>
                 {MOCK_USERS.map(u => (
                   <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                 ))}
              </select>
           </div>

           {/* Tags Section */}
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                 {currentTask.tags?.map(tag => (
                    <span key={tag} className="flex items-center px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs border border-purple-100">
                       <TagIcon size={10} className="mr-1" /> {tag}
                       <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-red-500"><X size={10} /></button>
                    </span>
                 ))}
              </div>
              <input 
                 type="text" 
                 placeholder="Digite uma tag e pressione Enter"
                 className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm"
                 value={tagInput}
                 onChange={(e) => setTagInput(e.target.value)}
                 onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                       e.preventDefault();
                       handleAddTag();
                    }
                 }}
              />
           </div>

           {/* Subtasks Section in Modal */}
           <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center mb-2">
                 <label className="block text-sm font-medium text-gray-700">Subtarefas</label>
                 <button 
                   onClick={handleAddSubtaskInModal}
                   className="text-xs text-purple-600 hover:bg-purple-50 px-2 py-1 rounded flex items-center"
                 >
                   <Plus size={12} className="mr-1" /> Adicionar
                 </button>
              </div>
              <div className="space-y-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                 {currentTask.subtasks?.map((st) => (
                    <div key={st.id} className="flex items-center gap-2">
                       <button 
                         onClick={() => handleUpdateSubtaskInModal(st.id, 'completed', !st.completed)}
                         className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-300 ${st.completed ? 'bg-gray-400 border-gray-400 scale-90' : 'bg-white border-gray-300'}`}
                       >
                          {st.completed && <div className="w-2 h-2 bg-white rounded-full"></div>}
                       </button>
                       <input 
                         type="text" 
                         value={st.title} 
                         onChange={(e) => handleUpdateSubtaskInModal(st.id, 'title', e.target.value)}
                         className={`flex-1 text-xs border-none bg-transparent focus:ring-0 transition-all duration-300 ${st.completed ? 'line-through text-gray-400' : ''}`}
                       />
                       <select 
                          value={st.priority}
                          onChange={(e) => handleUpdateSubtaskInModal(st.id, 'priority', e.target.value)}
                          className="text-[10px] border-none bg-transparent text-gray-500 cursor-pointer"
                       >
                          <option value="p1">P1</option>
                          <option value="p2">P2</option>
                          <option value="p3">P3</option>
                          <option value="p4">P4</option>
                       </select>
                       <button onClick={() => handleRemoveSubtaskInModal(st.id)} className="text-gray-400 hover:text-red-500">
                          <X size={12} />
                       </button>
                    </div>
                 ))}
                 {(!currentTask.subtasks || currentTask.subtasks.length === 0) && (
                    <p className="text-xs text-gray-400 text-center py-2">Nenhuma subtarefa.</p>
                 )}
              </div>
           </div>
           
           <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-2">
              <button 
                onClick={handleDeleteTask}
                className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm flex items-center"
              >
                <Trash2 size={16} className="mr-2" /> Excluir
              </button>
              <div className="flex gap-2">
                 <button onClick={() => setActiveModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                 <button onClick={handleSaveTask} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center">
                    <Save size={16} className="mr-2" /> Salvar
                 </button>
              </div>
           </div>
        </div>
      </Modal>

      {/* Import CSV Modal */}
      <Modal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} title="Importar Tarefas (CSV)">
         <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => importFileRef.current?.click()}>
               <Upload size={32} className="text-gray-400 mb-2" />
               <p className="text-sm font-medium text-gray-700">Clique para selecionar o arquivo CSV</p>
               <p className="text-xs text-gray-500 mt-1">Formato: Título, Descrição, Data, Prioridade, Projeto</p>
               <input 
                 type="file" 
                 accept=".csv" 
                 ref={importFileRef} 
                 className="hidden" 
                 onChange={handleImportCSV} 
               />
            </div>
            
            <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 border border-blue-100">
               <p className="font-bold mb-1 flex items-center"><AlertCircle size={14} className="mr-1"/> Instruções:</p>
               <ul className="list-disc pl-4 space-y-1">
                  <li>O arquivo deve ser .csv separado por vírgulas.</li>
                  <li>Prioridade aceita valores: p1, p2, p3, p4.</li>
                  <li>Data deve estar no formato AAAA-MM-DD.</li>
               </ul>
            </div>

            <div className="flex justify-end pt-2">
               <button onClick={() => setImportModalOpen(false)} className="text-gray-600 text-sm hover:underline">Cancelar</button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default Tasks;