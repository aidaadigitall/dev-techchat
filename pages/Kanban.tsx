import React, { useState, useEffect, useRef } from 'react';
import { KanbanColumn, Pipeline, KanbanCard } from '../types';
import { api } from '../services/api';
import { Plus, MoreHorizontal, DollarSign, Filter, Search, RotateCw, Clock, Save, X } from 'lucide-react';
import Modal from '../components/Modal';

const Kanban: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Drag and Drop State
  const [draggedCard, setDraggedCard] = useState<{cardId: string, sourceColId: string} | null>(null);

  // Edit Card State
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [editForm, setEditForm] = useState<{title: string, value: string}>({ title: '', value: '' });

  // Scroll Drag State
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    loadPipelines();
  }, []);

  const loadPipelines = async () => {
    setLoading(true);
    const data = await api.crm.getPipelines();
    setPipelines(data);
    if (data.length > 0) {
      setSelectedPipelineId(data[0].id);
      setColumns(data[0].columns);
    }
    setLoading(false);
  };

  const handlePipelineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pipeId = e.target.value;
    setSelectedPipelineId(pipeId);
    const pipe = pipelines.find(p => p.id === pipeId);
    if (pipe) setColumns(pipe.columns);
  };

  const calculateTotal = (column: KanbanColumn) => {
    // Calculate total based on ALL cards in column, not just filtered ones, typically. 
    // Or filtered? Let's do filtered to be helpful.
    const relevantCards = getFilteredCards(column.cards);
    return relevantCards.reduce((acc, card) => acc + card.value, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getFilteredCards = (cards: KanbanCard[]) => {
    return cards.filter(card => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = card.contactName.toLowerCase().includes(term) || 
                            card.title.toLowerCase().includes(term) ||
                            card.value.toString().includes(term);
      const matchesPriority = activeFilter === 'all' || card.priority === activeFilter;
      return matchesSearch && matchesPriority;
    });
  };

  // --- Drag & Drop Handlers (Card) ---
  const handleDragStart = (e: React.DragEvent, cardId: string, sourceColId: string) => {
    setDraggedCard({ cardId, sourceColId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, destColId: string) => {
    e.preventDefault();
    
    if (!draggedCard) return;
    const { cardId, sourceColId } = draggedCard;

    if (sourceColId === destColId) {
      setDraggedCard(null);
      return;
    }

    // Optimistic UI Update
    const newColumns = columns.map(col => {
      if (col.id === sourceColId) {
        return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
      }
      if (col.id === destColId) {
        const sourceColumn = columns.find(c => c.id === sourceColId);
        const cardToMove = sourceColumn?.cards.find(c => c.id === cardId);
        if (cardToMove) {
           return { ...col, cards: [...col.cards, cardToMove] };
        }
      }
      return col;
    });

    setColumns(newColumns);
    setDraggedCard(null);

    // Call API
    await api.crm.moveCard(cardId, sourceColId, destColId);
  };

  // --- Scroll Drag Handlers (Board) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    // Don't trigger drag if clicking on a card or button
    if ((e.target as HTMLElement).closest('.card-draggable') || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    
    setIsDraggingBoard(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDraggingBoard(false);
  const handleMouseUp = () => setIsDraggingBoard(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingBoard || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // --- Edit Handlers ---
  const handleCardDoubleClick = (card: KanbanCard) => {
    setEditingCard(card);
    setEditForm({ title: card.contactName, value: card.value.toString() });
  };

  const saveCardChanges = () => {
    if (!editingCard) return;
    
    const newColumns = columns.map(col => ({
      ...col,
      cards: col.cards.map(c => 
        c.id === editingCard.id 
          ? { ...c, contactName: editForm.title, value: parseFloat(editForm.value) || 0 } 
          : c
      )
    }));

    setColumns(newColumns);
    setEditingCard(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden" onClick={() => setShowFilterMenu(false)}>
      {/* Header & Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex flex-wrap gap-4 justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <h1 className="text-xl font-bold text-gray-800">Kanban</h1>
          </div>
          <div className="relative">
             <select 
               value={selectedPipelineId} 
               onChange={handlePipelineChange}
               className="pl-3 pr-8 py-1.5 border border-purple-200 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer"
             >
               {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
             <div className="absolute right-2 top-2 text-purple-600 pointer-events-none text-xs">▼</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="relative">
             <input 
               type="text" 
               placeholder="Buscar contato ou valor..." 
               className="border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-sm w-48 focus:outline-none focus:border-purple-500 bg-white" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             <Search size={14} className="absolute right-2.5 top-2.5 text-gray-400" />
           </div>
           
           <div className="relative">
             <button 
               className={`p-2 rounded-lg border border-gray-300 bg-white ${activeFilter !== 'all' ? 'text-purple-600 border-purple-200 bg-purple-50' : 'text-gray-600 hover:bg-gray-100'}`}
               onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); }}
             >
               <Filter size={18} />
             </button>
             {showFilterMenu && (
               <div className="absolute right-0 top-10 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
                 <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase bg-gray-50 border-b border-gray-100">Prioridade</div>
                 <button onClick={() => setActiveFilter('all')} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${activeFilter === 'all' ? 'text-purple-600 font-bold' : 'text-gray-700'}`}>Todas</button>
                 <button onClick={() => setActiveFilter('high')} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${activeFilter === 'high' ? 'text-red-600 font-bold' : 'text-gray-700'}`}>Alta</button>
                 <button onClick={() => setActiveFilter('medium')} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${activeFilter === 'medium' ? 'text-orange-600 font-bold' : 'text-gray-700'}`}>Média</button>
                 <button onClick={() => setActiveFilter('low')} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${activeFilter === 'low' ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>Baixa</button>
               </div>
             )}
           </div>

           <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-300 bg-white" onClick={loadPipelines}><RotateCw size={18} /></button>
           <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors shadow-sm">
             <Plus size={18} className="mr-2" /> Novo Negócio
           </button>
        </div>
      </div>

      {/* Board */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-auto overflow-y-hidden p-6 bg-gray-50/50 ${isDraggingBoard ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-400">Carregando funil...</div>
        ) : (
          <div className="flex h-full space-x-4 pointer-events-none">
            {columns.map((column) => {
              const filteredCards = getFilteredCards(column.cards);
              return (
                <div 
                  key={column.id} 
                  className="w-80 flex flex-col flex-shrink-0 bg-gray-100/50 rounded-xl max-h-full border border-gray-200 transition-colors pointer-events-auto"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  {/* Column Header */}
                  <div className={`p-3 border-t-[3px] ${column.color} bg-white rounded-t-xl shadow-sm border-b border-gray-100`}>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-gray-800 text-sm">{column.title}</h3>
                      <div className="flex items-center gap-1">
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">{filteredCards.length}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{calculateTotal(column)}</span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="p-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar min-h-[100px]">
                    {filteredCards.map((card) => (
                      <div 
                        key={card.id} 
                        className={`card-draggable bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab hover:shadow-md transition-all group hover:border-purple-200 ${draggedCard?.cardId === card.id ? 'opacity-50 border-purple-400' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card.id, column.id)}
                        onDoubleClick={() => handleCardDoubleClick(card)}
                      >
                        <div className="flex justify-between items-start mb-2">
                           <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                             {card.contactName.charAt(0)}
                           </div>
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button className="text-gray-300 hover:text-green-500"><div className="w-4 h-4 border rounded hover:bg-green-50">👍</div></button>
                             <button className="text-gray-300 hover:text-red-500"><div className="w-4 h-4 border rounded hover:bg-red-50">👎</div></button>
                           </div>
                        </div>
                        
                        <h4 className="font-semibold text-gray-800 text-sm mb-0.5">{card.contactName}</h4>
                        <p className="text-xs text-gray-500 mb-2 truncate">{card.contactName}</p> {/* Usually phone number here */}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                           {/* Prominent Value Display */}
                           <div className="flex items-center text-green-700 font-extrabold text-sm">
                             {card.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </div>
                           <span className="text-[10px] text-gray-400 flex items-center">
                              <Clock size={10} className="mr-1" /> hoje
                           </span>
                        </div>
                      </div>
                    ))}
                    
                    {column.cards.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-300 border-2 border-dashed border-gray-200 rounded-lg">
                        <div className="w-10 h-10 mb-2 opacity-20 bg-gray-400 rounded-lg"></div>
                        <span className="text-xs">Arraste para cá</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Card Modal */}
      <Modal 
        isOpen={!!editingCard} 
        onClose={() => setEditingCard(null)} 
        title="Editar Oportunidade"
        footer={
           <div className="flex justify-end gap-2 w-full">
              <button onClick={() => setEditingCard(null)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveCardChanges} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center">
                <Save size={16} className="mr-2" /> Salvar
              </button>
           </div>
        }
      >
        <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Título / Contato</label>
             <input 
               type="text" 
               value={editForm.title}
               onChange={(e) => setEditForm({...editForm, title: e.target.value})}
               className="w-full border border-gray-300 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
             />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Negócio (R$)</label>
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">R$</span>
                </div>
                <input 
                  type="number" 
                  value={editForm.value}
                  onChange={(e) => setEditForm({...editForm, value: e.target.value})}
                  className="w-full border border-gray-300 rounded-md p-2 pl-10 focus:ring-purple-500 focus:border-purple-500 font-bold text-gray-800 bg-white"
                />
             </div>
           </div>
           <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">
             Dica: Você pode arrastar este card para outras colunas para mudar o status da negociação.
           </p>
        </div>
      </Modal>
    </div>
  );
};

export default Kanban;