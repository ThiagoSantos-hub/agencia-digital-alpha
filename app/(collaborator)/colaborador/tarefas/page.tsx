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
  PlayCircle, 
  Trash2,
  X
} from 'lucide-react'

const COLUMNS: { id: TaskStatus; label: string; icon: any; color: string }[] = [
  { id: 'a_fazer', label: 'A Fazer', icon: Circle, color: 'text-gray-500' },
  { id: 'em_andamento', label: 'Em Andamento', icon: PlayCircle, color: 'text-blue-500' },
  { id: 'finalizada', label: 'Finalizadas', icon: CheckCircle2, color: 'text-emerald-500' },
]

export default function CollaboratorTasksPage() {
  const { user } = useAuth()
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
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
    <div className="p-8 space-y-8 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Minhas Tarefas</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie suas atividades e progresso.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0a0f0c] font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} />
          Criar Tarefa
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {COLUMNS.map((column) => (
          <div key={column.id} className="flex-1 min-w-[300px] bg-[#111]/50 border border-[#1a3a24] rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#1a3a24] flex items-center justify-between bg-[#111]">
              <div className="flex items-center gap-2">
                <column.icon size={18} className={column.color} />
                <h2 className="text-white font-bold text-xs uppercase tracking-widest">{column.label}</h2>
              </div>
              <span className="bg-[#1a3a24] text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {tasks.filter(t => t.status === column.id).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {tasks.filter(t => t.status === column.id).map((task) => (
                <div key={task.id} className="bg-[#0a0f0c] border border-[#1a3a24] rounded-xl p-4 hover:border-[#00ff88]/30 transition-all group shadow-md cursor-pointer" onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-700 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-sm mb-1 line-clamp-2">{task.title}</h3>
                  {task.description && (
                    <div className="text-gray-500 text-[11px] mb-3 whitespace-pre-wrap line-clamp-4">{task.description}</div>
                  )}

                  <div className="pt-3 border-t border-[#1a3a24] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <Calendar size={12} />
                      <span>{task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
                    </div>

                    <div className="flex gap-1">
                      {column.id !== 'a_fazer' && (
                        <button onClick={(e) => { e.stopPropagation(); handleMoveTask(task.id, 'a_fazer'); }} title="Mover para A Fazer" className="p-1 text-gray-600 hover:text-white transition-colors">
                          <Circle size={14} />
                        </button>
                      )}
                      {column.id !== 'em_andamento' && (
                        <button onClick={(e) => { e.stopPropagation(); handleMoveTask(task.id, 'em_andamento'); }} title="Mover para Em Andamento" className="p-1 text-gray-600 hover:text-blue-400 transition-colors">
                          <PlayCircle size={14} />
                        </button>
                      )}
                      {column.id !== 'finalizada' && (
                        <button onClick={(e) => { e.stopPropagation(); handleMoveTask(task.id, 'finalizada'); }} title="Mover para Finalizada" className="p-1 text-gray-600 hover:text-emerald-400 transition-colors">
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

      {/* Modal de Detalhes da Tarefa */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#1a3a24] flex justify-between items-center sticky top-0 bg-[#0a0f0c]">
              <h2 className="text-white font-bold text-lg">Detalhes da Tarefa</h2>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-500 hover:text-white text-2xl">
                <X size={24} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              {/* Título e Prioridade */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white mb-2">{selectedTask.title}</h1>
                    <span className={`inline-block text-xs font-black uppercase tracking-tighter px-3 py-1 rounded-lg ${getPriorityColor(selectedTask.priority)} bg-[#1a3a24]/50`}>
                      {selectedTask.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              {selectedTask.description && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição</h3>
                  <div className="text-gray-300 text-sm leading-relaxed bg-[#1a3a24]/30 p-4 rounded-xl border border-[#1a3a24] whitespace-pre-wrap">
                    {selectedTask.description}
                  </div>
                </div>
              )}

              {/* Grid de Informações */}
              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status</h3>
                  <div className="bg-[#1a3a24]/30 p-3 rounded-xl border border-[#1a3a24]">
                    <p className="text-sm text-white font-medium capitalize">
                      {selectedTask.status === 'a_fazer' ? 'A Fazer' : selectedTask.status === 'em_andamento' ? 'Em Andamento' : 'Finalizada'}
                    </p>
                  </div>
                </div>

                {/* Data de Entrega */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Data de Entrega</h3>
                  <div className="flex items-center gap-2 bg-[#1a3a24]/30 p-3 rounded-xl border border-[#1a3a24]">
                    <Calendar size={16} className="text-[#00ff88]" />
                    <p className="text-sm text-white font-medium">
                      {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                    </p>
                  </div>
                </div>

                {/* Criado em */}
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

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t border-[#1a3a24]">
                <button
                  onClick={() => {
                    handleMoveTask(selectedTask.id, 'a_fazer')
                    setIsDetailModalOpen(false)
                  }}
                  className="flex-1 py-2 px-4 bg-[#1a3a24] hover:bg-[#2a4a34] text-white text-sm font-bold rounded-xl transition-colors"
                >
                  Mover para A Fazer
                </button>
                <button
                  onClick={() => {
                    handleMoveTask(selectedTask.id, 'em_andamento')
                    setIsDetailModalOpen(false)
                  }}
                  className="flex-1 py-2 px-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-bold rounded-xl transition-colors"
                >
                  Mover para Em Andamento
                </button>
                <button
                  onClick={() => {
                    handleMoveTask(selectedTask.id, 'finalizada')
                    setIsDetailModalOpen(false)
                  }}
                  className="flex-1 py-2 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-bold rounded-xl transition-colors"
                >
                  Mover para Finalizada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Tarefa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a3a24] flex justify-between items-center">
              <h2 className="text-white font-bold">Criar Minha Tarefa</h2>
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
