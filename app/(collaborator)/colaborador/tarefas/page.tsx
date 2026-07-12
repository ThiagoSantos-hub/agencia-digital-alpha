'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTasks, Task, TaskStatus, TaskPriority } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { 
  Plus, 
  Calendar, 
  Clock, 
  X,
  Circle,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  ExternalLink,
  ChevronDown
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
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
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

export default function CollaboratorTasksPage() {
  const { user } = useAuth()
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [allUsers, setAllUsers] = useState<{id: string, name: string, email: string, role: string}[]>([])
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'media' as TaskPriority,
    due_date: '',
    drive_link: '',
    status: 'a_fazer' as TaskStatus,
    assigned_to: ''
  })

  useEffect(() => {
    async function fetchUsers() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .order('name')
      
      if (error) {
        console.error('Erro ao buscar usuários:', error)
      } else {
        setAllUsers(data || [])
      }
    }
    fetchUsers()
  }, [])

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

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority))
  }, [tasks])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title.trim() || !newTask.assigned_to) {
      alert('Por favor, preencha o título e selecione para quem enviar.')
      return
    }

    try {
      await createTask({ 
        ...newTask, 
        assigned_to: newTask.assigned_to 
      })
      setIsModalOpen(false)
      setNewTask({ title: '', description: '', priority: 'media', due_date: '', drive_link: '', status: 'a_fazer', assigned_to: '' })
    } catch (err: any) {
      console.error('Erro ao criar tarefa:', err)
      const errorMsg = err.message || 'Erro desconhecido'
      alert(`Erro ao criar tarefa: ${errorMsg}\n\nVerifique se rodou o script SQL no Supabase.`)
    }
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return

    try {
      await updateTask(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        due_date: editingTask.due_date,
        drive_link: editingTask.drive_link,
        status: editingTask.status,
        assigned_to: editingTask.assigned_to
      })
      setIsEditModalOpen(false)
      setEditingTask(null)
    } catch (err) {
      alert('Erro ao atualizar tarefa')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
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
      const task = tasks.find((t) => t.id === activeId)
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

    const overTask = tasks.find((t) => t.id === overId)
    const activeTask = tasks.find((t) => t.id === activeId)

    if (activeTask && overTask && activeTask.status !== overTask.status) {
      updateTask(activeTask.id, { status: overTask.status })
    }
  }

  return (
    <div className="p-4 space-y-4 h-[calc(100vh-64px)] flex flex-col bg-[#F8FAFC]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#1E293B]">Minhas Tarefas</h1>
          <p className="text-[#64748B] text-sm mt-1">Arraste as tarefas para gerenciar seu progresso.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white font-semibold rounded-xl transition-all shadow-sm"
        >
          <Plus size={20} />
          Criar Tarefa
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              {...column}
              userRole="collaborator"
              currentUserId={user?.id}
              tasks={sortedTasks.filter(t => t.status === column.id)}
              onDuplicate={(task) => createTask({ ...task, title: `${task.title} (Cópia)`, status: 'a_fazer', assigned_to: user?.id })}
              onEdit={(task) => { setEditingTask(task); setIsEditModalOpen(true); }}
              onDelete={deleteTask}
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
                currentUserId={user?.id}
                onDuplicate={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
                onMove={() => {}}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de Criação de Tarefa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] shrink-0 rounded-t-2xl">
              <h2 className="text-[#1E293B] font-semibold">Criar Nova Tarefa</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#64748B] hover:text-[#1E293B] transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#64748B]">Título *</label>
                <input 
                  required
                  type="text" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all"
                  placeholder="Ex: Finalizar criativos"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#64748B]">Descrição</label>
                <textarea 
                  rows={3}
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all resize-none"
                  placeholder="Detalhes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#64748B]">Enviar para *</label>
                  <div className="relative">
                    <select 
                      required
                      value={newTask.assigned_to}
                      onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all appearance-none"
                    >
                      <option value="">Selecione...</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.role === 'admin' ? 'ADM: ' : ''}{u.name || u.email}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#64748B]">Prioridade</label>
                  <div className="relative">
                    <select 
                      value={newTask.priority}
                      onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all appearance-none"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#64748B]">Data de Entrega</label>
                <input 
                  type="date" 
                  value={newTask.due_date}
                  onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white font-semibold rounded-xl transition-all shadow-sm"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Tarefa */}
      {isEditModalOpen && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] shrink-0 rounded-t-2xl">
              <h2 className="text-[#1E293B] font-semibold">Editar Minha Tarefa</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#64748B] hover:text-[#1E293B] transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateTask} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#64748B]">Título *</label>
                <input 
                  required
                  type="text" 
                  value={editingTask.title}
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#64748B]">Descrição</label>
                <textarea 
                  rows={3}
                  value={editingTask.description || ''}
                  onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#64748B]">Atribuir a *</label>
                  <div className="relative">
                    <select 
                      required
                      value={editingTask.assigned_to}
                      onChange={e => setEditingTask({...editingTask, assigned_to: e.target.value})}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all appearance-none"
                    >
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.role === 'admin' ? 'ADM: ' : ''}{u.name || u.email}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#64748B]">Status</label>
                  <div className="relative">
                    <select 
                      value={editingTask.status}
                      onChange={e => setEditingTask({...editingTask, status: e.target.value as TaskStatus})}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all appearance-none"
                    >
                      {COLUMNS.map(col => (
                        <option key={col.id} value={col.id}>{col.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#64748B]">Prioridade</label>
                  <div className="relative">
                    <select 
                      value={editingTask.priority}
                      onChange={e => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all appearance-none"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#64748B]">Data de Entrega</label>
                  <input 
                    type="date" 
                    value={editingTask.due_date ? editingTask.due_date.split('T')[0] : ''}
                    onChange={e => setEditingTask({...editingTask, due_date: e.target.value})}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1A56DB]">Link do Google Drive (Opcional)</label>
                <input 
                  type="url" 
                  value={editingTask.drive_link || ''}
                  onChange={e => setEditingTask({...editingTask, drive_link: e.target.value})}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-[#1A56DB] hover:bg-[#1A56DB]/90 text-white font-semibold rounded-xl transition-all shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
