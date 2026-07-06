'use client'

import { useState } from 'react'
import { useChecklists } from '@/hooks/useChecklists'
import { Trash2, X, Plus, CheckSquare, Loader2 } from 'lucide-react'

export default function ChecklistsPage() {
  const { 
    checklists, 
    loading, 
    createChecklist, 
    deleteChecklist, 
    addItem, 
    toggleItem, 
    deleteItem 
  } = useChecklists()

  const [newListTitle, setNewListTitle] = useState('')
  const [newItemTexts, setNewItemTexts] = useState<{ [key: string]: string }>({})

  const handleCreateList = async () => {
    if (!newListTitle.trim()) return
    await createChecklist(newListTitle)
    setNewListTitle('')
  }

  const handleAddItem = async (checklistId: string) => {
    const text = newItemTexts[checklistId]
    if (!text?.trim()) return
    await addItem(checklistId, text)
    setNewItemTexts(prev => ({ ...prev, [checklistId]: '' }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 min-h-screen bg-[#111] text-gray-100">
      <div className="flex flex-col gap-8 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Checklists</h1>
          <p className="text-gray-400 text-sm">Suas listas pessoais de tarefas.</p>
        </div>
        
        <div className="flex items-center gap-2 max-w-md">
          <input
            type="text"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            placeholder="Nome da lista (ex: Segunda-feira, Empresa X)..."
            className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button 
            onClick={handleCreateList}
            disabled={!newListTitle.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Plus size={18} />
            Criar Lista
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {checklists.map((list) => {
          const items = list.checklist_items || []
          const completedCount = items.filter(i => i.completed).length
          
          return (
            <div key={list.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-white">{list.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {completedCount}/{items.length} concluídos
                  </p>
                </div>
                <button 
                  onClick={() => confirm('Excluir esta lista?') && deleteChecklist(list.id)}
                  className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 group">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleItem(item.id, item.completed)}
                      className="w-4 h-4 rounded border-[#2a2a2a] bg-transparent text-indigo-500 focus:ring-offset-0 focus:ring-0"
                    />
                    <span className={`text-sm flex-1 ${item.completed ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                      {item.text}
                    </span>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-500 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Adicionar item..."
                  value={newItemTexts[list.id] || ''}
                  onChange={(e) => setNewItemTexts(prev => ({ ...prev, [list.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem(list.id)}
                  className="flex-1 px-3 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button 
                  onClick={() => handleAddItem(list.id)}
                  className="p-1.5 bg-[#2a2a2a] text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {checklists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <CheckSquare size={48} className="mb-4 opacity-20" />
          <p>Nenhuma lista de checklists encontrada.</p>
        </div>
      )}
    </div>
  )
}
