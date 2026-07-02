'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { Users, Megaphone, CheckSquare, TrendingUp } from 'lucide-react'

interface DashStats {
  totalClientes: number
  campanhasAtivas: number
  tarefasPendentes: number
}

export default function DashboardPage() {
  const { profile, role } = useAuth()
  const [stats, setStats] = useState<DashStats>({ totalClientes: 0, campanhasAtivas: 0, tarefasPendentes: 0 })
  const [loading, setLoading] = useState(true)
  const roleLabel = role === 'admin' ? 'Administrador' : 'Gestor'
  const nome = profile?.name ?? profile?.email ?? 'Usuário'

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()
      const [clientesRes, campanhasRes, tarefasRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'ativa'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      ])
      setStats({
        totalClientes: clientesRes.count ?? 0,
        campanhasAtivas: campanhasRes.count ?? 0,
        tarefasPendentes: tarefasRes.count ?? 0,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Total de Clientes', valor: loading ? '...' : stats.totalClientes, icon: Users },
    { label: 'Campanhas Ativas', valor: loading ? '...' : stats.campanhasAtivas, icon: Megaphone },
    { label: 'Tarefas Pendentes', valor: loading ? '...' : stats.tarefasPendentes, icon: CheckSquare },
    { label: 'Desempenho Geral', valor: '—', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center">
            <span className="text-[#00ff88] text-lg font-bold">{nome.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">Olá, {nome}! 👋</h1>
            <p className="text-gray-400 text-sm mt-0.5">Você está logado como <span className="text-[#00ff88] font-medium">{roleLabel}</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-sm">{card.label}</p>
                <div className="w-8 h-8 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center">
                  <Icon size={16} className="text-[#00ff88]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#00ff88]">{card.valor}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-2">🚀 Módulos ativos</h3>
        <p className="text-gray-400 text-sm">Clientes, Campanhas, Integrações e Tarefas funcionando em produção.</p>
      </div>
    </div>
  )
}
