
import React, { useState, useEffect, useRef } from 'react';
import { 
  Inbox, Calendar, CalendarDays, Plus, 
  CheckCircle2, Trash2, X, Sparkles, BrainCircuit
} from 'lucide-react';
import { Task } from '../types';
import { api } from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

interface Project {
  id: string;
  name: string;
  color: string;
}

const Tasks: React.FC = () => {
  const { addToast } = useToast();
  
  // --- Estados de Dados (Local) ---
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

  const [activeView, setActiveView] = useState<string>('inbox');
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [quickAddValue, setQuickAddValue] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState<{sectionId?: string, visible: boolean}>({ visible: false });
  
  // AI Modal States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    // Fetch from local mock API
    const data = await api.tasks.list();
    setTasks(data);
    setLoading(false);
  };

  // --- Lógica AI (Produtividade) ---
  const handleRunAI = async () => {
      if (tasks.length === 0) {
          addToast("Adicione tarefas antes de pedir análise.", "warning");
          return;
      }

      setShowAIModal(true);
      setAiLoading(true);
      setAiAnalysis('');
      
      try {
          // Send Local Tasks to Backend for analysis
          // We map to a simpler structure to save tokens
          const tasksSummary = tasks.map(t => ({
              title: t.title,
              priority: t.priority,
              completed: t.completed,
              dueDate: t.dueDate
          }));

          // Call API with contextType 'tasks_analysis'
          const insight = await api.ai.generateInsight(tasksSummary, 'tasks_analysis');
          setAiAnalysis(insight);
      } catch (e) {
          console.error(e);
          setAiAnalysis("Não foi possível gerar a análise. Verifique se a API Key do Gemini está configurada em Configurações.");
      } finally {
          setAiLoading(false);
      }
  };

  // --- CRUD Local ---
  const handleQuickAdd = async () => {
    if (!quickAddValue.trim()) return;
    
    const newTask = {
      title: quickAddValue,
      projectId: activeView === 'today' || activeView === 'upcoming' ? 'inbox' : activeView,
      priority: 'p4',
      completed: false,
      dueDate: activeView === 'today' ? new Date().toISOString().split('T')[0] : undefined
    };

    await api.tasks.create(newTask);
    setQuickAddValue('');
    setShowQuickAdd({ visible: false });
    loadTasks();
  };

  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    await api.tasks.update(taskId, { completed: !currentStatus });
    loadTasks();
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await api.tasks.delete(taskId);
      loadTasks();
  };

  // --- Helpers ---
  const getFilteredTasks = () => {
      let filtered = tasks; 
      if(activeView === 'inbox') filtered = filtered.filter(t => t.projectId === 'inbox' && !t.completed);
      else if(activeView === 'today') filtered = filtered.filter(t => !t.completed && t.dueDate === new Date().toISOString().split('T')[0]);
      else if(activeView === 'upcoming') filtered = filtered.filter(t => !t.completed && t.dueDate && t.dueDate > new Date().toISOString().split('T')[0]);
      else filtered = filtered.filter(t => t.projectId === activeView && !t.completed);
      return filtered;
  };
  
  const finalFilteredTasks = getFilteredTasks();
  const currentProjectName = () => projects.find(p => p.id === activeView)?.name || 'Lista';

  // Theme helpers
  const theme = {
      bg: isDark ? 'bg-[#1e1e1e]' : 'bg-[#fafafa]',
      sidebar: isDark ? 'bg-[#252526] border-[#333]' : 'bg-[#f7f7f7] border-gray-200',
      text: isDark ? 'text-gray-200' : 'text-gray-800',
      activeItem: isDark ? 'bg-[#37373d] text-white' : 'bg-white text-gray-900 shadow-sm',
      card: isDark ? 'bg-[#252526] border-[#333] hover:border-[#444]' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm',
      header: isDark ? 'bg-[#1e1e1e] border-[#333]' : 'bg-white border-gray-200',
  };

  return (
    <div className={`flex h-full ${theme.bg} ${theme.text} overflow-hidden font-sans transition-colors duration-300`}>
      <aside className={`w-64 border-r flex-col pt-4 hidden md:flex ${theme.sidebar}`}>
         <div className="px-4 mb-4">
             <div className="flex items-center gap-2 mb-6 p-2">
                 <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">T</div>
                 <div><p className="text-sm font-bold">Minhas Tarefas</p><p className="text-xs opacity-60">Local</p></div>
             </div>
             
             {['inbox', 'today', 'upcoming'].map(id => (
                 <div key={id} onClick={() => setActiveView(id)} className={`p-2 rounded-lg cursor-pointer flex items-center gap-3 ${activeView === id ? theme.activeItem : ''}`}>
                     {id === 'inbox' && <Inbox size={18}/>}
                     {id === 'today' && <CalendarDays size={18}/>}
                     {id === 'upcoming' && <Calendar size={18}/>}
                     <span className="capitalize">{id === 'today' ? 'Hoje' : id === 'upcoming' ? 'Em Breve' : 'Entrada'}</span>
                 </div>
             ))}
         </div>
      </aside>

      <main className={`flex-1 flex flex-col h-full overflow-hidden ${theme.bg}`}>
         <header className={`h-16 border-b flex items-center justify-between px-6 shrink-0 ${theme.header}`}>
            <h1 className="text-xl font-bold">{currentProjectName()}</h1>
            <button 
                 onClick={handleRunAI}
                 className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow hover:bg-purple-700 transition-colors"
            >
                  <Sparkles size={16} /> IA Analista
            </button>
         </header>

         <div className="p-6 overflow-y-auto">
             <div className="space-y-2">
                 {finalFilteredTasks.map(t => (
                     <div key={t.id} className={`p-3 border rounded-lg flex items-center justify-between gap-3 group ${theme.card}`}>
                         <div className="flex items-center gap-3">
                            <button onClick={() => toggleTaskCompletion(t.id, t.completed)} className={`w-5 h-5 border rounded-full ${t.completed ? 'bg-green-500 border-green-500' : 'hover:bg-gray-100'}`}></button>
                            <span className={t.completed ? 'line-through opacity-50' : ''}>{t.title}</span>
                         </div>
                         <button onClick={(e) => handleDeleteTask(t.id, e)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Trash2 size={16} />
                         </button>
                     </div>
                 ))}
                 
                 <div className="mt-4">
                     <button onClick={() => setShowQuickAdd({visible: true})} className="flex items-center gap-2 text-gray-500 hover:text-purple-600">
                         <Plus size={16} /> Adicionar tarefa
                     </button>
                     {showQuickAdd.visible && (
                         <input 
                           autoFocus 
                           className="w-full border p-2 rounded mt-2 bg-transparent outline-none"
                           placeholder="Nome da tarefa... (Enter para salvar)"
                           value={quickAddValue} 
                           onChange={e => setQuickAddValue(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                         />
                     )}
                 </div>
             </div>
         </div>
      </main>

      {/* IA ANALYST MODAL */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1e1e24] w-full max-w-md rounded-2xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col animate-scaleIn">
                <div className="flex justify-between items-center p-4 border-b border-gray-800">
                    <h3 className="text-white font-semibold text-lg flex items-center">
                        IA Analista de Produtividade
                    </h3>
                    <button onClick={() => setShowAIModal(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 text-gray-300 min-h-[300px] flex flex-col">
                    {aiLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                                <BrainCircuit className="absolute inset-0 m-auto text-purple-500" size={24} />
                            </div>
                            <p className="text-sm font-medium animate-pulse text-purple-400">Analisando suas tarefas...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="border border-purple-500/30 bg-purple-500/10 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-purple-600 rounded-full shadow-lg shadow-purple-900/50">
                                        <BrainCircuit size={20} className="text-white" />
                                    </div>
                                    <span className="text-purple-300 font-bold text-sm uppercase tracking-wide">Insight Gerado</span>
                                </div>
                                <div className="text-sm leading-relaxed text-gray-200 markdown-content whitespace-pre-line">
                                    {aiAnalysis || "Nenhuma resposta recebida do backend."}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col items-center justify-center border border-gray-700">
                                    <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Pendentes</span>
                                    <span className="text-3xl font-bold text-white">{tasks.filter(t => !t.completed).length}</span>
                                </div>
                                <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col items-center justify-center border border-gray-700">
                                    <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">Concluídas</span>
                                    <span className="text-3xl font-bold text-green-400">
                                        {tasks.filter(t => t.completed).length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-900/50 border-t border-gray-800 flex justify-end">
                    <button 
                        onClick={() => setShowAIModal(false)}
                        className="bg-[#1e1e24] border border-gray-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
