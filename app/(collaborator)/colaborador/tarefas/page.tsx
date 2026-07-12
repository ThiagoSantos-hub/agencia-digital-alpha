'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTasks, Task, TaskStatus, TaskPriority } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { 
  Calendar, 
  Clock, 
  X,
  Circle,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  ExternalLink,
  ChevronDown,
  LayoutDashboard,
  Filter
} from 'lucide-react'
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import dynamic from 'next/dynamic'

const KanbanColumn = dynamic(() => import('@/components/tasks/KanbanColumn').then(mod => mod.KanbanColumn), {
  loading: () => <div className="w-80 h-full bg-gray-100 rounded-2xl animate-pulse" />
})

const TaskCard = dynamic(() => import('@/components/tasks/TaskCard').then(mod => mod.TaskCard), {
  loading: () => <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
})

const COLUMNS: { id: TaskStatus; label: string; icon: any; color: string }[] = [
  { id: 'pendente', label: 'Pendências', icon: PauseCircle, color: 'text-amber-600' },
  { id: 'a_fazer', label: 'A Fazer', icon: Circle, color: 'text-[#64748B]' },
  { id: 'em_andamento', label: 'Em Andamento', icon: PlayCircle, color: 'text-[#1A56DB]' },
  { id: 'finalizada', label: 'Finalizadas', icon: CheckCircle2, color: 'text-[#16A34A]' },
]

export default function ColaboradorTasksPage() {
  const { user } = useAuth()
  const { tasks, loading, updateTask } = useTasks()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getPriorityOrder = (priority: TaskPriority): number => {
    switch (priority) {
      case 'urgente': return 0
      case 'alta': return 1
      case 'media': return 2
      case 'baixa': return 3
      default: return 4
    }
  }

  // Filtrar tarefas apenas do colaborador logado
  const myTasks = useMemo(() => {
    if (!user) return []
    return tasks
      .filter(t => t.assigned_to === user.id)
      .sort((a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority))
  }, [tasks, user])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = myTasks.find((t) => t.id === active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isOverAColumn = COLUMNS.some((col) => col.id === overId)
    if (isOverAColumn) {
      const task = myTasks.find((t) => t.id === activeId)
      if (task && task.status !== overId) {
        updateTask(task.id, { status: overId as TaskStatus })
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id
    const overId = over.id

    const overTask = myTasks.find((t) => t.id === overId)
    const activeTask = myTasks.find((t) => t.id === activeId)

    if (activeTask && overTask && activeTask.status !== overTask.status) {
      updateTask(activeTask.id, { status: overTask.status })
    }
  }

  return (
    <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col bg-[#F8FAFC]">
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 pt-2">
        <div>
          <h1 className="text-2xl font-semibold text-[#1E293B] flex items-center gap-2">
            <LayoutDashboard className="text-[#1A56DB]" size={24} />
            Minhas Tarefas
          </h1>
          <p className="text-[#64748B] text-sm">Organize suas demandas arrastando os cards entre as colunas.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
              <Filter size={14} className="text-[#64748B]" />
              <span className="text-xs font-medium text-[#1E293B]">Minhas Demandas</span>
           </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              {...column}
              userRole="collaborator"
              tasks={myTasks.filter(t => t.status === column.id)}
              onMove={(id, status) => updateTask(id, { status })}
              onClick={(task) => { setSelectedTask(task); setIsDetailModalOpen(true); }}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeTask ? (
            <div className="w-[320px]">
              <TaskCard 
                task={activeTask} 
                userRole="collaborator"
                onMove={() => {}}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de Detalhes da Tarefa (Light Mode) */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-3">
                 <div className={`w-2 h-2 rounded-full ${
                    selectedTask.priority === 'urgente' ? 'bg-red-500' :
                    selectedTask.priority === 'alta' ? 'bg-orange-500' :
                    selectedTask.priority === 'media' ? 'bg-blue-500' : 'bg-gray-400'
                 }`} />
                 <h2 className="text-[#1E293B] font-semibold">Detalhes da Tarefa</h2>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-[#64748B] hover:text-[#1E293B] transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div>
                <h3 className="text-xl font-bold text-[#1E293B] mb-2">{selectedTask.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedTask.description || 'Nenhuma descrição fornecida.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#F1F5F9]">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Prazo de Entrega</p>
                  <div className="flex items-center gap-2 text-[#1E293B]">
                    <Calendar size={14} className="text-[#1A56DB]" />
                    <span className="text-sm font-medium">
                      {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Prioridade</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      selectedTask.priority === 'urgente' ? 'text-red-700 bg-red-50 border-red-200' :
                      selectedTask.priority === 'alta' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                      selectedTask.priority === 'media' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                      'text-gray-600 bg-gray-50 border-gray-200'
                    }`}>
                      {selectedTask.priority}
                    </span>
                  </div>
                </div>
              </div>

              {selectedTask.drive_link && (
                <div className="pt-4">
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Arquivos e Recursos</p>
                  <a 
                    href={selectedTask.drive_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-[#1A56DB] hover:bg-[#DBEAFE] transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <ExternalLink size={16} />
                      <span className="text-sm font-semibold">Abrir no Google Drive</span>
                    </div>
                    <ChevronDown size={16} className="-rotate-90 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#E2E8F0] bg-[#F8FAFC] shrink-0 rounded-b-2xl">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full py-2.5 bg-white border border-[#E2E8F0] text-[#1E293B] font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
