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
  RotateCcw
} from 'lucide-react'

export default function ColaboradorTarefasPage() {
  const { user } = useAuth()
  const { tasks, listTasks, updateTaskStatus, loading } = useTasks()
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null)
  const supabase = createClient()

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
        listTasks(data.id)
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
      a_fazer: tasks.filter(t => t.status === 'a_fazer'),
      em_andamento: tasks.filter(t => t.status === 'em_andamento'),
      finalizada: tasks.filter(t => t.status === 'finalizada'),
    }
  }, [tasks])

  const handleMove = async (id: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(id, newStatus)
      if (collaboratorId) listTasks(collaboratorId)
    } catch (error) {
      console.error('Erro ao mover tarefa:', error)
    }
  }

  return (
    <div className="p-8 h-[calc(100vh-64px)] flex flex-col space-y-8 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold text-white">Minhas Tarefas</h1>
        <p className="text-gray-400 text-sm mt-1">Gerencie seu fluxo de trabalho no Kanban.</p>
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
                {tasksByStatus[col.status].length}
              </span>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20">
              {loading && tasks.length === 0 ? (
                <div className="py-8 text-center text-gray-600 text-xs italic">Carregando...</div>
              ) : tasksByStatus[col.status].length === 0 ? (
                <div className="py-8 text-center text-gray-600 text-xs italic border-2 border-dashed border-[#1a3a24] rounded-xl">
                  Nenhuma tarefa aqui
                </div>
              ) : (
                tasksByStatus[col.status].map((task) => (
                  <div key={task.id} className="bg-[#121a15] border border-[#1a3a24] p-4 rounded-xl group hover:border-emerald-500/50 transition-all shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-gray-100 leading-tight">{task.title}</h4>
                      <button className="text-gray-600 hover:text-emerald-500 transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
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
    </div>
  )
}
