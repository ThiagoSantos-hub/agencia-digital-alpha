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
    <div className="flex-1 min-w-[250px] max-w-[350px] bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl flex flex-col overflow-hidden">
      <div className="p-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <Icon size={16} className={color} />
          <h2 className="text-[#1E293B] font-semibold text-sm uppercase tracking-wider truncate">{label}</h2>
        </div>
        <span className="bg-[#EFF6FF] text-[#1A56DB] border border-[#BFDBFE] text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div 
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2.5 custom-scrollbar min-h-[200px] bg-[#F8FAFC]"
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
