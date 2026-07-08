'use client'

import { useState, useEffect } from 'react'
import { useTasks, Task, TaskStatus, TaskPriority } from '@/hooks/useTasks'
import { createClient } from '@/lib/supabase'
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  Clock, 
  Trash2,
  User as UserIcon,
  CheckCircle2,
  Circle,
  PlayCircle
} from 'lucide-react'

const COLUMNS: { id: TaskStatus; label: string; icon: any; color: string }[] = [
  { id: 'a_fazer', label: 'A Fazer', icon: Circle, color: 'text-gray-400' },
  { id: 'em_andamento', label: 'Em Andamento', icon: PlayCircle, color: 'text-blue-400' },
  { id: 'finalizada', label: 'Finalizadas', icon: CheckCircle2, color: 'text-emerald-400' },
]

export default function AdminTasksPage() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [colaboradores, setColaboradores] = useState<{id: string, name: string, email: string}[]>([])
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'media' as TaskPriority,
    due_date: ''
  })

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
    
    if (!newTask.title.trim()) {
      alert('O título é obrigatório')
      return
    }

    if (!newTask.assigned_to) {
      alert('Selecione um colaborador')
      return
    }

    try {
      const taskToCreate = {
        title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        assigned_to: newTask.assigned_to,
        priority: newTask.priority,
        status: 'a_fazer' as TaskStatus,
        due_date: newTask.due_date || null
      }

      await createTask(taskToCreate)
      setIsModalOpen(false)
      setNewTask({ title: '', description: '', assigned_to: '', priority: 'media', due_date: '' })
    } catch (err: any) {
      console.error('Erro no componente ao criar tarefa:', err)
      alert(`Erro ao criar tarefa: ${err.message || 'Verifique sua conexão'}`)
    }
  }

  const handleMoveTask = async (id: string, newStatus: TaskStatus) => {
    await updateTask(id, { status: newStatus })
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'alta': return 'text-red-500'
      case 'media': return 'text-amber-500'
      case 'baixa': return 'text-emerald-500'
    }
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Quadro Kanban</h1>
          <p className="text-gray-400 text-sm">Gerencie o fluxo de trabalho da equipe.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all"
        >
          <Plus size={20} />
          Nova Tarefa
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {COLUMNS.map((column) => (
          <div key={column.id} className="flex-1 min-w-[320px] bg-[#0f1a14]/50 border border-[#1a3a24] rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#1a3a24] flex items-center justify-between bg-[#0f1a14]">
              <div className="flex items-center gap-2">
                <column.icon size={18} className={column.color} />
                <h2 className="text-white font-bold text-sm uppercase tracking-widest">{column.label}</h2>
              </div>
              <span className="bg-[#1a3a24] text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {tasks.filter(t => t.status === column.id).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {tasks.filter(t => t.status === column.id).map((task) => (
                <div key={task.id} className="bg-[#0a0f0c] border border-[#1a3a24] rounded-xl p-4 hover:border-[#00ff88]/30 transition-all group shadow-lg">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-600 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-sm mb-2 line-clamp-2">{task.title}</h3>
                  {task.description && (
                    <p className="text-gray-500 text-xs line-clamp-2 mb-4">{task.description}</p>
                  )}

                  <div className="pt-4 border-t border-[#1a3a24] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center text-[10px] text-[#00ff88] font-bold uppercase">
                        {task.assignee?.name?.[0] || task.assignee?.email?.[0] || '?'}
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium truncate max-w-[80px]">
                        {task.assignee?.name || task.assignee?.email}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      {column.id !== 'a_fazer' && (
                        <button onClick={() => handleMoveTask(task.id, 'a_fazer')} title="Mover para A Fazer" className="p-1 text-gray-600 hover:text-white transition-colors">
                          <Circle size={14} />
                        </button>
                      )}
                      {column.id !== 'em_andamento' && (
                        <button onClick={() => handleMoveTask(task.id, 'em_andamento')} title="Mover para Em Andamento" className="p-1 text-gray-600 hover:text-blue-400 transition-colors">
                          <PlayCircle size={14} />
                        </button>
                      )}
                      {column.id !== 'finalizada' && (
                        <button onClick={() => handleMoveTask(task.id, 'finalizada')} title="Mover para Finalizada" className="p-1 text-gray-600 hover:text-emerald-400 transition-colors">
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Nova Tarefa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a3a24] flex justify-between items-center">
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
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Prioridade</label>
                  <select 
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})}
                    className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
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
    </div>
  )
}
