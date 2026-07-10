'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import {
  Users, Megaphone, BarChart2, Bell,
  CheckSquare, ListChecks, Calendar
} from 'lucide-react'

interface DashStats {
  totalClientesAtivos: number
  campanhasAtivas: number
  relatoriosEnviados: number
  alertasEnviados: number
  tarefasPendentes: number
  checklistsPendentes: number
}

const frases = [
  'Vamos construir algo grande hoje! 🚀',
  'Foco e consistência geram resultados! 💪',
  'Cada cliente bem atendido é uma vitória! 🏆',
  'O sucesso é a soma de pequenos esforços diários! ⚡',
  'Hoje é um ótimo dia para superar metas! 🎯',
]

function getFraseDoDia() {
  return frases[new Date().getDate() % frases.length]
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function CollaboratorDashboardPage() {
  const { profile, user } = useAuth()
  const nome = profile?.name ?? profile?.email ?? 'Colaborador'

  const hoje = new Date()
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [dataInicio, setDataInicio] = useState(formatDate(primeiroDiaMes))
  const [dataFim, setDataFim] = useState(formatDate(hoje))
  const [stats, setStats] = useState<DashStats>({
    totalClientesAtivos: 0,
    campanhasAtivas: 0,
    relatoriosEnviados: 0,
    alertasEnviados: 0,
    tarefasPendentes: 0,
    checklistsPendentes: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return
      setLoading(true)
      const supabase = createClient()

      const [
        clientesRes,
        campanhasRes,
        relatoriosRes,
        alertasRes,
        tarefasRes,
        checklistsRes,
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'ativa'),
        supabase.from('report_sends').select('id', { count: 'exact', head: true })
          .gte('sent_at', dataInicio).lte('sent_at', dataFim + 'T23:59:59'),
        supabase.from('alert_sends').select('id', { count: 'exact', head: true })
          .gte('sent_at', dataInicio).lte('sent_at', dataFim + 'T23:59:59'),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('assignee_id', user.id).eq('status', 'pendente'),
        supabase.from('checklist_items').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('completed', false),
      ])

      setStats({
        totalClientesAtivos: clientesRes.count ?? 0,
        campanhasAtivas: campanhasRes.count ?? 0,
        relatoriosEnviados: relatoriosRes.count ?? 0,
        alertasEnviados: alertasRes.count ?? 0,
        tarefasPendentes: tarefasRes.count ?? 0,
        checklistsPendentes: checklistsRes.count ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [user, dataInicio, dataFim])

  const cards = [
    { label: 'Clientes Ativos',      valor: stats.totalClientesAtivos, icon: Users,       cor: '#00ff88' },
    { label: 'Campanhas Ativas',     valor: stats.campanhasAtivas,     icon: Megaphone,   cor: '#6366f1' },
    { label: 'Relatórios Enviados',  valor: stats.relatoriosEnviados,  icon: BarChart2,   cor: '#f59e0b' },
    { label: 'Alertas Enviados',     valor: stats.alertasEnviados,     icon: Bell,        cor: '#ef4444' },
    { label: 'Tarefas Pendentes',    valor: stats.tarefasPendentes,    icon: CheckSquare, cor: '#3b82f6' },
    { label: 'Checklists Pendentes', valor: stats.checklistsPendentes, icon: ListChecks,  cor: '#a855f7' },
  ]

  return (
    <div className="space-y-6">

      {/* Boas-vindas + Filtro de Data */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5 flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[#00ff88] text-lg font-bold">{nome.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">Olá, {nome}! 👋</h1>
            <p className="text-gray-400 text-sm mt-0.5">{getFraseDoDia()}</p>
            <p className="text-[10px] text-[#00ff88]/60 font-medium uppercase tracking-widest mt-1">Colaborador</p>
          </div>
        </div>

        {/* Filtro de data */}
        <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-4 flex items-center gap-3 flex-shrink-0">
          <Calendar size={16} className="text-[#00ff88]" />
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00ff88]/50"
          />
          <span className="text-gray-500 text-sm">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00ff88]/50"
          />
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-xs leading-tight">{card.label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: card.cor + '18', border: `1px solid ${card.cor}33` }}>
                  <Icon size={16} style={{ color: card.cor }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: card.cor }}>
                {loading ? '...' : card.valor}
              </p>
            </div>
          )
        })}
      </div>

    </div>
  )
}
