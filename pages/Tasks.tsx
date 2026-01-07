
import React, { useState, useEffect } from 'react';
import { 
  Inbox, Calendar, CalendarDays, Plus, 
  Trash2, X, Sparkles, Check, ChevronDown, 
  Hash, Flag, MoreHorizontal, GripVertical
} from 'lucide-react';
import { Task, TaskPriority } from '../types';
import { api } from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

type TaskView = 'inbox' | 'today' | 'upcoming';

const Tasks: React.FC = () => {
  const { addToast } = useToast();
  
  // Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeView, setActiveView] = useState<TaskView>('inbox');
  const [loading, setLoading] = useState(false);
  
  // UI States
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const data = await api.tasks.list();
    setTasks(data);
    setLoading(false);
  };

  // --- Filtering Logic ---
  const getFilteredTasks = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      
      return tasks.filter(t => {
          if (t.completed) return false; // Hide completed by default in Todoist style
          
          if (activeView === 'inbox') return t.projectId === 'inbox';
          
          if (activeView === 'today') {
              return t.dueDate === todayStr;
          }
          
          if (activeView === 'upcoming') {
              return t.dueDate && t.dueDate > todayStr;
          }
          
          return true;
      });
  };

  // --- Actions ---
  const handleQuickAdd = async () => {
    if (!quickAddValue.trim()) return;
    
    let dueDate = undefined;
    if (activeView === 'today') dueDate = new Date().toISOString().split('T')[0];

    const newTask = {
      title: quickAddValue,
      projectId: 'inbox',
      priority: 'p4',
      completed: false,
      dueDate: dueDate
    };

    await api.tasks.create(newTask);
    setQuickAddValue('');
    // Keep focus or keep open? Todoist keeps it open to add more
    loadTasks();
  };

  const toggleTaskCompletion = async (taskId: string) => {
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    
    // API Call
    const task = tasks.find(t => t.id === taskId);
    if(task) {
        await api.tasks.update(taskId, { completed: !task.completed });
        addToast('Tarefa concluída', 'success');
        // Delay reload to let animation finish if we were removing it
        setTimeout(loadTasks, 500); 
    }
  };

  const handleDeleteTask = async (taskId: string) => {
      if(confirm('Excluir esta tarefa?')) {
          await api.tasks.delete(taskId);
          setTasks(prev => prev.filter(t => t.id !== taskId));
      }
  };

  const handleRunAI = async () => {
      if (tasks.length === 0) {
          addToast("Adicione tarefas antes de pedir análise.", "warning");
          return;
      }
      setAiModalOpen(true);
      setAiLoading(true);
      setAiAnalysis('');
      
      try {
          const tasksSummary = tasks.map(t => ({
              title: t.title,
              priority: t.priority,
              completed: t.completed,
              dueDate: t.dueDate
          }));
          const insight = await api.ai.generateInsight(tasksSummary, 'tasks_analysis');
          setAiAnalysis(insight);
      } catch (e) {
          setAiAnalysis("Erro ao conectar com a IA. Verifique sua API Key.");
      } finally {
          setAiLoading(false);
      }
  };

  const getViewTitle = () => {
      switch(activeView) {
          case 'inbox': return 'Entrada';
          case 'today': return 'Hoje';
          case 'upcoming': return 'Em Breve';
      }
  };

  return (
    <div className="flex h-full bg-white font-sans text-gray-800">
      
      {/* Sidebar - Todoist Style */}
      <aside className="w-72 bg-[#fafafa] flex flex-col h-full border-r border-gray-200 pt-8 px-2 hidden md:flex">
         <div className="space-y-1">
             <button 
                onClick={() => setActiveView('inbox')}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-sm ${activeView === 'inbox' ? 'bg-[#ffefe5] text-[#db4c3f]' : 'hover:bg-gray-100 text-gray-700'}`}
             >
                 <Inbox size={18} className={`mr-3 ${activeView === 'inbox' ? 'text-[#db4c3f]' : 'text-gray-500'}`} /> 
                 Entrada
             </button>
             <button 
                onClick={() => setActiveView('today')}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-sm ${activeView === 'today' ? 'bg-[#ffefe5] text-[#db4c3f]' : 'hover:bg-gray-100 text-gray-700'}`}
             >
                 <CalendarDays size={18} className={`mr-3 ${activeView === 'today' ? 'text-[#058527]' : 'text-gray-500'}`} /> 
                 Hoje
             </button>
             <button 
                onClick={() => setActiveView('upcoming')}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-sm ${activeView === 'upcoming' ? 'bg-[#ffefe5] text-[#db4c3f]' : 'hover:bg-gray-100 text-gray-700'}`}
             >
                 <Calendar size={18} className={`mr-3 ${activeView === 'upcoming' ? 'text-[#692fc2]' : 'text-gray-500'}`} /> 
                 Em Breve
             </button>
         </div>

         <div className="mt-8 px-3">
             <div className="flex items-center justify-between text-gray-500 mb-2 group cursor-pointer">
                 <span className="text-xs font-bold font-semibold hover:text-gray-700">Meus Projetos</span>
                 <Plus size={16} className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded p-0.5" />
             </div>
             <div className="space-y-1">
                 <div className="flex items-center px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded cursor-pointer">
                     <span className="w-2.5 h-2.5 rounded-full bg-red-400 mr-3"></span> Marketing
                 </div>
                 <div className="flex items-center px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded cursor-pointer">
                     <span className="w-2.5 h-2.5 rounded-full bg-blue-400 mr-3"></span> Financeiro
                 </div>
                 <div className="flex items-center px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded cursor-pointer">
                     <span className="w-2.5 h-2.5 rounded-full bg-green-400 mr-3"></span> Pessoal
                 </div>
             </div>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden max-w-4xl mx-auto w-full">
         {/* Header */}
         <header className="px-8 py-6 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
             <div>
                 <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                     {getViewTitle()}
                     {activeView === 'today' && <span className="ml-2 text-xs font-normal text-gray-500">{new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short'})}</span>}
                 </h1>
             </div>
             <div className="flex items-center space-x-2">
                 <button 
                    onClick={handleRunAI}
                    className="flex items-center text-sm font-medium text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                 >
                     <Sparkles size={16} className="mr-2" /> IA Analista
                 </button>
             </div>
         </header>

         {/* Task List */}
         <div className="flex-1 overflow-y-auto px-8 pb-20 custom-scrollbar">
             <div className="space-y-1">
                 {getFilteredTasks().map(task => (
                     <div key={task.id} className="group flex items-start py-3 border-b border-gray-100 animate-fadeIn hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors">
                         <div className="pt-1 mr-3">
                             <button 
                                onClick={() => toggleTaskCompletion(task.id)}
                                className={`w-5 h-5 rounded-full border border-gray-400 hover:border-gray-500 flex items-center justify-center group-hover:bg-gray-100 transition-all ${task.priority === 'p1' ? 'border-red-500 bg-red-50' : ''}`}
                             >
                                 <Check size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 pointer-events-none" />
                             </button>
                         </div>
                         <div className="flex-1 min-w-0 cursor-pointer">
                             <p className="text-sm text-gray-800 leading-snug">{task.title}</p>
                             {task.dueDate && (
                                 <p className="text-xs text-gray-500 mt-1 flex items-center">
                                     <Calendar size={10} className="mr-1" />
                                     {new Date(task.dueDate).toLocaleDateString()}
                                 </p>
                             )}
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 pl-2">
                             <button className="p-1 text-gray-400 hover:text-gray-600 rounded"><EditIcon size={16}/></button>
                             <button onClick={() => handleDeleteTask(task.id)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={16}/></button>
                         </div>
                     </div>
                 ))}

                 {/* Quick Add Interface */}
                 {isQuickAddOpen ? (
                     <div className="border border-gray-200 rounded-lg p-3 mt-4 shadow-sm bg-white animate-scaleIn">
                         <input 
                           autoFocus
                           type="text" 
                           className="w-full text-sm font-medium placeholder-gray-400 outline-none mb-2"
                           placeholder="Nome da tarefa"
                           value={quickAddValue}
                           onChange={e => setQuickAddValue(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                         />
                         <div className="flex justify-between items-center pt-2">
                             <div className="flex space-x-2">
                                 <button className="flex items-center px-2 py-1 rounded border border-gray-200 text-xs text-gray-500 hover:bg-gray-50">
                                     <Calendar size={12} className="mr-1"/> Data
                                 </button>
                                 <button className="flex items-center px-2 py-1 rounded border border-gray-200 text-xs text-gray-500 hover:bg-gray-50">
                                     <Flag size={12} className="mr-1"/> Prioridade
                                 </button>
                             </div>
                             <div className="flex space-x-2">
                                 <button 
                                    onClick={() => setIsQuickAddOpen(false)}
                                    className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200"
                                 >
                                     Cancelar
                                 </button>
                                 <button 
                                    onClick={handleQuickAdd}
                                    disabled={!quickAddValue.trim()}
                                    className="px-3 py-1.5 rounded bg-[#db4c3f] text-white text-xs font-bold hover:bg-[#b03d32] disabled:opacity-50"
                                 >
                                     Adicionar tarefa
                                 </button>
                             </div>
                         </div>
                     </div>
                 ) : (
                     <button 
                        onClick={() => setIsQuickAddOpen(true)}
                        className="group flex items-center py-2 mt-2 text-gray-500 hover:text-[#db4c3f] transition-colors"
                     >
                         <div className="w-5 h-5 rounded-full flex items-center justify-center mr-3 text-[#db4c3f] group-hover:bg-[#ffefe5]">
                             <Plus size={16} />
                         </div>
                         <span className="text-sm">Adicionar tarefa</span>
                     </button>
                 )}
             </div>
         </div>
      </main>

      {/* AI Modal */}
      <Modal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} title="Consultoria de Produtividade" size="lg">
          <div className="min-h-[200px]">
              {aiLoading ? (
                  <div className="flex flex-col items-center justify-center h-40 space-y-3">
                      <Sparkles className="animate-spin text-purple-600" size={32} />
                      <p className="text-sm text-gray-500">Analisando sua lista de tarefas...</p>
                  </div>
              ) : (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {aiAnalysis || "Nenhuma análise gerada."}
                  </div>
              )}
              <div className="mt-4 flex justify-end">
                  <button onClick={() => setAiModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-700">Fechar</button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

// Helper Icon
const EditIcon = ({size}: {size:number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);

export default Tasks;
