'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Edit2 } from 'lucide-react'
import { ChecklistItem } from '@/hooks/useChecklists'

interface SortableChecklistItemProps {
  item: ChecklistItem
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (id: string, text: string) => void
  isEditing: boolean
  editingText: string
  setEditingText: (text: string) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
}

export function SortableChecklistItem({
  item,
  onToggle,
  onDelete,
  onEdit,
  isEditing,
  editingText,
  setEditingText,
  onSaveEdit,
  onCancelEdit
}: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${
        item.completed 
          ? 'bg-[#0a0f0c]/30 border-[#00ff88]/5 opacity-60' 
          : 'bg-[#0a0f0c] border-[#2a2a2a] hover:border-gray-700'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-700 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical size={16} />
      </button>

      <button
        onClick={() => onToggle(item.id, item.completed)}
        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
          item.completed 
            ? 'bg-[#00ff88] border-[#00ff88]' 
            : 'border-[#2a2a2a] group-hover:border-gray-600'
        }`}
      >
        {item.completed && <div className="w-2 h-2 bg-[#0a0f0c] rounded-sm" />}
      </button>

      {isEditing ? (
        <div className="flex-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSaveEdit(item.id)}
            className="flex-1 bg-[#111] border border-[#00ff88]/40 rounded-lg px-3 py-1 text-sm text-white focus:outline-none"
            autoFocus
          />
        </div>
      ) : (
        <span className={`flex-1 text-sm font-medium transition-all ${
          item.completed ? 'text-gray-600 line-through' : 'text-gray-300'
        }`}>
          {item.text}
        </span>
      )}

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {isEditing ? (
          <button onClick={onCancelEdit} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase">Cancelar</button>
        ) : (
          <>
            <button onClick={() => onEdit(item.id, item.text)} className="p-1.5 text-gray-700 hover:text-amber-400">
              <Edit2 size={14} />
            </button>
            <button onClick={() => onDelete(item.id)} className="p-1.5 text-gray-700 hover:text-red-500">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
