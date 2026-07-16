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
  CheckCircle2,
  ExternalLink
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
      default: return 'text-text-muted'
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

  // DEBUG: console.log('Task:', task.title, 'CreatedBy:', task.created_by, 'CurrentUserID:', currentUserId, 'Role:', userRole)
  const canEdit = userRole === 'admin' || String(task.created_by) === String(currentUserId)
  const canDelete = userRole === 'admin' || String(task.created_by) === String(currentUserId)

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-background border border-border rounded-lg p-3 hover:border-[#00ff88]/30 transition-all group shadow-md cursor-grab active:cursor-grabbing"
      onClick={() => onClick(task)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[8px] font-black uppercase tracking-widest ${getPriorityColor(task.priority)}`}>
          {getPriorityLabel(task.priority)}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onDuplicate(task)} title="Duplicar" className="p-1 text-text-disabled hover:text-blue-400">
            <Copy size={12} />
          </button>
          {canEdit && (
            <button onClick={() => onEdit(task)} title="Editar" className="p-1 text-text-disabled hover:text-amber-400">
              <Edit size={12} />
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(task.id)} title="Excluir" className="p-1 text-text-disabled hover:text-red-500">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <h3 className="text-text-main font-bold text-xs mb-1 line-clamp-2 group-hover:text-[#00ff88] transition-colors leading-tight">{task.title}</h3>
      {task.description && (
        <div className="text-text-muted text-[10px] mb-2 whitespace-pre-wrap line-clamp-2 leading-tight">{task.description}</div>
      )}

      <div className="pt-2 border-t border-border space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex items-center gap-1 text-[9px] text-text-muted shrink-0">
              <Calendar size={10} />
              <span>{task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'S/P'}</span>
            </div>
            {task.drive_link && (
              <a 
                href={task.drive_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] text-emerald-500 hover:text-emerald-400 font-bold transition-colors shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={10} />
                Drive
              </a>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {task.status !== 'a_fazer' && (
              <button onClick={() => onMove(task.id, 'a_fazer')} title="Mover para A Fazer" className="p-0.5 text-text-disabled hover:text-text-main transition-colors">
                <Circle size={12} />
              </button>
            )}
            {task.status !== 'em_andamento' && (
              <button onClick={() => onMove(task.id, 'em_andamento')} title="Mover para Em Andamento" className="p-0.5 text-text-disabled hover:text-blue-400 transition-colors">
                <PlayCircle size={12} />
              </button>
            )}
            {task.status !== 'finalizada' && (
              <button onClick={() => onMove(task.id, 'finalizada')} title="Mover para Finalizada" className="p-0.5 text-text-disabled hover:text-emerald-400 transition-colors">
                <CheckCircle2 size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-text-muted uppercase font-bold shrink-0">Criado por:</span>
            <span className="text-[9px] text-emerald-400 font-medium truncate max-w-[100px]">
              {task.creator?.name || task.creator?.email?.split('@')[0] || 'Sistema'}
            </span>
          </div>
          {userRole === 'admin' && (
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-text-muted uppercase font-bold shrink-0">Para:</span>
              <div className="w-4 h-4 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[8px] text-blue-400 font-bold uppercase">
                {task.assignee?.name?.[0] || task.assignee?.email?.[0] || '?'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
