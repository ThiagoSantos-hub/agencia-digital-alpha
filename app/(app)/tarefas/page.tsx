'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTasks, Task, TaskStatus, TaskPriority } from '@/hooks/useTasks'
import { createClient } from '@/lib/supabase'
import { 
  Plus, 
  Calendar, 
  Clock, 
  X,
  AlertCircle,
  Circle,
  PlayCircle,
  CheckCircle2,
  PauseCircle
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
import { KanbanColumn } from '@/components/tasks/KanbanColumn'
import { TaskCard } from '@/components/tasks/TaskCard'

const COLUMNS: { id: TaskStatus; label: string; icon: any; color: string }[] = [
  { id: 'pendente', label: 'Pendências', icon: PauseCircle, color: 'text-amber-600' },
  { id: 'a_fazer', label: 'A Fazer', icon: Circle, color: 'text-gray-400' },
  { id: 'em_andamento', label: 'Em Andamento', icon: PlayCircle, color: 'text-blue-400' },
  { id: 'finalizada', label: 'Finalizadas', icon: CheckCircle2, color: 'text-emerald-400' },
]

export default function AdminTasksPage() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [colaboradores, setColaboradores] = useState<{id: string, name: string, email: string}[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'media' as TaskPriority,
    due_date: '',
    status: 'a_fazer' as TaskStatus
  })
  const [editingTask, setEditingTask] = useState<Task | null>(null)

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

  useEffect(() => {
    async function fetchColaboradores() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'collaborator')
      setColaboradores(data || [])
    }
    fetchColaboradores()
  }, [])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title.trim() || !newTask.assigned_to) return

    try {
      await createTask({
        ...newTask,
        description: newTask.description.trim() || null,
        due_date: newTask.due_date || null
      })
      setIsModalOpen(false)
      setNewTask({ title: '', description: '', assigned_to: '', priority: 'media', due_date: '', status: 'a_fazer' })
    } catch (err) {
      alert('Erro ao criar tarefa')
    }
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return

    try {
      await updateTask(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description,
        assigned_to: editingTask.assigned_to,
        priority: editingTask.priority,
        due_date: editingTask.due_date,
        status: editingTask.status
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

    // Se estiver sobre uma coluna
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

    // Se o destino for uma tarefa diferente, atualiza o status se necessário
    const overTask = tasks.find((t) => t.id === overId)
    const activeTask = tasks.find((t) => t.id === activeId)

    if (activeTask && overTask && activeTask.status !== overTask.status) {
      updateTask(activeTask.id, { status: overTask.status })
    }
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

  return (
    <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col px-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Quadro Kanban</h1>
          <p className="text-gray-400 text-sm">Arraste as tarefas para mudar o status.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} />
          Nova Tarefa
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
              userRole="admin"
              tasks={sortedTasks.filter(t => t.status === column.id)}
              onDuplicate={(task) => createTask({ ...task, title: `${task.title} (Cópia)`, status: 'a_fazer' })}
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
                userRole="admin"
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

      {/* Modal de Nova Tarefa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#1a3a24] flex justify-between items-center bg-[#0f1a14]">
              <h2 className="text-white font-bold">Criar Nova Tarefa</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white text-2xl">&times;</button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Título</label>
                <input 
                  required
                  type="text" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="Ex: Criar artes para o Cliente X"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Descrição</label>
                <textarea 
                  rows={3}
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Detalhes da tarefa..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Atribuir a</label>
                  <select 
                    required
                    value={newTask.assigned_to}
                    onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}
                    className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Selecione...</option>
                    {colaboradores.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Status Inicial</label>
                  <select 
                    value={newTask.status}
                    onChange={e => setNewTask({...newTask, status: e.target.value as TaskStatus})}
                    className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    {COLUMNS.map(col => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Prioridade</label>
                  <select 
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})}
                    className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Data de Entrega</label>
                  <input 
                    type="date" 
                    value={newTask.due_date}
                    onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                    className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all mt-4 shadow-lg shadow-emerald-500/20"
              >
                Criar Tarefa
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Tarefa */}
      {isEditModalOpen && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#1a3a24] flex justify-between items-center bg-[#0f1a14]">
              <h2 className="text-white font-bold">Editar Tarefa</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-white text-2xl">&times;</button>
            </div>
            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Título</label>
                <input 
                  required
                  type="text" 
                  value={editingTask.title}
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Descrição</label>
                <textarea 
                  rows={4}
                  value={editingTask.description || ''}
                  onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-none whitespace-pre-wrap"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Atribuir a</label>
                  <select 
                    required
                    value={editingTask.assigned_to}
                    onChange={e => setEditingTask({...editingTask, assigned_to: e.target.value})}
                    className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    {colaboradores.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Status</label>
                  <select 
                    value={editingTask.status}
                    onChange={e => setEditingTask({...editingTask, status: e.target.value as TaskStatus})}
                    className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    {COLUMNS.map(col => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Prioridade</label>
                  <select 
                    value={editingTask.priority}
                    onChange={e => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})}
                    className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Data de Entrega</label>
                  <input 
                    type="date" 
                    value={editingTask.due_date ? editingTask.due_date.split('T')[0] : ''}
                    onChange={e => setEditingTask({...editingTask, due_date: e.target.value})}
                    className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all mt-4"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Tarefa */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-[#1a3a24] flex justify-between items-center sticky top-0 bg-[#0a0f0c] z-10">
              <h2 className="text-white font-bold text-lg">Detalhes da Tarefa</h2>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{selectedTask.title}</h1>
                <span className={`inline-block text-xs font-black uppercase tracking-tighter px-3 py-1 rounded-lg ${getPriorityColor(selectedTask.priority)} bg-[#1a3a24]/50`}>
                  {getPriorityLabel(selectedTask.priority)}
                </span>
              </div>

              {selectedTask.description && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição</h3>
                  <div className="text-gray-300 text-sm leading-relaxed bg-[#1a3a24]/30 p-4 rounded-xl border border-[#1a3a24] whitespace-pre-wrap">
                    {selectedTask.description}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status</h3>
                  <div className="bg-[#1a3a24]/30 p-3 rounded-xl border border-[#1a3a24]">
                    <p className="text-sm text-white font-medium">
                      {COLUMNS.find(c => c.id === selectedTask.status)?.label}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Responsável</h3>
                  <div className="flex items-center gap-2 bg-[#1a3a24]/30 p-3 rounded-xl border border-[#1a3a24]">
                    <div className="w-6 h-6 rounded-full bg-[#00ff88]/10 flex items-center justify-center text-[10px] text-[#00ff88] font-bold uppercase">
                      {selectedTask.assignee?.name?.[0] || selectedTask.assignee?.email?.[0]}
                    </div>
                    <p className="text-sm text-white font-medium truncate">
                      {selectedTask.assignee?.name || selectedTask.assignee?.email}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Data de Entrega</h3>
                  <div className="flex items-center gap-2 bg-[#1a3a24]/30 p-3 rounded-xl border border-[#1a3a24]">
                    <Calendar size={16} className="text-[#00ff88]" />
                    <p className="text-sm text-white font-medium">
                      {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Criado em</h3>
                  <div className="flex items-center gap-2 bg-[#1a3a24]/30 p-3 rounded-xl border border-[#1a3a24]">
                    <Clock size={16} className="text-gray-500" />
                    <p className="text-sm text-gray-400 font-medium">
                      {new Date(selectedTask.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
