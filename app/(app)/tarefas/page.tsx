'use client'

import { useEffect, useState, useMemo } from 'react'
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
  Calendar,
  Flag,
  Loader2
} from 'lucide-react'

export default function AdminTarefasPage() {
  const { profile, loading: authLoading } = useAuth()
  const { tasks, listTasks, createTask, deleteTask, updateTask, loading: tasksLoading, error: taskError } = useTasks()
  const { colaboradores } = useColaboradores()
  
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    collaborator_id: '',
    priority: 'media' as any,
    due_date: ''
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

  const columns: { label: string; status: TaskStatus; icon: any; color: string; bgColor: string }[] = [
    { label: 'A Fazer', status: 'a_fazer', icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
    { label: 'Em Andamento', status: 'em_andamento', icon: Play, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    { label: 'Finalizada', status: 'finalizada', icon: CheckCircle2, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  ]

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {
      a_fazer: filteredTasks.filter(t => t.status === 'a_fazer' || t.status === 'pendente'),
      em_andamento: filteredTasks.filter(t => t.status === 'em_andamento'),
      finalizada: filteredTasks.filter(t => t.status === 'finalizada' || t.status === 'concluida'),
    }
    return map
  }, [filteredTasks])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) return
    
    setSaving(true)
    try {
      await createTask(form)
      setModalOpen(false)
      setForm({ title: '', description: '', collaborator_id: '', priority: 'media', due_date: '' })
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
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error)
    }
  }

  const handleMoveTask = async (id: string, newStatus: TaskStatus) => {
    try {
      await updateTask(id, { status: newStatus })
    } catch (error) {
      console.error('Erro ao mover tarefa:', error)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center p-6">
        <div className="text-center bg-[#0d1410] border border-[#1a3a24] p-10 rounded-3xl max-w-sm">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">Acesso Restrito</h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">Esta área é exclusiva para administradores da agência.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col space-y-6 overflow-hidden bg-[#0a0f0c]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Fluxo de Tarefas</h1>
          <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Gestão Operacional</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#0d1410] border border-[#1a3a24] rounded-lg pl-9 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-emerald-500/50 transition-all w-40"
            />
          </div>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-black px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-[11px] shadow-lg shadow-emerald-500/10"
          >
            <Plus size={14} />
            NOVA TAREFA
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-emerald-500/10">
        {columns.map((col) => (
          <div key={col.status} className="flex flex-col min-w-[280px] w-1/3 bg-[#0d1410]/30 border border-[#1a3a24]/30 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1a3a24] flex items-center justify-between bg-[#0d1410]">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md ${col.bgColor}`}>
                  <col.icon size={14} className={col.color} />
                </div>
                <h3 className="font-black text-[10px] text-white uppercase tracking-widest">{col.label}</h3>
              </div>
              <span className="bg-[#1a3a24] text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20">
                {tasksByStatus[col.status]?.length || 0}
              </span>
            </div>

            <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-none">
              {tasksLoading && tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-20">
                  <Loader2 size={20} className="animate-spin mb-2" />
                  <span className="text-[8px] uppercase font-bold tracking-widest">Sincronizando...</span>
                </div>
              ) : (tasksByStatus[col.status]?.length || 0) === 0 ? (
                <div className="py-10 text-center border border-dashed border-[#1a3a24]/20 rounded-2xl">
                  <p className="text-gray-800 text-[9px] font-black uppercase tracking-widest">Vazio</p>
                </div>
              ) : (
                (tasksByStatus[col.status] as Task[]).map((task) => {
                  const collaborator = colaboradores.find(c => c.id === task.collaborator_id)
                  return (
                    <div key={task.id} className="bg-[#121a15] border border-[#1a3a24] p-4 rounded-xl group hover:border-emerald-500/30 transition-all shadow-lg shadow-black/10">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-[12px] font-bold text-gray-100 leading-tight">{task.title}</h4>
                        <button 
                          onClick={() => handleDelete(task.id)}
                          className="text-gray-800 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      
                      {task.description && (
                        <p className="text-[10px] text-gray-600 line-clamp-2 mb-3 leading-snug">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <div className="flex items-center gap-1 bg-[#0a0f0c] border border-[#1a3a24] px-1.5 py-0.5 rounded-md">
                          <Flag size={8} className={task.priority === 'urgente' ? 'text-red-500' : task.priority === 'alta' ? 'text-orange-500' : 'text-emerald-500'} />
                          <span className="text-[8px] font-black uppercase tracking-tighter text-gray-500">{task.priority}</span>
                        </div>
                        {task.due_date && (
                          <div className="flex items-center gap-1 bg-[#0a0f0c] border border-[#1a3a24] px-1.5 py-0.5 rounded-md">
                            <Calendar size={8} className="text-gray-600" />
                            <span className="text-[8px] font-black uppercase tracking-tighter text-gray-500">
                              {new Date(task.due_date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-[#1a3a24]/30">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-md bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-[8px] font-black text-emerald-500/50 uppercase">
                            {collaborator?.name?.[0] || '?'}
                          </div>
                          <span className="text-[9px] text-gray-600 font-bold truncate max-w-[80px]">
                            {collaborator?.name || '---'}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {col.status !== 'a_fazer' && (
                            <button onClick={() => handleMoveTask(task.id, 'a_fazer')} className="p-1 bg-[#0a0f0c] rounded text-gray-600 hover:text-white transition-all">
                              <Clock size={10} />
                            </button>
                          )}
                          {col.status !== 'em_andamento' && (
                            <button onClick={() => handleMoveTask(task.id, 'em_andamento')} className="p-1 bg-[#0a0f0c] rounded text-gray-600 hover:text-emerald-400 transition-all">
                              <Play size={10} />
                            </button>
                          )}
                          {col.status !== 'finalizada' && (
                            <button onClick={() => handleMoveTask(task.id, 'finalizada')} className="p-1 bg-[#0a0f0c] rounded text-gray-600 hover:text-blue-400 transition-all">
                              <CheckCircle2 size={10} />
                            </button>
                          )}
                        </div>
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-[#1a3a24] bg-[#0d1410] flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Nova Tarefa</h2>
                <p className="text-emerald-500 text-[10px] mt-1 uppercase font-black tracking-[0.2em]">Agência Digital Alpha</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-600 hover:text-white transition-all bg-[#1a3a24] p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-10 space-y-8">
              {taskError && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3">
                  <AlertCircle size={18} className="text-red-500" />
                  <p className="text-red-500 text-xs font-bold">{taskError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Título do Job</label>
                  <input 
                    required
                    type="text" 
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="O que precisa ser feito?"
                    className="w-full bg-[#121a15] border border-[#1a3a24] rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Briefing / Descrição</label>
                  <textarea 
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Detalhes e observações importantes..."
                    rows={3}
                    className="w-full bg-[#121a15] border border-[#1a3a24] rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Responsável</label>
                  <select 
                    value={form.collaborator_id}
                    onChange={(e) => setForm({ ...form, collaborator_id: e.target.value })}
                    className="w-full bg-[#121a15] border border-[#1a3a24] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {colaboradores.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Prioridade</label>
                  <select 
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-[#121a15] border border-[#1a3a24] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-8 py-4 rounded-2xl border border-[#1a3a24] text-gray-500 font-black hover:bg-[#1a3a24]/30 transition-all text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-8 py-4 rounded-2xl bg-[#00ff88] text-black font-black hover:bg-[#00ff88]/90 transition-all text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'CRIAR JOB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
