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
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import dynamic from 'next/dynamic'

const SortableChecklistCard = dynamic(() => import('@/components/checklists/SortableChecklistCard').then(mod => mod.SortableChecklistCard), {
  loading: () => <div className="w-[260px] h-[400px] bg-gray-100 rounded-2xl animate-pulse" />
})

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
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#1A56DB] animate-spin" />
          <p className="text-[#64748B] text-xs font-semibold uppercase tracking-[0.2em]">Sincronizando Alpha...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {/* HEADER MINIMALISTA */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-xl font-semibold text-[#1E293B] uppercase tracking-wider">Checklists</h1>
        
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl transition-all font-semibold uppercase text-[11px] tracking-wider shadow-sm"
          >
            <Plus size={16} />
            Nova Lista
          </button>
        )}
      </div>

      {/* ÁREA DE CRIAÇÃO - MINIMALISTA */}
      {isCreating && (
        <div className="mb-6 bg-white border border-[#E2E8F0] rounded-2xl p-4 animate-in fade-in duration-300 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-semibold text-[#1E293B] uppercase tracking-wider">Novo Checklist</h2>
            <button onClick={resetCreateForm} className="text-[#64748B] hover:text-[#1E293B] transition-all"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="group">
                <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.2em] mb-2 group-focus-within:text-[#1A56DB] transition-colors">Título da Rotina</label>
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Ex: Checklist de Tráfego Pago"
                  className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/10 transition-all text-[#1E293B]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.2em] mb-2">Dias de Reset Automático</label>
                <div className="flex justify-between gap-1">
                  {DIAS_SEMANA.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id, newListDays, setNewListDays)}
                      className={`flex-1 rounded-lg text-[10px] font-semibold transition-all duration-300 border flex items-center justify-center h-8 ${
                        newListDays.includes(day.id)
                          ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-sm'
                          : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#94A3B8]'
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
              <label className="block text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.2em]">Tarefas da Lista</label>
              <div className="relative group">
                <input
                  type="text"
                  value={currentNewItem}
                  onChange={(e) => setCurrentNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLocalItem()}
                  placeholder="Pressione Enter para adicionar..."
                  className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-[#1A56DB] pr-12 text-[#1E293B]"
                />
                <button onClick={addLocalItem} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#EFF6FF] text-[#1A56DB] rounded-lg hover:bg-[#1A56DB] hover:text-white transition-all">
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-2">
                {newListItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg group hover:border-[#94A3B8] transition-all">
                    <span className="text-xs text-[#64748B] font-medium">{item}</span>
                    <button onClick={() => setNewListItems(newListItems.filter((_, i) => i !== index))} className="text-[#94A3B8] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <button onClick={resetCreateForm} className="text-[9px] font-semibold text-[#64748B] hover:text-[#1E293B] uppercase tracking-wider transition-colors">Cancelar</button>
            <button 
              onClick={handleCreateList}
              disabled={!newListTitle.trim() || newListItems.length === 0}
              className="px-5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white rounded-lg font-semibold uppercase text-[9px] tracking-wider transition-all"
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
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />
              <h2 className="text-base font-semibold text-[#1E293B] uppercase tracking-wider">Rotinas Pendentes</h2>
            </div>
            <span className="text-[10px] font-semibold text-amber-500/60 uppercase tracking-widest">{pendingLists.length} Ativas</span>
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
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
                <div className="w-full py-16 border border-dashed border-[#E2E8F0] rounded-2xl flex flex-col items-center justify-center text-[#94A3B8]">
                  <ListChecks size={32} className="mb-3 opacity-20" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest">Tudo em ordem por aqui</p>
                </div>
              )}
            </div>

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
        <section className="pt-8 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-[#16A34A] shadow-sm" />
              <h2 className="text-base font-semibold text-[#1E293B] uppercase tracking-wider">Concluídas</h2>
            </div>
            <span className="text-[10px] font-semibold text-[#16A34A]/60 uppercase tracking-widest">{completedLists.length} Feitas</span>
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
              <div className="w-full py-10 flex flex-col items-center justify-center text-[#94A3B8]">
                <p className="text-[10px] font-semibold uppercase tracking-widest italic">Nenhuma lista finalizada ainda</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
