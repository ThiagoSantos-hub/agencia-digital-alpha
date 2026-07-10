'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import {
  Users, Megaphone, BarChart2, Bell,
  CheckSquare, ListChecks, Trophy, Calendar,
  TrendingUp, Activity, PieChart as PieIcon
} from 'lucide-react'

interface DashStats {
  totalClientesAtivos: number
  campanhasAtivas: number
  relatoriosEnviados: number
  alertasEnviados: number
  tarefasAFazer: number
  checklistsPendentes: number
  rankingColaboradores: { nome: string; concluidas: number }[]
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

// Componente de Gráfico de Pizza Nativo (SVG)
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-600">
      <PieIcon size={40} className="mb-2 opacity-20" />
      <p className="text-xs">Sem dados</p>
    </div>
  )

  let cumAngle = -Math.PI / 2
  const cx = 80, cy = 80, r = 60, inner = 35

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    const xi1 = cx + inner * Math.cos(cumAngle - angle)
    const yi1 = cy + inner * Math.sin(cumAngle - angle)
    const xi2 = cx + inner * Math.cos(cumAngle)
    const yi2 = cy + inner * Math.sin(cumAngle)
    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`,
      color: d.color,
      label: d.label,
      pct: Math.round((d.value / total) * 100),
      value: d.value,
    }
  })

  return (
    <div className="flex items-center justify-around h-full gap-4 px-4">
      <svg viewBox="0 0 160 160" className="w-32 h-32 flex-shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} className="transition-all duration-500 hover:opacity-80" />
        ))}
        <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">{total}</text>
      </svg>
      <div className="space-y-2 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-gray-400 truncate">{s.label}</span>
            </div>
            <span className="text-white font-bold ml-2">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Componente de Gráfico de Barras Nativo (SVG)
function BarChart({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end justify-between h-full gap-1 px-2 pt-4">
      {data.map((v, i) => {
        const height = (v / max) * 100
        return (
          <div key={i} className="flex-1 group relative flex flex-col items-center">
            <div 
              className="w-full rounded-t-sm transition-all duration-500 hover:brightness-125"
              style={{ height: `${height}%`, backgroundColor: color, opacity: 0.6 + (height / 250) }}
            />
            <div className="absolute -top-5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold">
              {v}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { profile, role } = useAuth()
  const nome = profile?.name ?? profile?.email ?? 'Usuário'
  const roleLabel = role === 'admin' ? 'Administrador' : 'Gestor'

  const hoje = new Date()
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [dataInicio, setDataInicio] = useState(formatDate(primeiroDiaMes))
  const [dataFim, setDataFim] = useState(formatDate(hoje))
  const [stats, setStats] = useState<DashStats>({
    totalClientesAtivos: 0,
    campanhasAtivas: 0,
    relatoriosEnviados: 0,
    alertasEnviados: 0,
    tarefasAFazer: 0,
    checklistsPendentes: 0,
    rankingColaboradores: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      const supabase = createClient()

      const [
        clientesRes,
        campanhasRes,
        relatoriosRes,
        alertasRes,
        tarefasRes,
        checklistsRes,
        colaboradoresRes,
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'ativa'),
        supabase.from('report_history').select('id', { count: 'exact', head: true })
          .eq('status', 'enviado')
          .gte('enviado_em', dataInicio).lte('enviado_em', dataFim + 'T23:59:59'),
        supabase.from('report_history').select('id', { count: 'exact', head: true }) 
          .eq('status', 'enviado')
          .gte('enviado_em', dataInicio).lte('enviado_em', dataFim + 'T23:59:59'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'a_fazer'),
        supabase.from('checklist_items').select('id', { count: 'exact', head: true }).eq('completed', false),
        supabase.from('tasks')
          .select('assigned_to, profiles!tasks_assigned_to_fkey(name)')
          .eq('status', 'finalizada')
          .gte('updated_at', dataInicio)
          .lte('updated_at', dataFim + 'T23:59:59'),
      ])

      const tarefasColaboradores = colaboradoresRes.data ?? []
      const contagemMap: Record<string, { nome: string; concluidas: number }> = {}
      for (const t of tarefasColaboradores) {
        const id = t.assigned_to
        const nomeColab = (t.profiles as any)?.name ?? 'Sem nome'
        if (!id) continue
        if (!contagemMap[id]) contagemMap[id] = { nome: nomeColab, concluidas: 0 }
        contagemMap[id].concluidas++
      }
      const ranking = Object.values(contagemMap)
        .sort((a, b) => b.concluidas - a.concluidas)
        .slice(0, 5)

      setStats({
        totalClientesAtivos: clientesRes.count ?? 0,
        campanhasAtivas: campanhasRes.count ?? 0,
        relatoriosEnviados: relatoriosRes.count ?? 0,
        alertasEnviados: alertasRes.count ?? 0,
        tarefasAFazer: tarefasRes.count ?? 0,
        checklistsPendentes: checklistsRes.count ?? 0,
        rankingColaboradores: ranking,
      })
      setLoading(false)
    }

    fetchStats()
  }, [dataInicio, dataFim])

  const cards = [
    { label: 'Clientes Ativos',     valor: stats.totalClientesAtivos, icon: Users,        cor: '#00ff88' },
    { label: 'Campanhas Ativas',    valor: stats.campanhasAtivas,     icon: Megaphone,    cor: '#6366f1' },
    { label: 'Relatórios Enviados', valor: stats.relatoriosEnviados,  icon: BarChart2,    cor: '#f59e0b' },
    { label: 'Alertas Enviados',    valor: stats.alertasEnviados,     icon: Bell,         cor: '#ef4444' },
    { label: 'Tarefas a Fazer',     valor: stats.tarefasAFazer,       icon: CheckSquare,  cor: '#3b82f6' },
    { label: 'Checklists Pendentes',valor: stats.checklistsPendentes, icon: ListChecks,   cor: '#a855f7' },
  ]

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 overflow-hidden">
      
      {/* Topo: Boas-vindas e Filtros */}
      <div className="flex flex-shrink-0 items-center gap-4">
        <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-4 flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[#00ff88] text-base font-bold">{nome.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-lg font-bold truncate">Olá, {nome}! 👋</h1>
            <p className="text-gray-500 text-xs truncate">{getFraseDoDia()}</p>
          </div>
          <div className="ml-auto text-right hidden sm:block">
             <p className="text-[9px] text-[#00ff88]/60 font-bold uppercase tracking-widest">{roleLabel}</p>
             <p className="text-gray-500 text-[10px] mt-0.5">{hoje.toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-3 flex items-center gap-3">
          <Calendar size={14} className="text-[#00ff88]" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-[#0a0f0c] border border-[#1a3a24] rounded-lg px-2 py-1 text-white text-[10px] focus:outline-none focus:border-[#00ff88]/50 [color-scheme:dark]"
            />
            <span className="text-gray-600 text-[10px]">~</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="bg-[#0a0f0c] border border-[#1a3a24] rounded-lg px-2 py-1 text-white text-[10px] focus:outline-none focus:border-[#00ff88]/50 [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Grid Principal: KPIs e Gráficos */}
      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-4 min-h-0">
        
        {/* KPIs Laterais */}
        <div className="col-span-3 row-span-6 grid grid-rows-6 gap-3">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-[#1a3a24]/20">
                <div className="min-w-0">
                  <p className="text-gray-500 text-[10px] font-medium uppercase tracking-tight mb-1 truncate">{card.label}</p>
                  <p className="text-2xl font-black tracking-tighter" style={{ color: card.cor }}>
                    {loading ? '...' : card.valor}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: card.cor + '15', border: `1px solid ${card.cor}25` }}>
                  <Icon size={18} style={{ color: card.cor }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Gráficos Centrais */}
        <div className="col-span-6 row-span-4 bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#00ff88]" />
              <h2 className="text-white font-bold text-sm">Visão Geral de Desempenho</h2>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="w-2 h-2 rounded-full bg-[#6366f1]" /> Campanhas
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="w-2 h-2 rounded-full bg-[#00ff88]" /> Clientes
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <BarChart 
              data={[12, 19, 15, 25, 22, 30, 28, 35, 32, 40, 38, 45]} 
              color="#00ff88" 
            />
          </div>
          <div className="mt-4 pt-4 border-t border-[#1a3a24] flex items-center justify-between">
            <div className="text-[10px] text-gray-500">Média de crescimento: <span className="text-[#00ff88] font-bold">+12.5%</span></div>
            <div className="text-[10px] text-gray-500 italic">Atualizado agora</div>
          </div>
        </div>

        {/* Distribuição (Pizza) */}
        <div className="col-span-3 row-span-4 bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={16} className="text-[#f59e0b]" />
            <h2 className="text-white font-bold text-sm">Distribuição</h2>
          </div>
          <div className="flex-1 min-h-0">
            <DonutChart data={[
              { label: 'Meta Ads', value: 45, color: '#6366f1' },
              { label: 'Google Ads', value: 35, color: '#00ff88' },
              { label: 'Outros', value: 20, color: '#f59e0b' },
            ]} />
          </div>
        </div>

        {/* Ranking Inferior */}
        <div className="col-span-9 row-span-2 bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-[#f59e0b]" />
              <h2 className="text-white font-bold text-sm">Top Colaboradores</h2>
            </div>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Performance Mensal</span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex items-center gap-6">
            {loading ? (
              <div className="w-full flex justify-center py-2"><div className="animate-spin h-4 w-4 border-2 border-[#00ff88] border-t-transparent rounded-full" /></div>
            ) : stats.rankingColaboradores.length === 0 ? (
              <p className="text-gray-600 text-[10px] italic">Nenhuma atividade registrada.</p>
            ) : (
              stats.rankingColaboradores.map((colab, i) => {
                const max = stats.rankingColaboradores[0].concluidas
                const pct = max > 0 ? (colab.concluidas / max) * 100 : 0
                return (
                  <div key={colab.nome} className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 px-1">
                      <span className="text-white text-[10px] font-bold truncate">{i + 1}º {colab.nome}</span>
                      <span className="text-[#00ff88] text-[10px] font-black">{colab.concluidas}</span>
                    </div>
                    <div className="h-1.5 bg-[#1a3a24] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#00ff88]/50 to-[#00ff88] rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
