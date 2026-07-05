'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTasks, Task, TaskStatus } from '@/hooks/useTasks'
import { useColaboradores } from '@/hooks/useColaboradores'
import { useAuth } from '@/hooks/useAuth'
import { 
  Plus, 
  Search, 
  Trash2, 
  Clock, 
  Play, 
  CheckCircle2,
  AlertCircle,
  X,
  User
} from 'lucide-react'

export default function AdminTarefasPage() {
  const { profile, loading: authLoading } = useAuth()
  const { tasks, listTasks, createTask, deleteTask, loading: tasksLoading } = useTasks()
  const { colaboradores } = useColaboradores()
  
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    collaborator_id: ''
  })

  useEffect(() => {
    listTasks()
  }, [listTasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      colaboradores.find(c => c.id === t.collaborator_id)?.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [tasks, search, colaboradores])

  const columns: { label: string; status: TaskStatus; icon: any; color: string }[] = [
    { label: 'A Fazer', status: 'a_fazer', icon: Clock, color: 'text-gray-400' },
    { label: 'Em Andamento', status: 'em_andamento', icon: Play, color: 'text-emerald-400' },
    { label: 'Finalizada', status: 'finalizada', icon: CheckCircle2, color: 'text-blue-400' },
  ]

  const tasksByStatus = useMemo(() => {
    return {
      a_fazer: filteredTasks.filter(t => t.status === 'a_fazer'),
      em_andamento: filteredTasks.filter(t => t.status === 'em_andamento'),
      finalizada: filteredTasks.filter(t => t.status === 'finalizada'),
    }
  }, [filteredTasks])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.collaborator_id) return
    
    setSaving(true)
    try {
      await createTask(form)
      setModalOpen(false)
      setForm({ title: '', description: '', collaborator_id: '' })
      listTasks()
    } catch (error) {
      console.error('Erro ao criar tarefa:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return
    try {
      await deleteTask(id)
      listTasks()
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
      </div>
    )
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">Acesso Negado</h1>
          <p className="text-gray-400 mt-2">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 h-[calc(100vh-64px)] flex flex-col space-y-8 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Tarefas</h1>
          <p className="text-gray-400 text-sm mt-1">Visão geral do progresso de toda a equipe.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm"
        >
          <Plus size={18} />
          Nova Tarefa
        </button>
      </div>

      {/* Busca */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input 
          type="text" 
          placeholder="Buscar por tarefa ou colaborador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
        />
      </div>

      {/* Board Kanban */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {columns.map((col) => (
          <div key={col.status} className="flex flex-col bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1a3a24] flex items-center justify-between bg-[#0d1410]">
              <div className="flex items-center gap-2">
                <col.icon size={18} className={col.color} />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">{col.label}</h3>
              </div>
              <span className="bg-[#1a3a24] text-emerald-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                {tasksByStatus[col.status].length}
              </span>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20">
              {tasksLoading && tasks.length === 0 ? (
                <div className="py-8 text-center text-gray-600 text-xs italic">Carregando...</div>
              ) : tasksByStatus[col.status].length === 0 ? (
                <div className="py-8 text-center text-gray-600 text-xs italic border-2 border-dashed border-[#1a3a24] rounded-xl">
                  Nenhuma tarefa
                </div>
              ) : (
                tasksByStatus[col.status].map((task) => {
                  const collaborator = colaboradores.find(c => c.id === task.collaborator_id)
                  return (
                    <div key={task.id} className="bg-[#121a15] border border-[#1a3a24] p-4 rounded-xl group hover:border-emerald-500/50 transition-all shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold text-gray-100 leading-tight">{task.title}</h4>
                        <button 
                          onClick={() => handleDelete(task.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Excluir tarefa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {task.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-[#1a3a24]">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[8px] font-bold text-emerald-400 uppercase">
                            {collaborator?.name?.[0] || '?'}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {collaborator?.name || 'Não atribuído'}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-600 font-medium">
                          {new Date(task.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova Tarefa */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-[#1a3a24] bg-[#0d1410] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Nova Tarefa</h2>
                <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold">Atribuir ao time</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Título da Tarefa</label>
                <input 
                  required
                  type="text" 
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Criar artes para o Instagram"
                  className="w-full bg-[#121a15] border border-[#1a3a24] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Descrição (Opcional)</label>
                <textarea 
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalhes sobre a entrega..."
                  rows={3}
                  className="w-full bg-[#121a15] border border-[#1a3a24] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Responsável</label>
                <select 
                  required
                  value={form.collaborator_id}
                  onChange={(e) => setForm({ ...form, collaborator_id: e.target.value })}
                  className="w-full bg-[#121a15] border border-[#1a3a24] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">Selecione um colaborador...</option>
                  {colaboradores.filter(c => c.status === 'ativo').map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-[#1a3a24] text-gray-400 font-bold hover:bg-[#1a3a24]/30 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 rounded-xl bg-emerald-500 text-black font-black hover:bg-emerald-400 transition-all text-sm disabled:opacity-50"
                >
                  {saving ? 'Criando...' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
