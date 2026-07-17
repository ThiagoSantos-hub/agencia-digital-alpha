'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTasks, Task, TaskStatus, TaskPriority } from '@/hooks/useTasks'
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
  ExternalLink
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
  loading: () => <div className="w-80 h-full bg-hover-bg/10 rounded-xl animate-pulse" />
})

const TaskCard = dynamic(() => import('@/components/tasks/TaskCard').then(mod => mod.TaskCard), {
  loading: () => <div className="h-32 bg-hover-bg/5 rounded-xl animate-pulse" />
})

const COLUMNS: { id: TaskStatus; label: string; icon: any; color: string }[] = [
  { id: 'pendente', label: 'Pendências', icon: PauseCircle, color: 'text-amber-600' },
  { id: 'a_fazer', label: 'A Fazer', icon: Circle, color: 'text-text-muted' },
  { id: 'em_andamento', label: 'Em Andamento', icon: PlayCircle, color: 'text-primary' },
  { id: 'finalizada', label: 'Finalizadas', icon: CheckCircle2, color: 'text-cta' },
]

export default function AdminTasksPage() {
  const { tasks, createTask, updateTask, deleteTask } = useTasks()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<{id: string, name: string, email: string, role: string}[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'media' as TaskPriority,
    due_date: '',
    drive_link: '',
    status: 'a_fazer' as TaskStatus
  })
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
    async function fetchUsers() {
      const supabase = createClient()
      const { data, error } = await supabase.from('profiles').select('id, name, email, role').order('name')
      if (error) console.error('Erro ao buscar usuários:', error)
      else setAllUsers(data || [])
    }
    fetchUsers()
  }, [])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title.trim() || !newTask.assigned_to) {
      alert('Por favor, preencha o título e selecione um colaborador.')
      return
    }
    try {
      await createTask({
        ...newTask,
        description: newTask.description.trim() || null,
        due_date: newTask.due_date || null
      })
      setIsModalOpen(false)
      setNewTask({ title: '', description: '', assigned_to: '', priority: 'media', due_date: '', drive_link: '', status: 'a_fazer' })
    } catch (err: any) {
      alert(`Erro ao criar tarefa: ${err.message || 'Erro desconhecido'}`)
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
        drive_link: editingTask.drive_link,
        status: editingTask.status
      })
      setIsEditModalOpen(false)
      setEditingTask(null)
    } catch {
      alert('Erro ao atualizar tarefa')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    if (COLUMNS.some((col) => col.id === over.id)) {
      const task = tasks.find((t) => t.id === active.id)
      if (task && task.status !== over.id) updateTask(task.id, { status: over.id as TaskStatus })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return
    const overTask = tasks.find((t) => t.id === over.id)
    const activeItem = tasks.find((t) => t.id === active.id)
    if (activeItem && overTask && activeItem.status !== overTask.status) {
      updateTask(activeItem.id, { status: overTask.status })
    }
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgente': return 'text-red-600'
      case 'alta': return 'text-red-500'
      case 'media': return 'text-amber-500'
      case 'baixa': return 'text-cta'
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

  const inputCls = 'w-full bg-hover-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary/50'
  const primaryBtn = 'flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-sm'
  const primaryBtnFull = 'w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all mt-4 shadow-sm'

  return (
    <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col px-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Quadro Kanban</h1>
          <p className="text-text-muted text-sm">Gerencie suas tarefas arrastando-as entre as colunas.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={primaryBtn}>
          <Plus size={20} />
          Nova Tarefa
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
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
          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
        }}>
          {activeTask ? (
            <div className="w-[320px]">
              <TaskCard task={activeTask} userRole="admin" onDuplicate={() => {}} onEdit={() => {}} onDelete={() => {}} onMove={() => {}} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface shrink-0 rounded-t-2xl">
              <h2 className="text-text-main font-bold">Criar Nova Tarefa</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-main text-2xl">&times;</button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Título</label>
                <input required type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className={inputCls} placeholder="Ex: Criar artes para o Cliente X" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Descrição</label>
                <textarea rows={3} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className={`${inputCls} resize-none`} placeholder="Detalhes da tarefa..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Atribuir a</label>
                  <select required value={newTask.assigned_to} onChange={e => setNewTask({...newTask, assigned_to: e.target.value})} className={inputCls}>
                    <option value="">Selecione...</option>
                    {allUsers.map(u => (<option key={u.id} value={u.id}>{u.role === 'admin' ? 'ADM: ' : ''}{u.name || u.email}</option>))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Status Inicial</label>
                  <select value={newTask.status} onChange={e => setNewTask({...newTask, status: e.target.value as TaskStatus})} className={inputCls}>
                    {COLUMNS.map(col => (<option key={col.id} value={col.id}>{col.label}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Prioridade</label>
                  <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})} className={inputCls}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Data de Entrega</label>
                  <input type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Link do Google Drive (Opcional)</label>
                <input type="url" value={newTask.drive_link} onChange={e => setNewTask({...newTask, drive_link: e.target.value})} className={inputCls} placeholder="https://drive.google.com/..." />
              </div>
              <button type="submit" className={primaryBtnFull}>Criar Tarefa</button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface">
              <h2 className="text-text-main font-bold">Editar Tarefa</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-text-muted hover:text-text-main text-2xl">&times;</button>
            </div>
            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Título</label>
                <input required type="text" value={editingTask.title} onChange={e => setEditingTask({...editingTask, title: e.target.value})} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Descrição</label>
                <textarea rows={3} value={editingTask.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} className={`${inputCls} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Atribuir a</label>
                  <select required value={editingTask.assigned_to} onChange={e => setEditingTask({...editingTask, assigned_to: e.target.value})} className={inputCls}>
                    <option value="">Selecione...</option>
                    {allUsers.map(u => (<option key={u.id} value={u.id}>{u.role === 'admin' ? 'ADM: ' : ''}{u.name || u.email}</option>))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Status</label>
                  <select value={editingTask.status} onChange={e => setEditingTask({...editingTask, status: e.target.value as TaskStatus})} className={inputCls}>
                    {COLUMNS.map(col => (<option key={col.id} value={col.id}>{col.label}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Prioridade</label>
                  <select value={editingTask.priority} onChange={e => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})} className={inputCls}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Data de Entrega</label>
                  <input type="date" value={editingTask.due_date ? editingTask.due_date.split('T')[0] : ''} onChange={e => setEditingTask({...editingTask, due_date: e.target.value})} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Link do Google Drive (Opcional)</label>
                <input type="url" value={editingTask.drive_link || ''} onChange={e => setEditingTask({...editingTask, drive_link: e.target.value})} className={inputCls} placeholder="https://drive.google.com/..." />
              </div>
              <button type="submit" className={primaryBtnFull}>Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl w-full max-w-lg shadow-2xl">
            <div className="px-4 py-3 border-b border-border flex justify-between items-center">
              <h2 className="text-text-main font-bold text-base">Detalhes da Tarefa</h2>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-text-muted hover:text-text-main"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <h1 className="text-lg font-bold text-text-main">{selectedTask.title}</h1>
                <span className={`inline-block text-xs font-black uppercase tracking-tighter px-2 py-0.5 rounded-lg ${getPriorityColor(selectedTask.priority)} bg-hover-bg/50`}>
                  {getPriorityLabel(selectedTask.priority)}
                </span>
              </div>
              {selectedTask.description && (
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Descrição</h3>
                  <div className="text-text-main text-sm leading-relaxed bg-hover-bg p-3 rounded-lg border border-border whitespace-pre-wrap overflow-y-auto max-h-48 custom-scrollbar">{selectedTask.description}</div>
                </div>
              )}
              {selectedTask.drive_link && (
                <a href={selectedTask.drive_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg font-bold transition-all text-sm">
                  <ExternalLink size={16} /> Abrir Google Drive
                </a>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Status</h3>
                  <div className="bg-hover-bg p-2 rounded-lg border border-border">
                    <p className="text-sm text-text-main font-medium capitalize">{COLUMNS.find(c => c.id === selectedTask.status)?.label}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Atribuído a</h3>
                  <div className="bg-hover-bg p-2 rounded-lg border border-border">
                    <p className="text-sm text-text-main font-medium">{selectedTask.assignee?.name || selectedTask.assignee?.email || 'Não atribuído'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Data de Entrega</h3>
                  <div className="flex items-center gap-2 bg-hover-bg p-2 rounded-lg border border-border">
                    <Calendar size={14} className="text-primary" />
                    <p className="text-sm text-text-main font-medium">{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Criado em</h3>
                  <div className="flex items-center gap-2 bg-hover-bg p-2 rounded-lg border border-border">
                    <Clock size={14} className="text-text-muted" />
                    <p className="text-sm text-text-muted font-medium">{new Date(selectedTask.created_at).toLocaleDateString('pt-BR')}</p>
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
