'use client'

import { useState } from 'react'
import { useTasks, Task, TaskStatus, TaskPriority } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2,
  Circle,
  Trash2,
  AlertCircle
} from 'lucide-react'

export default function CollaboratorTasksPage() {
  const { user } = useAuth()
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'media' as TaskPriority,
    due_date: ''
  })

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createTask({ ...newTask, assigned_to: user?.id })
      setIsModalOpen(false)
      setNewTask({ title: '', description: '', priority: 'media', due_date: '' })
    } catch (err) {
      alert('Erro ao criar tarefa')
    }
  }

  const toggleStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'concluida' ? 'pendente' : 'concluida'
    await updateTask(task.id, { status: newStatus })
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'alta': return 'text-red-500'
      case 'media': return 'text-amber-500'
      case 'baixa': return 'text-emerald-500'
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Minhas Tarefas</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie suas atividades diárias e entregas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all"
        >
          <Plus size={20} />
          Criar Tarefa
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 text-center text-gray-500">Carregando tarefas...</div>
        ) : tasks.length === 0 ? (
          <div className="py-20 text-center bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl">
            <CheckCircle2 size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400">Você não tem tarefas no momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className={`bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl p-4 flex items-center gap-4 hover:border-[#00ff88]/30 transition-all group ${task.status === 'concluida' ? 'opacity-60' : ''}`}
              >
                <button 
                  onClick={() => toggleStatus(task)}
                  className={`shrink-0 transition-colors ${task.status === 'concluida' ? 'text-emerald-500' : 'text-gray-600 hover:text-emerald-500'}`}
                >
                  {task.status === 'concluida' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>

                <div className="flex-1 min-w-0">
                  <h3 className={`text-white font-bold text-sm line-clamp-1 ${task.status === 'concluida' ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                      <Clock size={12} />
                      <span className={getPriorityColor(task.priority)}>{task.priority}</span>
                    </div>
                    {task.due_date && (
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                        <Calendar size={12} />
                        <span>{new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-500 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Nova Tarefa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a3a24] flex justify-between items-center">
              <h2 className="text-white font-bold">Criar Minha Tarefa</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">×</button>
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
                  placeholder="O que você precisa fazer?"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Descrição (Opcional)</label>
                <textarea 
                  rows={3}
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full bg-[#1a3a24]/20 border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                  placeholder="Mais detalhes..."
                />
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
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all mt-4"
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
