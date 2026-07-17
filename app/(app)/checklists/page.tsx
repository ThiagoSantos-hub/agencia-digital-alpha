'use client'

import { useState, useMemo } from 'react'
import { useChecklists, Checklist } from '@/hooks/useChecklists'
import { 
  Trash2, X, Plus, CheckSquare, Loader2, 
  Edit2, Check, Calendar, Clock, ChevronDown, 
  ChevronUp, LayoutGrid, ListChecks, Sparkles,
  GripHorizontal
} from 'lucide-react'
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  horizontalListSortingStrategy 
} from '@dnd-kit/sortable'
import { SortableChecklistCard } from '@/components/checklists/SortableChecklistCard'

const DIAS_SEMANA = [
  { id: 0, label: 'D' },
  { id: 1, label: 'S' },
  { id: 2, label: 'T' },
  { id: 3, label: 'Q' },
  { id: 4, label: 'Q' },
  { id: 5, label: 'S' },
  { id: 6, label: 'S' },
]

const DIAS_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function ChecklistsPage() {
  const { 
    checklists, 
    loading, 
    createChecklist, 
    updateChecklist,
    deleteChecklist,
    duplicateChecklist,
    addItem, 
    updateItem,
    toggleItem, 
    deleteItem,
    updatePositions,
  } = useChecklists()

  const [isCreating, setIsCreating] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    if (active.id !== over.id) {
      const oldIndex = pendingLists.findIndex(l => l.id === active.id)
      const newIndex = pendingLists.findIndex(l => l.id === over.id)
      const newLists = arrayMove(pendingLists, oldIndex, newIndex)
      
      const positions = newLists.map((list, index) => ({ id: list.id, position: index }))
      await updatePositions('checklist', positions)
    }
  }

  const activeList = activeId ? checklists.find(l => l.id === activeId) : null
  const [newListTitle, setNewListTitle] = useState('')
  const [newListDays, setNewListDays] = useState<number[]>([])
  const [newListItems, setNewListItems] = useState<string[]>([])
  const [currentNewItem, setCurrentNewItem] = useState('')

  const handleCreateList = async () => {
    if (!newListTitle.trim()) return
    const list = await createChecklist(newListTitle, newListDays.length > 0 ? 'daily' : 'once', newListDays)
    if (list && newListItems.length > 0) {
      for (const itemText of newListItems) {
        await addItem(list.id, itemText)
      }
    }
    resetCreateForm()
  }

  const resetCreateForm = () => {
    setNewListTitle('')
    setNewListDays([])
    setNewListItems([])
    setCurrentNewItem('')
    setIsCreating(false)
  }

  const toggleDay = (dayId: number, selected: number[], setSelected: (days: number[]) => void) => {
    if (selected.includes(dayId)) {
      setSelected(selected.filter(d => d !== dayId))
    } else {
      setSelected([...selected, dayId].sort())
    }
  }

  const addLocalItem = () => {
    if (!currentNewItem.trim()) return
    setNewListItems([...newListItems, currentNewItem])
    setCurrentNewItem('')
  }

  const pendingLists = useMemo(() => 
    checklists.filter(l => l.status === 'pending')
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  , [checklists])

  const completedLists = useMemo(() => 
    checklists.filter(l => l.status === 'completed')
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  , [checklists])

  if (loading && checklists.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-text-muted text-xs font-black uppercase tracking-[0.2em]">Sincronizando Alpha...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 min-h-screen bg-background text-text-main selection:bg-cta/30">
      {/* HEADER MINIMALISTA */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-xl font-bold text-text-main uppercase tracking-wider">Checklists</h1>
        
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-cta hover:bg-cta-hover text-white rounded-xl transition-all font-bold uppercase text-[11px] tracking-wider"
          >
            <Plus size={16} />
            Nova Lista
          </button>
        )}
      </div>

      {/* ÁREA DE CRIAÇÃO - MINIMALISTA */}
      {isCreating && (
        <div className="mb-6 bg-surface border border-border rounded-xl p-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold text-text-main uppercase tracking-wider">Novo Checklist</h2>
            <button onClick={resetCreateForm} className="text-text-muted hover:text-text-main transition-all"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="group">
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 group-focus-within:text-primary transition-colors">Título da Rotina</label>
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Ex: Checklist de Tráfego Pago"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Dias de Reset Automático</label>
                <div className="flex justify-between gap-1">
                  {DIAS_SEMANA.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id, newListDays, setNewListDays)}
                      className={`flex-1 rounded-lg text-[10px] font-black transition-all duration-300 border flex items-center justify-center h-8 ${
                        newListDays.includes(day.id)
                          ? 'bg-cta text-white border-primary shadow-sm'
                          : 'bg-background text-text-muted border-border hover:border-primary/50'
                      }`}
                      title={DIAS_LABELS[day.id]}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Tarefas da Lista</label>
              <div className="relative group">
                <input
                  type="text"
                  value={currentNewItem}
                  onChange={(e) => setCurrentNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLocalItem()}
                  placeholder="Pressione Enter para adicionar..."
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary pr-12"
                />
                <button onClick={addLocalItem} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-cta/10 text-primary rounded-lg hover:bg-cta hover:text-white transition-all">
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-2">
                {newListItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 bg-background/50 border border-border rounded-lg group hover:border-border transition-all">
                    <span className="text-xs text-text-muted font-medium">{item}</span>
                    <button onClick={() => setNewListItems(newListItems.filter((_, i) => i !== index))} className="text-text-disabled hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={resetCreateForm} className="text-[9px] font-bold text-text-muted hover:text-text-main uppercase tracking-wider transition-colors">Cancelar</button>
            <button 
              onClick={handleCreateList}
              disabled={!newListTitle.trim() || newListItems.length === 0}
              className="px-5 py-1.5 bg-cta hover:bg-cta-hover disabled:opacity-50 text-white rounded-lg font-bold uppercase text-[9px] tracking-wider transition-all"
            >
              Salvar Lista
            </button>
          </div>
        </div>
      )}

      {/* LAYOUT VERTICAL - PENDENTES EM CIMA, FINALIZADOS EMBAIXO */}
      <div className="flex flex-col gap-16">
        {/* PENDENTES */}
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              <h2 className="text-base font-bold text-text-main uppercase tracking-wider">Rotinas Pendentes</h2>
            </div>
            <span className="text-[10px] font-bold text-amber-500/40 uppercase tracking-widest">{pendingLists.length} Ativas</span>
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pendingLists.map(l => l.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
                {pendingLists.map(list => (
                  <div key={list.id} className="w-[260px] shrink-0">
                    <SortableChecklistCard 
                      list={list} 
                      updateChecklist={updateChecklist}
                      deleteChecklist={deleteChecklist}
                      duplicateChecklist={duplicateChecklist}
                      addItem={addItem}
                      updateItem={updateItem}
                      toggleItem={toggleItem}
                      deleteItem={deleteItem}
                      updatePositions={updatePositions}
                    />
                  </div>
                ))}
                {pendingLists.length === 0 && (
                  <div className="w-full py-16 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-text-disabled">
                    <ListChecks size={32} className="mb-3 opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Tudo em ordem por aqui</p>
                  </div>
                )}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: { opacity: '0.5' },
                },
              }),
            }}>
              {activeList ? (
                <div className="w-[350px]">
                  <SortableChecklistCard 
                    list={activeList} 
                    updateChecklist={() => {}}
                    deleteChecklist={() => {}}
                    addItem={() => {}}
                    updateItem={() => {}}
                    toggleItem={() => {}}
                    deleteItem={() => {}}
                    updatePositions={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>

        {/* REALIZADOS */}
        <section className="pt-8 border-t border-border">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-cta shadow-sm" />
              <h2 className="text-base font-bold text-text-main uppercase tracking-wider">Concluídas</h2>
            </div>
            <span className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">{completedLists.length} Feitas</span>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {completedLists.map(list => (
              <div key={list.id} className="w-[260px] shrink-0">
                <SortableChecklistCard 
                  list={list} 
                  updateChecklist={updateChecklist}
                  deleteChecklist={deleteChecklist}
                  duplicateChecklist={duplicateChecklist}
                  addItem={addItem}
                  updateItem={updateItem}
                  toggleItem={toggleItem}
                  deleteItem={deleteItem}
                  updatePositions={updatePositions}
                />
              </div>
            ))}
            {completedLists.length === 0 && (
              <div className="w-full py-10 flex flex-col items-center justify-center text-text-disabled">
                <p className="text-[10px] font-bold uppercase tracking-widest italic">Nenhuma lista finalizada ainda</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ChecklistCard({ list, updateChecklist, deleteChecklist, addItem, updateItem, toggleItem, deleteItem }: {
  list: Checklist,
  updateChecklist: any,
  deleteChecklist: any,
  addItem: any,
  updateItem: any,
  toggleItem: any,
  deleteItem: any
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(list.title)
  const [days, setDays] = useState<number[]>(list.recurrence_days || [])
  const [newItemText, setNewItemText] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemText, setEditingItemText] = useState('')

  const items = list.checklist_items || []
  const completedCount = items.filter((i: any) => i.completed).length
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0

  return (
    <div className={`bg-surface border rounded-xl overflow-hidden transition-all duration-300 flex flex-col ${
      list.status === 'completed' 
        ? 'border-primary/10 opacity-50' 
        : 'border-border hover:border-border'
    }`}>
      {/* BARRA DE PROGRESSO SIMPLES */}
      <div className="h-0.5 bg-hover-bg w-full">
        <div 
          className="h-full bg-cta transition-all duration-500" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-4 pr-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-primary/40 rounded-xl px-4 py-2 text-sm text-text-main focus:outline-none"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1">
                  {DIAS_SEMANA.map(day => (
                    <button
                      key={day.id}
                      onClick={() => {
                        if (days.includes(day.id)) setDays(days.filter(d => d !== day.id))
                        else setDays([...days, day.id].sort())
                      }}
                      className={`w-7 h-7 rounded-lg text-[10px] font-black border transition-all ${
                        days.includes(day.id) ? 'bg-cta text-white border-primary' : 'bg-background text-text-disabled border-border'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      await updateChecklist(list.id, { title, recurrence_days: days, recurrence: days.length > 0 ? 'daily' : 'once' });
                      setIsEditing(false);
                    }} 
                    className="px-4 py-1.5 bg-cta text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-primary/20"
                  >
                    Salvar
                  </button>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 bg-hover-bg text-text-muted text-[10px] font-black uppercase rounded-lg">Sair</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 group/title">
                  <h3 className="font-bold text-text-main text-sm tracking-tight truncate uppercase">{list.title}</h3>
                  <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover/title:opacity-100 text-text-disabled hover:text-primary transition-all">
                    <Edit2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {list.recurrence_days?.length > 0 ? (
                    <div className="flex gap-1">
                      {list.recurrence_days.map((d: number) => (
                        <span key={d} className="text-[8px] font-black text-primary uppercase bg-cta/10 px-1.5 py-0.5 rounded-md border border-primary/10">
                          {DIAS_SEMANA.find(day => day.id === d)?.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[8px] font-black text-text-disabled uppercase tracking-widest">Tarefa Única</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => confirm('Remover esta rotina permanentemente?') && deleteChecklist(list.id)}
            className="p-2 text-text-disabled hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* LISTA DE ITENS ESTILIZADA */}
        <div className="space-y-3 mt-4">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 group/item">
              <div 
                onClick={() => toggleItem(item.id, item.completed)}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-300 ${
                  item.completed 
                    ? 'bg-cta border-primary shadow-sm' 
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                {item.completed && <Check size={14} className="text-white stroke-[4px]" />}
              </div>
              
              {editingItemId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingItemText}
                    onChange={(e) => setEditingItemText(e.target.value)}
                    className="flex-1 bg-background border border-primary/30 rounded-lg px-3 py-1 text-xs text-text-main outline-none"
                    autoFocus
                    onBlur={() => setEditingItemId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateItem(item.id, editingItemText);
                        setEditingItemId(null);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span 
                    onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }}
                    className={`text-[11px] font-medium cursor-pointer transition-all truncate pr-2 ${
                      item.completed ? 'text-text-disabled line-through' : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    {item.text}
                  </span>
                  <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover/item:opacity-100 text-text-disabled hover:text-red-500 transition-all">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* ADD ITEM INLINE */}
          <div className="flex items-center gap-4 pt-4 mt-2 border-t border-border">
            <div className="w-6 h-6 flex items-center justify-center text-text-disabled">
              <Plus size={16} />
            </div>
            <input
              type="text"
              placeholder="Nova tarefa..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newItemText.trim()) {
                  await addItem(list.id, newItemText);
                  setNewItemText('');
                }
              }}
              className="flex-1 bg-transparent text-xs font-bold text-text-disabled focus:outline-none focus:text-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* FOOTER DO CARD */}
      <div className="px-6 py-3 bg-surface border-t border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Clock size={10} className="text-text-disabled" />
          <span className="text-[8px] font-bold text-text-disabled uppercase tracking-widest">
            {list.status === 'completed' ? 'Finalizado' : 'Em Progresso'}
          </span>
        </div>
      </div>
    </div>
  )
}
