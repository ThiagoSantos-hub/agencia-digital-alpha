'use client'

import { useState } from 'react'
import { useChecklists, Checklist } from '@/hooks/useChecklists'
import { 
  Trash2, X, Plus, CheckSquare, Loader2, 
  Edit2, Check, Calendar, Clock, ChevronDown, ChevronUp
} from 'lucide-react'

const DIAS_SEMANA = [
  { id: 0, label: 'Dom' },
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
]

export default function ChecklistsPage() {
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

  // Estados para criação
  const [isCreating, setIsCreating] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [newListDays, setNewListDays] = useState<number[]>([])
  const [newListItems, setNewListItems] = useState<string[]>([])
  const [currentNewItem, setCurrentNewItem] = useState('')

  // Estados para edição
  const [editingList, setEditingList] = useState<Checklist | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemText, setEditingItemText] = useState('')

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

  const removeLocalItem = (index: number) => {
    setNewListItems(newListItems.filter((_, i) => i !== index))
  }

  const pendingLists = checklists.filter(l => l.status === 'pending')
  const completedLists = checklists.filter(l => l.status === 'completed')

  if (loading && checklists.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0f0c]">
        <Loader2 className="w-8 h-8 text-[#00ff88] animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 min-h-screen bg-[#0a0f0c] text-gray-100">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Checklists</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Gestão de rotinas personalizadas por dia.</p>
        </div>
        
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#00ff88] hover:bg-[#00dd77] text-[#0a0f0c] rounded-xl transition-all text-sm font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,255,136,0.2)]"
          >
            <Plus size={18} />
            Nova Lista
          </button>
        )}
      </div>

      {/* MODAL/ÁREA DE CRIAÇÃO */}
      {isCreating && (
        <div className="mb-12 bg-[#111] border border-[#00ff88]/30 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-white uppercase">Configurar Nova Lista</h2>
            <button onClick={resetCreateForm} className="text-gray-500 hover:text-white"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Título da Lista</label>
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Ex: Rotina Matinal, Checklist de Segunda..."
                  className="w-full px-4 py-3 bg-[#0a0f0c] border border-[#2a2a2a] rounded-xl text-sm focus:outline-none focus:border-[#00ff88] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Dias de Repetição (Opcional)</label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id, newListDays, setNewListDays)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                        newListDays.includes(day.id)
                          ? 'bg-[#00ff88] text-[#0a0f0c] border-[#00ff88]'
                          : 'bg-[#0a0f0c] text-gray-500 border-[#2a2a2a] hover:border-gray-700'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mt-2 italic">* Se nenhum dia for selecionado, a lista será única.</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Itens do Checklist</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentNewItem}
                  onChange={(e) => setCurrentNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLocalItem()}
                  placeholder="Adicionar item..."
                  className="flex-1 px-4 py-2 bg-[#0a0f0c] border border-[#2a2a2a] rounded-xl text-sm focus:outline-none focus:border-[#00ff88]"
                />
                <button onClick={addLocalItem} className="p-2 bg-[#2a2a2a] text-white rounded-xl hover:bg-gray-700"><Plus size={20} /></button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {newListItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#0a0f0c] border border-[#2a2a2a] rounded-xl group">
                    <span className="text-sm text-gray-300">{item}</span>
                    <button onClick={() => removeLocalItem(index)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button onClick={resetCreateForm} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-white uppercase tracking-widest">Cancelar</button>
            <button 
              onClick={handleCreateList}
              disabled={!newListTitle.trim() || newListItems.length === 0}
              className="px-8 py-2 bg-[#00ff88] hover:bg-[#00dd77] disabled:opacity-50 text-[#0a0f0c] rounded-xl font-black uppercase tracking-widest"
            >
              Salvar Checklist
            </button>
          </div>
        </div>
      )}

      {/* LISTAGEM EM COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* COLUNA PENDENTES */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-8 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Pendentes</h2>
            <span className="bg-amber-500/10 text-amber-500 text-sm font-black px-3 py-1 rounded-full border border-amber-500/20">
              {pendingLists.length}
            </span>
          </div>
          
          <div className="space-y-6">
            {pendingLists.map(list => (
              <ChecklistComponent 
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
          </div>
        </section>

        {/* COLUNA FINALIZADOS */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-2 h-8 bg-[#00ff88] rounded-full shadow-[0_0_10px_rgba(0,255,136,0.5)]" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Realizados</h2>
            <span className="bg-[#00ff88]/10 text-[#00ff88] text-sm font-black px-3 py-1 rounded-full border border-[#00ff88]/20">
              {completedLists.length}
            </span>
          </div>
          
          <div className="space-y-6">
            {completedLists.map(list => (
              <ChecklistComponent 
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
          </div>
        </section>
      </div>
    </div>
  )
}

function ChecklistComponent({ 
  list, 
  updateChecklist, 
  deleteChecklist, 
  addItem, 
  updateItem, 
  toggleItem, 
  deleteItem 
}: { 
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

  const handleSave = async () => {
    await updateChecklist(list.id, { 
      title, 
      recurrence_days: days,
      recurrence: days.length > 0 ? 'daily' : 'once'
    })
    setIsEditing(false)
  }

  const handleAddItem = async () => {
    if (!newItemText.trim()) return
    await addItem(list.id, newItemText)
    setNewItemText('')
  }

  const handleUpdateItem = async (id: string) => {
    if (!editingItemText.trim()) return
    await updateItem(id, editingItemText)
    setEditingItemId(null)
  }

  const items = list.checklist_items || []

  return (
    <div className={`bg-[#111] border rounded-2xl overflow-hidden transition-all duration-300 ${list.status === 'completed' ? 'border-[#00ff88]/20 opacity-60 hover:opacity-100' : 'border-[#2a2a2a] hover:border-gray-700'}`}>
      {/* HEADER DO CARD */}
      <div className="p-5 border-b border-[#2a2a2a] flex justify-between items-start bg-[#161616]">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0a0f0c] border border-[#00ff88]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
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
                    className={`px-2 py-1 rounded text-[10px] font-bold border ${days.includes(day.id) ? 'bg-[#00ff88] text-[#0a0f0c] border-[#00ff88]' : 'bg-[#0a0f0c] text-gray-500 border-[#2a2a2a]'}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-3 py-1 bg-[#00ff88] text-[#0a0f0c] text-[10px] font-black uppercase rounded">Salvar</button>
                <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="group flex items-center gap-3">
              <h3 className="font-black text-white text-lg tracking-tight">{list.title}</h3>
              <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-all">
                <Edit2 size={14} />
              </button>
            </div>
          )}
          
          {!isEditing && (
            <div className="flex items-center gap-2 mt-2">
              <Calendar size={12} className="text-gray-600" />
              <div className="flex gap-1">
                {list.recurrence_days && list.recurrence_days.length > 0 ? (
                  list.recurrence_days.map(d => (
                    <span key={d} className="text-[9px] font-black text-[#00ff88] uppercase bg-[#00ff88]/10 px-1.5 py-0.5 rounded">
                      {DIAS_SEMANA.find(day => day.id === d)?.label}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] font-black text-gray-500 uppercase bg-gray-500/10 px-1.5 py-0.5 rounded">Único</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => confirm('Excluir esta lista completa?') && deleteChecklist(list.id)}
          className="p-2 text-gray-700 hover:text-red-500 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* LISTA DE ITENS */}
      <div className="p-5 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 group">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleItem(item.id, item.completed)}
              className="w-5 h-5 rounded border-[#2a2a2a] bg-[#0a0f0c] text-[#00ff88] focus:ring-0 cursor-pointer"
            />
            
            {editingItemId === item.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editingItemText}
                  onChange={(e) => setEditingItemText(e.target.value)}
                  className="flex-1 bg-[#0a0f0c] border border-[#00ff88]/50 rounded px-2 py-1 text-sm text-white"
                  autoFocus
                />
                <button onClick={() => handleUpdateItem(item.id)} className="text-[#00ff88]"><Check size={18} /></button>
                <button onClick={() => setEditingItemId(null)} className="text-red-500"><X size={18} /></button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between">
                <span 
                  onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }}
                  className={`text-sm font-medium cursor-pointer transition-colors ${item.completed ? 'line-through text-gray-600' : 'text-gray-300 hover:text-white'}`}
                >
                  {item.text}
                </span>
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-700 hover:text-red-500 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* ADICIONAR NOVO ITEM */}
        <div className="flex items-center gap-3 pt-3 mt-3 border-t border-[#2a2a2a]">
          <div className="w-5 h-5 flex items-center justify-center">
            <Plus size={14} className="text-gray-600" />
          </div>
          <input
            type="text"
            placeholder="Adicionar tarefa..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            className="flex-1 bg-transparent text-sm text-gray-400 focus:outline-none focus:text-white"
          />
        </div>
      </div>
    </div>
  )
}
