'use client'

import { useState } from 'react'
import { useChecklists, Checklist } from '@/hooks/useChecklists'
import { 
  Trash2, X, Plus, CheckSquare, Loader2, 
  RotateCcw, Edit2, Check, Calendar, Clock 
} from 'lucide-react'

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
    deleteItem,
    uncheckAll
  } = useChecklists()

  const [newListTitle, setNewListTitle] = useState('')
  const [newListRecurrence, setNewListRecurrence] = useState<'once' | 'daily' | 'weekly'>('once')
  const [newItemTexts, setNewItemTexts] = useState<{ [key: string]: string }>({})
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editingListTitle, setEditingListTitle] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemText, setEditingItemText] = useState('')

  const handleCreateList = async () => {
    if (!newListTitle.trim()) return
    await createChecklist(newListTitle, newListRecurrence)
    setNewListTitle('')
    setNewListRecurrence('once')
  }

  const handleSaveListTitle = async (id: string) => {
    if (!editingListTitle.trim()) return
    await updateChecklist(id, { title: editingListTitle })
    setEditingListId(null)
  }

  const handleSaveItemText = async (id: string) => {
    if (!editingItemText.trim()) return
    await updateItem(id, editingItemText)
    setEditingItemId(null)
  }

  const pendingLists = checklists.filter(l => l.status === 'pending')
  const completedLists = checklists.filter(l => l.status === 'completed')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0f0c]">
        <Loader2 className="w-8 h-8 text-[#00ff88] animate-spin" />
      </div>
    )
  }

  const ChecklistCard = ({ list }: { list: Checklist }) => {
    const items = list.checklist_items || []
    const completedCount = items.filter(i => i.completed).length
    
    return (
      <div key={list.id} className={`bg-[#1a1a1a] border rounded-xl p-5 flex flex-col gap-4 transition-all ${list.status === 'completed' ? 'border-emerald-500/30 opacity-80' : 'border-[#2a2a2a]'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {editingListId === list.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingListTitle}
                  onChange={(e) => setEditingListTitle(e.target.value)}
                  className="bg-[#111] border border-emerald-500/50 rounded px-2 py-1 text-sm text-white w-full"
                  autoFocus
                />
                <button onClick={() => handleSaveListTitle(list.id)} className="text-emerald-500"><Check size={16} /></button>
                <button onClick={() => setEditingListId(null)} className="text-red-500"><X size={16} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h3 className="font-bold text-white text-base">{list.title}</h3>
                <button 
                  onClick={() => { setEditingListId(list.id); setEditingListTitle(list.title); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                list.recurrence === 'daily' ? 'bg-blue-500/10 text-blue-400' :
                list.recurrence === 'weekly' ? 'bg-purple-500/10 text-purple-400' :
                'bg-gray-500/10 text-gray-400'
              }`}>
                {list.recurrence === 'daily' ? 'Diário' : list.recurrence === 'weekly' ? 'Semanal' : 'Único'}
              </span>
              <p className="text-[10px] font-bold text-gray-500">
                {completedCount}/{items.length} itens
              </p>
            </div>
          </div>
          <button 
            onClick={() => confirm('Excluir esta lista?') && deleteChecklist(list.id)}
            className="p-1.5 text-gray-600 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="space-y-2.5 my-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 group">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleItem(item.id, item.completed)}
                className="w-4 h-4 rounded border-[#2a2a2a] bg-transparent text-emerald-500 focus:ring-0 cursor-pointer"
              />
              
              {editingItemId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingItemText}
                    onChange={(e) => setEditingItemText(e.target.value)}
                    className="bg-[#111] border border-emerald-500/50 rounded px-2 py-0.5 text-xs text-white w-full"
                    autoFocus
                  />
                  <button onClick={() => handleSaveItemText(item.id)} className="text-emerald-500"><Check size={14} /></button>
                </div>
              ) : (
                <span 
                  onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }}
                  className={`text-sm flex-1 cursor-pointer hover:text-white transition-colors ${item.completed ? 'line-through text-gray-600' : 'text-gray-300'}`}
                >
                  {item.text}
                </span>
              )}

              <button 
                onClick={() => deleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-700 hover:text-red-500 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[#2a2a2a]/50">
          <input
            type="text"
            placeholder="Novo item..."
            value={newItemTexts[list.id] || ''}
            onChange={(e) => setNewItemTexts(prev => ({ ...prev, [list.id]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem(list.id, list.id)}
            className="flex-1 px-3 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button 
            onClick={() => handleAddItem(list.id, list.id)}
            className="p-1.5 bg-[#2a2a2a] text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    )
  }

  const handleAddItem = async (listId: string, inputKey: string) => {
    const text = newItemTexts[inputKey]
    if (!text?.trim()) return
    await addItem(listId, text)
    setNewItemTexts(prev => ({ ...prev, [inputKey]: '' }))
  }

  return (
    <div className="p-8 min-h-screen bg-[#0a0f0c] text-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Checklists</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Gestão de rotinas e verificações diárias.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-[#1a1a1a] p-2 rounded-2xl border border-[#2a2a2a]">
          <input
            type="text"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            placeholder="Nome da nova lista..."
            className="px-4 py-2 bg-[#111] border border-[#2a2a2a] rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors min-w-[240px]"
          />
          <select 
            value={newListRecurrence}
            onChange={(e) => setNewListRecurrence(e.target.value as any)}
            className="px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-xl text-sm text-gray-300 outline-none focus:border-emerald-500"
          >
            <option value="once">Único</option>
            <option value="daily">Diário</option>
            <option value="weekly">Semanal</option>
          </select>
          <button 
            onClick={handleCreateList}
            disabled={!newListTitle.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-[#00ff88] hover:bg-[#00dd77] disabled:opacity-50 text-[#0a0f0c] rounded-xl transition-all text-sm font-black uppercase tracking-widest"
          >
            <Plus size={18} />
            Criar
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {/* COLUNA PENDENTES */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-6 bg-amber-500 rounded-full" />
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Pendentes</h2>
            <span className="bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
              {pendingLists.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingLists.map(list => <ChecklistCard key={list.id} list={list} />)}
            {pendingLists.length === 0 && (
              <div className="col-span-full py-12 border-2 border-dashed border-[#2a2a2a] rounded-2xl flex flex-col items-center justify-center text-gray-600">
                <Clock size={32} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">Nenhum checklist pendente.</p>
              </div>
            )}
          </div>
        </section>

        {/* COLUNA FINALIZADOS */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Finalizados</h2>
            <span className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
              {completedLists.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedLists.map(list => <ChecklistCard key={list.id} list={list} />)}
            {completedLists.length === 0 && (
              <div className="col-span-full py-12 border-2 border-dashed border-[#2a2a2a] rounded-2xl flex flex-col items-center justify-center text-gray-600">
                <CheckSquare size={32} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">Nenhuma lista concluída ainda.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
