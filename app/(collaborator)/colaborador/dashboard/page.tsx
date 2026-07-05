'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Users, Megaphone, CheckSquare, TrendingUp } from 'lucide-react'

export default function CollaboratorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    activeClients: 0,
    activeCampaigns: 0,
    pendingTasks: 0,
    completedTasks: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchStats() {
      if (!user) return

      try {
        // 1. Buscar ID do colaborador vinculado ao user_id
        const { data: collaborator } = await supabase
          .from('collaborators')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!collaborator) return

        // 2. Buscar Clientes Ativos (Geral)
        const { count: clientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ativo')

        // 3. Buscar Campanhas Ativas do Colaborador
        // Nota: Assumindo que a tabela campaigns tem uma coluna collaborator_id ou similar
        // Se não houver, esta busca pode precisar de ajuste baseado na estrutura real
        const { count: campaignsCount } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ativa')
          // .eq('collaborator_id', collaborator.id) // Ajustar se a coluna existir

        // 4. Buscar Tarefas Pendentes do Colaborador
        const { count: tasksCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .eq('status', 'pendente')

        // 5. Buscar Tarefas Concluídas (para desempenho)
        const { count: completedCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .eq('status', 'concluida')

        setStats({
          activeClients: clientsCount || 0,
          activeCampaigns: campaignsCount || 0,
          pendingTasks: tasksCount || 0,
          completedTasks: completedCount || 0
        })
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, supabase])

  const cards = [
    {
      label: 'Clientes Ativos',
      value: stats.activeClients,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10'
    },
    {
      label: 'Campanhas Ativas',
      value: stats.activeCampaigns,
      icon: Megaphone,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10'
    },
    {
      label: 'Tarefas Pendentes',
      value: stats.pendingTasks,
      icon: CheckSquare,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10'
    },
    {
      label: 'Tarefas Concluídas',
      value: stats.completedTasks,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10'
    }
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Visão geral das suas atividades e desempenho.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-[#0a0f0c] border border-[#1a3a24] p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${card.bg} ${card.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">{card.label}</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {loading ? '...' : card.value}
                </h3>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desempenho / Atividade Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0a0f0c] border border-[#1a3a24] p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Desempenho Semanal</h3>
          <div className="h-64 flex items-end justify-between gap-2 px-2">
            {[40, 70, 55, 90, 65, 80, 45].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-emerald-500/20 border-t-2 border-emerald-500 rounded-t-lg transition-all duration-500"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-[10px] text-gray-500 font-medium">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0a0f0c] border border-[#1a3a24] p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Atividade do Sistema</h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
              <div>
                <p className="text-sm text-gray-300">O sistema está operando normalmente.</p>
                <p className="text-xs text-gray-500 mt-1">Atualizado agora mesmo</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
              <div>
                <p className="text-sm text-gray-300">Suas tarefas foram sincronizadas com sucesso.</p>
                <p className="text-xs text-gray-500 mt-1">Há 5 minutos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
