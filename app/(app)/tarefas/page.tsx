'use client'

import { useState, useEffect } from 'react'
import { useTasks, Task, TaskStatus, TaskPriority } from '@/hooks/useTasks'
import { createClient } from '@/lib/supabase'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Trash2,
  User as UserIcon
} from 'lucide-react'

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
    try {
      await createTask(newTask)
      setIsModalOpen(false)
      setNewTask({ title: '', description: '', assigned_to: '', priority: 'media', due_date: '' })
    } catch (err) {
      alert('Erro ao criar tarefa')
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'concluida': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'em_andamento': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'cancelada': return 'bg-red-500/10 text-red-500 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'alta': return 'text-red-500'
      case 'media': return 'text-amber-500'
      case 'baixa': return 'text-emerald-500'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Tarefas</h1>
          <p className="text-gray-400 text-sm">Atribua e monitore as atividades da equipe.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all"
        >
          <Plus size={20} />
          Nova Tarefa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lista de Tarefas */}
        <div className="md:col-span-3 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Carregando tarefas...</div>
          ) : tasks.length === 0 ? (
            <div className="py-20 text-center bg-[#0f1a14] border border-[#1a3a24] rounded-2xl">
              <CheckCircle2 size={48} className="mx-auto text-gray-700 mb-4" />
              <p className="text-gray-400">Nenhuma tarefa encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <div key={task.id} className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5 hover:border-[#00ff88]/30 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => deleteTask(task.id)} className="p-1.5 text-gray-500 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-white font-bold mb-2 line-clamp-1">{task.title}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-4 h-10">{task.description || 'Sem descrição'}</p>

                  <div className="space-y-3 pt-4 border-t border-[#1a3a24]">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-400">
                        <UserIcon size={14} />
                        <span>{task.assignee?.name || 'Não atribuída'}</span>
                      </div>
                      <span className={`font-bold uppercase ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={14} />
                      <span>Prazo: {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Nova Tarefa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a3a24] flex justify-between items-center">
              <h2 className="text-white font-bold">Criar Nova Tarefa</h2>
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
