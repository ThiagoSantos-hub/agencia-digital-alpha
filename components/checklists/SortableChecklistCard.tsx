'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripHorizontal, Trash2, Edit2, Plus, Copy,
} from 'lucide-react'
import { FeatureLock } from '@/components/ui/FeatureLock'
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable'
import { Checklist } from '@/hooks/useChecklists'
import { SortableChecklistItem } from './SortableChecklistItem'

interface SortableChecklistCardProps {
  list: Checklist
  updateChecklist: any
  deleteChecklist: any
  duplicateChecklist?: any
  addItem: any
  updateItem: any
  toggleItem: any
  deleteItem: any
  updatePositions: any
}

const DIAS_SEMANA = [
  { id: 0, label: 'D' },
  { id: 1, label: 'S' },
  { id: 2, label: 'T' },
  { id: 3, label: 'Q' },
  { id: 4, label: 'Q' },
  { id: 5, label: 'S' },
  { id: 6, label: 'S' },
]

export function SortableChecklistCard({ 
  list, 
  updateChecklist, 
  deleteChecklist,
  duplicateChecklist, 
  addItem, 
  updateItem, 
  toggleItem, 
  deleteItem,
  updatePositions
}: SortableChecklistCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(list.title)
  const [days, setDays] = useState<number[]>(list.recurrence_days || [])
  const [newItemText, setNewItemText] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemText, setEditingItemText] = useState('')

  const items = list.checklist_items || []
  const completedCount = items.filter((i: any) => i.completed).length
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: list.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over) return
    
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(i => i.id === active.id)
      const newIndex = items.findIndex(i => i.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex)
        const positions = newItems.map((item, index) => ({ id: item.id, position: index }))
        await updatePositions('item', positions)
      }
    }
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-surface border rounded-xl overflow-hidden transition-transform duration-300 flex flex-col w-full max-w-[260px] ${
        list.status === 'completed' 
          ? 'border-cta/30 opacity-70' 
          : 'border-border hover:border-primary/30'
      }`}
    >
      <div className="h-0.5 bg-hover-bg w-full">
        <div 
          className="h-full bg-cta transition-all duration-500" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      <div className="p-3 flex-1 flex flex-col min-h-[300px] min-w-0 overflow-hidden">
        <div className="flex justify-between items-start mb-2">
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-text-disabled hover:text-text-muted cursor-grab active:cursor-grabbing touch-none"
          >
            <GripHorizontal size={14} />
          </button>
          
          <div className="flex gap-0.5">
            <button onClick={() => setIsEditing(true)} className="p-1 text-text-disabled hover:text-amber-600">
              <Edit2 size={12} />
            </button>
            {duplicateChecklist && (
              <FeatureLock featureKey="checklists.duplicar" variant="replace">
                <button onClick={() => duplicateChecklist(list.id)} className="p-1 text-text-disabled hover:text-cta" title="Duplicar checklist">
                  <Copy size={12} />
                </button>
              </FeatureLock>
            )}
            <button onClick={() => deleteChecklist(list.id)} className="p-1 text-text-disabled hover:text-red-500">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2 mb-3 bg-background p-2 rounded-xl border border-primary/20 overflow-hidden max-w-[220px]">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-[10px] text-text-main focus:outline-none focus:border-primary truncate"
              autoFocus
            />
            <div className="flex flex-wrap gap-0.5">
              {DIAS_SEMANA.map(day => (
                <button
                  key={day.id}
                  onClick={() => {
                    if (days.includes(day.id)) setDays(days.filter(d => d !== day.id))
                    else setDays([...days, day.id].sort())
                  }}
                  className={`w-5 h-5 rounded-lg text-[8px] font-black border transition-all ${
                    days.includes(day.id) ? 'bg-primary text-white border-primary' : 'bg-surface text-text-disabled border-border'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button 
                onClick={async () => {
                  await updateChecklist(list.id, { title, recurrence_days: days, recurrence: days.length > 0 ? 'daily' : 'once' });
                  setIsEditing(false);
                }} 
                className="flex-1 py-1 bg-primary text-white text-[8px] font-black uppercase rounded-lg"
              >
                Salvar
              </button>
              <button onClick={() => setIsEditing(false)} className="flex-1 py-1 bg-hover-bg text-text-muted text-[8px] font-black uppercase rounded-lg">Sair</button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <h3 className="text-text-main font-bold text-sm leading-tight mb-1.5 line-clamp-2">{list.title}</h3>
            <div className="flex flex-wrap gap-1">
              {list.recurrence_days?.map(dayId => (
                <span key={dayId} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded-md uppercase border border-primary/10">
                  {DIAS_SEMANA[dayId].label}
                </span>
              ))}
              {(!list.recurrence_days || list.recurrence_days.length === 0) && (
                <span className="px-1.5 py-0.5 bg-hover-bg text-text-muted text-[8px] font-black rounded-md uppercase border border-border">Única</span>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <div className="relative mb-3">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (addItem(list.id, newItemText), setNewItemText(''))}
              placeholder="Adicionar tarefa..."
              className="w-full bg-background border border-border rounded-xl pl-3 pr-8 py-2 text-[11px] text-text-main focus:outline-none focus:border-primary"
            />
            <button 
              onClick={() => { addItem(list.id, newItemText); setNewItemText(''); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-primary hover:bg-primary/10 rounded-lg transition-all"
            >
              <Plus size={14} />
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {items.map(item => (
                  <SortableChecklistItem
                    key={item.id}
                    item={item}
                    onToggle={toggleItem}
                    onDelete={deleteItem}
                    onEdit={(id, text) => { setEditingItemId(id); setEditingItemText(text); }}
                    isEditing={editingItemId === item.id}
                    editingText={editingItemText}
                    setEditingText={setEditingItemText}
                    onSaveEdit={async (id) => { await updateItem(id, editingItemText); setEditingItemId(null); }}
                    onCancelEdit={() => setEditingItemId(null)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted">
          <span>{completedCount}/{items.length} Concluído</span>
          <span className="text-primary">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  )
}
