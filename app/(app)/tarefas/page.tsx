'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTasks, Task, TaskStatus } from '@/hooks/useTasks'
import { useColaboradores } from '@/hooks/useColaboradores'
import { useAuth } from '@/hooks/useAuth'
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Clock, 
  Play, 
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react'

export default function AdminTarefasPage() {
  const { profile, loading: authLoading } = useAuth()
  const { tasks, listTasks, createTask, deleteTask, loading: tasksLoading } = useTasks()
  const { colaboradores } = useColaboradores()
  
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
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
    return tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'todos' ? true : t.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [tasks, search, filterStatus])

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

  const getStatusInfo = useCallback((status: string) => {
    switch (status) {
      case 'a_fazer': return { label: 'A Fazer', color: 'text-gray-400', icon: Clock, bg: 'bg-gray-400/10' }
      case 'em_andamento': return { label: 'Em Andamento', color: 'text-emerald-400', icon: Play, bg: 'bg-emerald-400/10' }
      case 'finalizada': return { label: 'Finalizada', color: 'text-blue-400', icon: CheckCircle2, bg: 'bg-blue-400/10' }
      default: return { label: status, color: 'text-gray-400', icon: AlertCircle, bg: 'bg-gray-400/10' }
    }
  }, [])

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
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Tarefas</h1>
          <p className="text-gray-400 text-sm mt-1">Atribua e acompanhe as tarefas da equipe.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm"
        >
          <Plus size={18} />
          Nova Tarefa
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
        >
          <option value="todos">Todos os status</option>
          <option value="a_fazer">A Fazer</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="finalizada">Finalizada</option>
        </select>
      </div>

      {/* Tabela de Tarefas */}
      <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1a3a24] bg-[#0d1410]">
              <th className="px-6 py-4 text-xs font-black text-emerald-500 uppercase tracking-widest">Tarefa</th>
              <th className="px-6 py-4 text-xs font-black text-emerald-500 uppercase tracking-widest">Colaborador</th>
              <th className="px-6 py-4 text-xs font-black text-emerald-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-black text-emerald-500 uppercase tracking-widest">Criada em</th>
              <th className="px-6 py-4 text-xs font-black text-emerald-500 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a3a24]">
            {tasksLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">Carregando tarefas...</td></tr>
            ) : filteredTasks.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">Nenhuma tarefa encontrada.</td></tr>
            ) : (
              filteredTasks.map((task) => {
                const statusInfo = getStatusInfo(task.status)
                const collaborator = colaboradores.find(c => c.id === task.collaborator_id)
                const StatusIcon = statusInfo.icon

                return (
                  <tr key={task.id} className="hover:bg-[#121a15] transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white">{task.title}</p>
                      {task.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 uppercase">
                          {collaborator?.name?.[0] || '?'}
                        </div>
                        <span className="text-sm text-gray-300">{collaborator?.name || 'Não atribuído'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} text-[10px] font-black uppercase tracking-wider`}>
                        <StatusIcon size={12} />
                        {statusInfo.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                      {new Date(task.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(task.id)}
                        className="p-2 text-gray-600 hover:text-red-400 transition-colors"
                        title="Excluir tarefa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
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
