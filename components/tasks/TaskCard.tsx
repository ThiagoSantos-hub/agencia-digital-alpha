'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, TaskPriority, TaskStatus } from '@/hooks/useTasks'
import { 
  Calendar, 
  Copy, 
  Edit, 
  Trash2, 
  Circle, 
  PlayCircle, 
  CheckCircle2
} from 'lucide-react'

interface TaskCardProps {
  task: Task
  userRole: 'admin' | 'collaborator'
  currentUserId?: string
  onDuplicate: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onMove: (id: string, status: TaskStatus) => void
  onClick: (task: Task) => void
}

export function TaskCard({ 
  task, 
  userRole, 
  currentUserId,
  onDuplicate, 
  onEdit, 
  onDelete, 
  onMove,
  onClick
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgente': return 'text-red-600'
      case 'alta': return 'text-red-500'
      case 'media': return 'text-amber-500'
      case 'baixa': return 'text-emerald-500'
      default: return 'text-gray-500'
    }
  }

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgente': return 'URGENTE'
      case 'alta': return 'ALTA'
      case 'media': return 'MÉDIA'
      case 'baixa': return 'BAIXA'
      default: return 'DESCONHECIDA'
    }
  }

  const canEdit = userRole === 'admin' || task.created_by === currentUserId
  const canDelete = userRole === 'admin' || task.created_by === currentUserId

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-[#0a0f0c] border border-[#1a3a24] rounded-lg p-3 hover:border-[#00ff88]/30 transition-all group shadow-md cursor-grab active:cursor-grabbing"
      onClick={() => onClick(task)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[8px] font-black uppercase tracking-widest ${getPriorityColor(task.priority)}`}>
          {getPriorityLabel(task.priority)}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onDuplicate(task)} title="Duplicar" className="p-1 text-gray-700 hover:text-blue-400">
            <Copy size={12} />
          </button>
          {canEdit && (
            <button onClick={() => onEdit(task)} title="Editar" className="p-1 text-gray-700 hover:text-amber-400">
              <Edit size={12} />
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(task.id)} title="Excluir" className="p-1 text-gray-700 hover:text-red-500">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <h3 className="text-white font-bold text-xs mb-1 line-clamp-2 group-hover:text-[#00ff88] transition-colors leading-tight">{task.title}</h3>
      {task.description && (
        <div className="text-gray-500 text-[10px] mb-2 whitespace-pre-wrap line-clamp-2 leading-tight">{task.description}</div>
      )}

      <div className="pt-2 border-t border-[#1a3a24] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {userRole === 'admin' && (
            <div className="w-5 h-5 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center text-[8px] text-[#00ff88] font-bold uppercase">
              {task.assignee?.name?.[0] || task.assignee?.email?.[0] || '?'}
            </div>
          )}
          <div className="flex items-center gap-1 text-[9px] text-gray-500">
            <Calendar size={10} />
            <span className="truncate max-w-[60px]">{task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'S/P'}</span>
          </div>
        </div>

        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
          {task.status !== 'a_fazer' && (
            <button onClick={() => onMove(task.id, 'a_fazer')} title="Mover para A Fazer" className="p-0.5 text-gray-700 hover:text-white transition-colors">
              <Circle size={12} />
            </button>
          )}
          {task.status !== 'em_andamento' && (
            <button onClick={() => onMove(task.id, 'em_andamento')} title="Mover para Em Andamento" className="p-0.5 text-gray-700 hover:text-blue-400 transition-colors">
              <PlayCircle size={12} />
            </button>
          )}
          {task.status !== 'finalizada' && (
            <button onClick={() => onMove(task.id, 'finalizada')} title="Mover para Finalizada" className="p-0.5 text-gray-700 hover:text-emerald-400 transition-colors">
              <CheckCircle2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
