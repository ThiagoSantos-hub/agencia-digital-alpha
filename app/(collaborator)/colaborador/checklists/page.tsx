'use client'

import { useState, useMemo } from 'react'
import { useChecklists, Checklist } from '@/hooks/useChecklists'
import { 
  Trash2, X, Plus, CheckSquare, Loader2, 
  Edit2, Check, Calendar, Clock, LayoutGrid, 
  ListChecks, Sparkles, User
} from 'lucide-react'

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

export default function ColaboradorChecklistsPage() {
  const { 
    checklists, 
    loading, 
    createChecklist, 
    updateChecklist,
    deleteChecklist, 
    addItem, 
    updateItem,
    toggleItem, 
    deleteItem
  } = useChecklists()

  const [isCreating, setIsCreating] = useState(false)
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
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  , [checklists])

  const completedLists = useMemo(() => 
    checklists.filter(l => l.status === 'completed')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  , [checklists])

  if (loading && checklists.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0f0c]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#00ff88] animate-spin" />
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em]">Carregando suas rotinas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 min-h-screen bg-[#0a0f0c] text-gray-100 selection:bg-[#00ff88]/30">
      {/* HEADER MINIMALISTA */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-xl font-bold text-white uppercase tracking-wider">Meus Checklists</h1>
        
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00ff88] hover:bg-[#00dd77] text-[#0a0f0c] rounded-xl transition-all font-bold uppercase text-[11px] tracking-wider"
          >
            <Plus size={16} />
            Novo Checklist
          </button>
        )}
      </div>

      {/* ÁREA DE CRIAÇÃO - MINIMALISTA */}
      {isCreating && (
        <div className="mb-10 bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Novo Checklist</h2>
            <button onClick={resetCreateForm} className="text-gray-500 hover:text-white transition-all"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="group">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 group-focus-within:text-[#00ff88] transition-colors">Nome da Lista</label>
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Ex: Tarefas Diárias, Organização..."
                  className="w-full px-6 py-4 bg-[#0a0f0c] border border-[#2a2a2a] rounded-2xl text-sm focus:outline-none focus:border-[#00ff88] focus:ring-4 focus:ring-[#00ff88]/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Dias de Repetição</label>
                <div className="flex justify-between gap-2">
                  {DIAS_SEMANA.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id, newListDays, setNewListDays)}
                      className={`flex-1 aspect-square rounded-xl text-xs font-black transition-all duration-300 border flex items-center justify-center ${
                        newListDays.includes(day.id)
                          ? 'bg-[#00ff88] text-[#0a0f0c] border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                          : 'bg-[#0a0f0c] text-gray-500 border-[#2a2a2a] hover:border-gray-600'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Itens do Checklist</label>
              <div className="relative group">
                <input
                  type="text"
                  value={currentNewItem}
                  onChange={(e) => setCurrentNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLocalItem()}
                  placeholder="O que precisa ser feito?"
                  className="w-full px-6 py-4 bg-[#0a0f0c] border border-[#2a2a2a] rounded-2xl text-sm focus:outline-none focus:border-[#00ff88] pr-16"
                />
                <button onClick={addLocalItem} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#00ff88]/10 text-[#00ff88] rounded-xl hover:bg-[#00ff88] hover:text-[#0a0f0c] transition-all">
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {newListItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-[#0a0f0c]/50 border border-[#2a2a2a] rounded-2xl group hover:border-gray-700 transition-all">
                    <span className="text-sm text-gray-400 font-medium">{item}</span>
                    <button onClick={() => setNewListItems(newListItems.filter((_, i) => i !== index))} className="text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-[#2a2a2a]">
            <button onClick={resetCreateForm} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-wider transition-colors">Cancelar</button>
            <button 
              onClick={handleCreateList}
              disabled={!newListTitle.trim() || newListItems.length === 0}
              className="px-6 py-2 bg-[#00ff88] hover:bg-[#00dd77] disabled:opacity-50 text-[#0a0f0c] rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all"
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
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Minhas Pendências</h2>
            </div>
            <span className="text-[10px] font-bold text-amber-500/40 uppercase tracking-widest">{pendingLists.length} Ativas</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pendingLists.map(list => (
              <ChecklistCard 
                key={list.id} 
                list={list} 
                updateChecklist={updateChecklist}
                deleteChecklist={deleteChecklist}
                addItem={addItem}
                updateItem={updateItem}
                toggleItem={toggleItem}
                deleteItem={deleteItem}
              />
            ))}
            {pendingLists.length === 0 && (
              <div className="col-span-full py-16 border border-dashed border-[#2a2a2a] rounded-2xl flex flex-col items-center justify-center text-gray-700">
                <ListChecks size={32} className="mb-3 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Nada pendente no momento</p>
              </div>
            )}
          </div>
        </section>

        {/* REALIZADOS */}
        <section className="pt-8 border-t border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.4)]" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Finalizados</h2>
            </div>
            <span className="text-[10px] font-bold text-[#00ff88]/30 uppercase tracking-widest">{completedLists.length} Feitas</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {completedLists.map(list => (
              <ChecklistCard 
                key={list.id} 
                list={list} 
                updateChecklist={updateChecklist}
                deleteChecklist={deleteChecklist}
                addItem={addItem}
                updateItem={updateItem}
                toggleItem={toggleItem}
                deleteItem={deleteItem}
              />
            ))}
            {completedLists.length === 0 && (
              <div className="col-span-full py-10 flex flex-col items-center justify-center text-gray-800">
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
    <div className={`bg-[#111] border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${
      list.status === 'completed' 
        ? 'border-[#00ff88]/10 opacity-50' 
        : 'border-[#1a3a24] hover:border-[#2a4a34]'
    }`}>
      {/* BARRA DE PROGRESSO SIMPLES */}
      <div className="h-0.5 bg-[#1a3a24] w-full">
        <div 
          className="h-full bg-[#00ff88] transition-all duration-500" 
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
                  className="w-full bg-[#0a0f0c] border border-[#00ff88]/40 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                  autoFocus
                />
                <div className="grid grid-cols-7 gap-1">
                  {DIAS_SEMANA.map(day => (
                    <button
                      key={day.id}
                      onClick={() => {
                        if (days.includes(day.id)) setDays(days.filter(d => d !== day.id))
                        else setDays([...days, day.id].sort())
                      }}
                      className={`aspect-square rounded-lg text-[10px] font-black border transition-all flex items-center justify-center ${
                        days.includes(day.id) ? 'bg-[#00ff88] text-[#0a0f0c] border-[#00ff88]' : 'bg-[#0a0f0c] text-gray-600 border-[#2a2a2a]'
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
                    className="px-4 py-1.5 bg-[#00ff88] text-[#0a0f0c] text-[10px] font-black uppercase rounded-lg shadow-lg shadow-[#00ff88]/20"
                  >
                    Salvar
                  </button>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 bg-white/5 text-gray-400 text-[10px] font-black uppercase rounded-lg">Sair</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 group/title">
                  <h3 className="font-black text-white text-base tracking-tight truncate uppercase">{list.title}</h3>
                  <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover/title:opacity-100 text-gray-600 hover:text-[#00ff88] transition-all">
                    <Edit2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {list.recurrence_days?.length > 0 ? (
                    <div className="flex gap-1">
                      {list.recurrence_days.map((d: number) => (
                        <span key={d} className="text-[8px] font-black text-[#00ff88] uppercase bg-[#00ff88]/10 px-1.5 py-0.5 rounded-md border border-[#00ff88]/10">
                          {DIAS_SEMANA.find(day => day.id === d)?.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Tarefa Única</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => confirm('Remover esta rotina permanentemente?') && deleteChecklist(list.id)}
            className="p-2 text-gray-800 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="space-y-3 mt-4">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 group/item">
              <div 
                onClick={() => toggleItem(item.id, item.completed)}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-300 ${
                  item.completed 
                    ? 'bg-[#00ff88] border-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.3)]' 
                    : 'border-[#1a3a24] bg-[#0a0f0c] hover:border-gray-600'
                }`}
              >
                {item.completed && <Check size={14} className="text-[#0a0f0c] stroke-[4px]" />}
              </div>
              
              {editingItemId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingItemText}
                    onChange={(e) => setEditingItemText(e.target.value)}
                    className="flex-1 bg-[#0a0f0c] border border-[#00ff88]/30 rounded-lg px-3 py-1 text-xs text-white outline-none"
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
                    className={`text-xs font-bold cursor-pointer transition-all truncate pr-2 ${
                      item.completed ? 'text-gray-700 line-through' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {item.text}
                  </span>
                  <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover/item:opacity-100 text-gray-800 hover:text-red-500 transition-all">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center gap-4 pt-4 mt-2 border-t border-white/5">
            <div className="w-6 h-6 flex items-center justify-center text-gray-700">
              <Plus size={16} />
            </div>
            <input
              type="text"
              placeholder="Adicionar tarefa..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newItemText.trim()) {
                  await addItem(list.id, newItemText);
                  setNewItemText('');
                }
              }}
              className="flex-1 bg-transparent text-xs font-bold text-gray-600 focus:outline-none focus:text-[#00ff88] transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="px-6 py-3 bg-[#0a0f0c]/40 border-t border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Clock size={10} className="text-gray-700" />
          <span className="text-[8px] font-bold text-gray-700 uppercase tracking-widest">
            {list.status === 'completed' ? 'Finalizado' : 'Em Progresso'}
          </span>
        </div>
      </div>
    </div>
  )
}
