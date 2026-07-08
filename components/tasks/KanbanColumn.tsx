'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task, TaskStatus } from '@/hooks/useTasks'
import { TaskCard } from './TaskCard'

interface KanbanColumnProps {
  id: TaskStatus
  label: string
  icon: any
  color: string
  tasks: Task[]
  userRole: 'admin' | 'collaborator'
  currentUserId?: string
  onDuplicate: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onMove: (id: string, status: TaskStatus) => void
  onClick: (task: Task) => void
}

export function KanbanColumn({ 
  id, 
  label, 
  icon: Icon, 
  color, 
  tasks,
  userRole,
  currentUserId,
  onDuplicate,
  onEdit,
  onDelete,
  onMove,
  onClick
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div className="flex-1 min-w-[320px] bg-[#0f1a14]/50 border border-[#1a3a24] rounded-2xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[#1a3a24] flex items-center justify-between bg-[#0f1a14]">
        <div className="flex items-center gap-2">
          <Icon size={18} className={color} />
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">{label}</h2>
        </div>
        <span className="bg-[#1a3a24] text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div 
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-[200px]"
      >
        <SortableContext 
          items={tasks.map(t => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              userRole={userRole}
              currentUserId={currentUserId}
              onDuplicate={onDuplicate}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              onClick={onClick}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
