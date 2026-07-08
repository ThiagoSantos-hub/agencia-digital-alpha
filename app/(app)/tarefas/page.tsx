'use client'

import { useEffect, useState, useMemo } from 'react'
import { useTasks, Task, TaskStatus } from '@/hooks/useTasks'
import { useColaboradores } from '@/hooks/useColaboradores'
import { useAuth } from '@/hooks/useAuth'
import { 
  Plus, Search, Trash2, Clock, Play, CheckCircle2,
  AlertCircle, X, Calendar, Flag, Loader2
} from 'lucide-react'

export default function AdminTarefasPage() {
  const { profile, loading: authLoading } = useAuth()
  const { tasks, listTasks, createTask, deleteTask, updateTask, loading: tasksLoading, error: taskError } = useTasks()
  const { colaboradores } = useColaboradores()
  
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    title: '', description: '', collaborator_id: '', priority: 'media' as any, due_date: ''
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
    { label: 'Pendente', status: 'a_fazer', icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-500/5' },
    { label: 'Em Curso', status: 'em_andamento', icon: Play, color: 'text-emerald-400', bgColor: 'bg-emerald-500/5' },
    { label: 'Concluído', status: 'finalizada', icon: CheckCircle2, color: 'text-blue-400', bgColor: 'bg-blue-500/5' },
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
      console.error('Erro:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir?')) return
    try { await deleteTask(id) } catch (error) {}
  }

  const handleMoveTask = async (id: string, newStatus: TaskStatus) => {
    try { await updateTask(id, { status: newStatus }) } catch (error) {}
  }

  if (authLoading) return <div className="min-h-screen bg-[#0a0f0c] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>

  return (
    <div className="p-4 h-[calc(100vh-64px)] flex flex-col space-y-4 overflow-hidden bg-[#0a0f0c]">
      {/* Mini Header */}
      <div className="flex items-center justify-between gap-4 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-white tracking-tighter">Tarefas</h1>
          <div className="h-4 w-[1px] bg-gray-800"></div>
          <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">Digital Alpha</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-700" size={12} />
            <input 
              type="text" placeholder="Filtrar..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#0d1410] border border-[#1a3a24] rounded-lg pl-8 pr-2 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500/30 w-32 transition-all"
            />
          </div>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[10px]"
          >
            <Plus size={12} /> NOVO JOB
          </button>
        </div>
      </div>

      {/* Ultra Compact Kanban */}
      <div className="flex-1 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {columns.map((col) => (
          <div key={col.status} className="flex flex-col min-w-[260px] w-1/3 bg-[#0d1410]/20 border border-[#1a3a24]/20 rounded-2xl overflow-hidden">
            <div className="p-3 border-b border-[#1a3a24]/50 flex items-center justify-between bg-[#0d1410]/50">
              <div className="flex items-center gap-2">
                <col.icon size={12} className={col.color} />
                <h3 className="font-black text-[9px] text-gray-400 uppercase tracking-widest">{col.label}</h3>
              </div>
              <span className="text-emerald-500 text-[9px] font-black">{tasksByStatus[col.status]?.length || 0}</span>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-none">
              {(tasksByStatus[col.status] as Task[]).map((task) => {
                const collaborator = colaboradores.find(c => c.id === task.collaborator_id)
                return (
                  <div key={task.id} className="bg-[#121a15]/80 border border-[#1a3a24] p-3 rounded-xl group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-[11px] font-bold text-gray-200 leading-tight">{task.title}</h4>
                      <button onClick={() => handleDelete(task.id)} className="text-gray-800 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"><Trash2 size={10} /></button>
                    </div>
                    
                    {task.description && <p className="text-[9px] text-gray-600 line-clamp-1 mb-2 leading-snug">{task.description}</p>}

                    <div className="flex items-center justify-between pt-2 border-t border-[#1a3a24]/30">
                      <div className="flex items-center gap-1.5">
                        <div className="h-4 w-4 rounded-md bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-[7px] font-black text-emerald-500/40 uppercase">{collaborator?.name?.[0] || '?'}</div>
                        <span className="text-[8px] text-gray-600 font-bold truncate max-w-[60px]">{collaborator?.name || '---'}</span>
                      </div>
                      <div className="flex gap-1">
                        {col.status !== 'a_fazer' && <button onClick={() => handleMoveTask(task.id, 'a_fazer')} className="p-0.5 text-gray-700 hover:text-white"><Clock size={10} /></button>}
                        {col.status !== 'em_andamento' && <button onClick={() => handleMoveTask(task.id, 'em_andamento')} className="p-0.5 text-gray-700 hover:text-emerald-400"><Play size={10} /></button>}
                        {col.status !== 'finalizada' && <button onClick={() => handleMoveTask(task.id, 'finalizada')} className="p-0.5 text-gray-700 hover:text-blue-400"><CheckCircle2 size={10} /></button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Ultra Compact Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a3a24] bg-[#0d1410] flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Novo Job</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-600 hover:text-white p-1"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-emerald-500 uppercase tracking-widest ml-1">Título</label>
                <input required type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Título da tarefa..." className="w-full bg-[#121a15] border border-[#1a3a24] rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-emerald-500 uppercase tracking-widest ml-1">Briefing</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalhes..." rows={2} className="w-full bg-[#121a15] border border-[#1a3a24] rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-500 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-emerald-500 uppercase tracking-widest ml-1">Time</label>
                  <select value={form.collaborator_id} onChange={(e) => setForm({ ...form, collaborator_id: e.target.value })}
                    className="w-full bg-[#121a15] border border-[#1a3a24] rounded-xl px-2 py-2 text-[10px] text-white focus:outline-none appearance-none cursor-pointer">
                    <option value="">Ninguém</option>
                    {colaboradores.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-emerald-500 uppercase tracking-widest ml-1">Prioridade</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-[#121a15] border border-[#1a3a24] rounded-xl px-2 py-2 text-[10px] text-white focus:outline-none appearance-none cursor-pointer">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 rounded-xl border border-[#1a3a24] text-gray-600 font-black text-[10px] uppercase">Sair</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-[#00ff88] text-black font-black text-[10px] uppercase disabled:opacity-50">
                  {saving ? '...' : 'CRIAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
