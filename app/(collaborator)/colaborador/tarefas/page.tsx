'use client'

import { useEffect, useState, useMemo } from 'react'
import { useTasks, Task, TaskStatus } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal,
  ArrowRight,
  RotateCcw,
  Plus,
  X,
  Trash2,
  Loader2
} from 'lucide-react'

export default function ColaboradorTarefasPage() {
  const { user } = useAuth()
  const { tasks, listTasks, updateTask, createTask, deleteTask, loading } = useTasks()
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function getCollaborator() {
      if (!user) return
      const { data } = await supabase
        .from('collaborators')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (data) {
        setCollaboratorId(data.id)
        listTasks({ collaboratorId: data.id })
      }
    }
    getCollaborator()
  }, [user, listTasks, supabase])

  const columns: { label: string; status: TaskStatus; icon: any; color: string }[] = [
    { label: 'A Fazer', status: 'a_fazer', icon: Clock, color: 'text-gray-400' },
    { label: 'Em Andamento', status: 'em_andamento', icon: Play, color: 'text-emerald-400' },
    { label: 'Finalizada', status: 'finalizada', icon: CheckCircle2, color: 'text-blue-400' },
  ]

  const tasksByStatus = useMemo(() => {
    return {
      a_fazer: tasks.filter(t => t.status === 'a_fazer' || t.status === 'pendente'),
      em_andamento: tasks.filter(t => t.status === 'em_andamento'),
      finalizada: tasks.filter(t => t.status === 'finalizada' || t.status === 'concluida'),
    }
  }, [tasks])

  const handleMove = async (id: string, newStatus: TaskStatus) => {
    try {
      await updateTask(id, { status: newStatus })
    } catch (error) {
      console.error('Erro ao mover tarefa:', error)
    }
  }

  const handleCreate = async () => {
    if (!form.title || !collaboratorId) return
    setSaving(true)
    await createTask({ title: form.title, description: form.description, collaborator_id: collaboratorId })
    setModalOpen(false)
    setForm({ title: '', description: '' })
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta tarefa?')) return
    await deleteTask(id)
  }

  return (
    <div className="p-8 h-[calc(100vh-64px)] flex flex-col space-y-8 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Minhas Tarefas</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie seu fluxo de trabalho no Kanban.</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20">
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {columns.map((col) => (
          <div key={col.status} className="flex flex-col bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1a3a24] flex items-center justify-between bg-[#0d1410]">
              <div className="flex items-center gap-2">
                <col.icon size={18} className={col.color} />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">{col.label}</h3>
              </div>
              <span className="bg-[#1a3a24] text-emerald-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                {(tasksByStatus as any)[col.status]?.length || 0}
              </span>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20">
              {loading && tasks.length === 0 ? (
                <div className="py-8 text-center text-gray-600 text-xs italic">Carregando...</div>
              ) : ((tasksByStatus as any)[col.status]?.length || 0) === 0 ? (
                <div className="py-8 text-center text-gray-600 text-xs italic border-2 border-dashed border-[#1a3a24] rounded-xl">
                  Nenhuma tarefa aqui
                </div>
              ) : (
                (tasksByStatus as any)[col.status].map((task: Task) => (
                  <div key={task.id} className="bg-[#121a15] border border-[#1a3a24] p-4 rounded-xl group hover:border-emerald-500/50 transition-all shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-gray-100 leading-tight">{task.title}</h4>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDelete(task.id)}
                          className="text-gray-600 hover:text-red-500 transition-colors p-1"
                          title="Excluir tarefa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-[#1a3a24]">
                      <span className="text-[10px] text-gray-600 font-medium">
                        {new Date(task.created_at).toLocaleDateString('pt-BR')}
                      </span>

                      <div className="flex gap-2">
                        {task.status === 'a_fazer' && (
                          <button 
                            onClick={() => handleMove(task.id, 'em_andamento')}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500 hover:text-black transition-all"
                          >
                            <Play size={10} fill="currentColor" />
                            Iniciar
                          </button>
                        )}
                        {task.status === 'em_andamento' && (
                          <>
                            <button 
                              onClick={() => handleMove(task.id, 'a_fazer')}
                              className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-all"
                              title="Voltar para A Fazer"
                            >
                              <RotateCcw size={12} />
                            </button>
                            <button 
                              onClick={() => handleMove(task.id, 'finalizada')}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-bold hover:bg-blue-500 hover:text-white transition-all"
                            >
                              <CheckCircle2 size={10} />
                              Finalizar
                            </button>
                          </>
                        )}
                        {task.status === 'finalizada' && (
                          <button 
                            onClick={() => handleMove(task.id, 'em_andamento')}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 text-[10px] font-bold hover:text-white transition-all"
                          >
                            <RotateCcw size={10} />
                            Reabrir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova Tarefa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Nova Tarefa</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Título</label>
                <input 
                  type="text" 
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="O que precisa ser feito?"
                  className="w-full bg-[#121a15] border border-[#1a3a24] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Descrição (opcional)</label>
                <textarea 
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalhes da tarefa..."
                  rows={4}
                  className="w-full bg-[#121a15] border border-[#1a3a24] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-900 text-gray-400 text-sm font-bold hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={saving || !form.title}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Criar Tarefa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
