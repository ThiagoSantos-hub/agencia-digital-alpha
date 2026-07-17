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
  alertasAtivos: number
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

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-text-muted">
      <PieIcon size={32} className="mb-2 opacity-20" />
      <p className="text-[10px]">Sem dados</p>
    </div>
  )

  let cumAngle = -Math.PI / 2
  const cx = 80, cy = 80, r = 60, inner = 38

  const slices = data.map((d) => {
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
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
          {slices.map((s, i) => (
            <path key={i} d={s.d} fill={s.color} className="transition-all duration-500 hover:opacity-80" />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-text-main text-lg font-black leading-none">{total}</span>
          <span className="text-[8px] text-text-disabled uppercase font-bold">Total</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 w-full max-w-[200px]">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-text-muted text-[9px] truncate">{s.label}</span>
            <span className="text-text-main text-[9px] font-bold ml-auto">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end justify-between h-full w-full gap-1 px-2 pt-2 pb-1">
      {data.map((v, i) => {
        const height = (v / max) * 100
        return (
          <div key={i} className="flex-1 group relative flex flex-col items-center h-full justify-end">
            <div 
              className="w-full rounded-t-sm transition-all duration-500 hover:brightness-90"
              style={{ height: `${height}%`, backgroundColor: color, opacity: 0.6 + (height / 250) }}
            />
            <div className="absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-text-main font-bold bg-surface px-1 rounded border border-border z-10 shadow-sm">
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
    alertasAtivos: 0,
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
        // BUG FIX: antes usava a mesma query de relatórios
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('ativo', true),
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
        alertasAtivos: alertasRes.count ?? 0,
        tarefasAFazer: tarefasRes.count ?? 0,
        checklistsPendentes: checklistsRes.count ?? 0,
        rankingColaboradores: ranking,
      })
      setLoading(false)
    }

    fetchStats()
  }, [dataInicio, dataFim])

  const cards = [
    { label: 'Clientes Ativos',      valor: stats.totalClientesAtivos, icon: Users,        cor: '#1A56DB' },
    { label: 'Campanhas Ativas',     valor: stats.campanhasAtivas,     icon: Megaphone,    cor: '#4C3ABF' },
    { label: 'Relatórios Enviados',  valor: stats.relatoriosEnviados,  icon: BarChart2,    cor: '#f59e0b' },
    { label: 'Alertas Ativos',       valor: stats.alertasAtivos,       icon: Bell,         cor: '#ef4444' },
    { label: 'Tarefas a Fazer',      valor: stats.tarefasAFazer,       icon: CheckSquare,  cor: '#3b82f6' },
    { label: 'Checklists Pendentes', valor: stats.checklistsPendentes, icon: ListChecks,   cor: '#16A34A' },
  ]

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 overflow-hidden">
      
      <div className="h-16 flex flex-shrink-0 items-center gap-4">
        <div className="bg-surface border border-border rounded-xl px-5 h-full flex items-center gap-4 flex-1 min-w-0 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-sm font-black">{nome.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-text-main text-base font-bold truncate">Olá, {nome}! 👋</h1>
            <p className="text-text-muted text-[10px] font-medium truncate">{getFraseDoDia()}</p>
          </div>
          <div className="ml-auto text-right hidden md:block flex-shrink-0 pl-4 border-l border-border">
             <p className="text-[9px] text-primary font-black uppercase tracking-widest leading-none">{roleLabel}</p>
             <p className="text-text-disabled text-[9px] font-bold mt-1 uppercase">{hoje.toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl px-4 h-full flex items-center gap-3 flex-shrink-0 shadow-sm">
          <Calendar size={14} className="text-primary" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-hover-bg border border-border rounded-lg px-2 py-1 text-text-main text-[10px] font-bold focus:outline-none focus:border-primary/50"
            />
            <span className="text-text-disabled text-[10px] font-black">~</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="bg-hover-bg border border-border rounded-lg px-2 py-1 text-text-main text-[10px] font-bold focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-4 min-h-0">
        <div className="col-span-3 row-span-6 grid grid-rows-6 gap-3 min-h-0">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-surface border border-border rounded-xl px-4 flex items-center justify-between transition-all hover:bg-hover-bg min-h-0 overflow-hidden shadow-sm group">
                <div className="min-w-0">
                  <p className="text-text-disabled text-[9px] font-black uppercase tracking-tight mb-0.5 truncate">{card.label}</p>
                  <p className="text-xl font-black tracking-tighter leading-none" style={{ color: card.cor }}>
                    {loading ? '...' : card.valor}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: card.cor + '15', border: `1px solid ${card.cor}25` }}>
                  <Icon size={16} style={{ color: card.cor }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="col-span-6 row-span-4 bg-surface border border-border rounded-xl p-4 flex flex-col min-h-0 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <h2 className="text-text-main font-black text-[10px] uppercase tracking-widest">Desempenho Geral</h2>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center gap-1 text-[9px] text-text-disabled font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-ai" /> CAMPANHAS
              </span>
              <span className="flex items-center gap-1 text-[9px] text-text-disabled font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> CLIENTES
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            {/* Placeholder visual até haver série temporal real */}
            <BarChart 
              data={[
                stats.totalClientesAtivos || 1,
                stats.campanhasAtivas || 1,
                stats.relatoriosEnviados || 1,
                stats.alertasAtivos || 1,
                stats.tarefasAFazer || 1,
                stats.checklistsPendentes || 1,
                stats.totalClientesAtivos + stats.campanhasAtivas || 1,
                stats.relatoriosEnviados + stats.alertasAtivos || 1,
              ]} 
              color="#1A56DB" 
            />
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between flex-shrink-0">
            <div className="text-[9px] text-text-muted font-medium uppercase">Indicadores do período filtrado</div>
            <div className="text-[9px] text-text-disabled italic font-bold">DADOS CONSOLIDADOS</div>
          </div>
        </div>

        <div className="col-span-3 row-span-4 bg-surface border border-border rounded-xl p-4 flex flex-col min-h-0 shadow-sm">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <Activity size={14} className="text-amber-500" />
            <h2 className="text-text-main font-black text-[10px] uppercase tracking-widest">Canais</h2>
          </div>
          <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden">
            <DonutChart data={[
              { label: 'Meta Ads', value: Math.max(stats.campanhasAtivas, 1), color: '#4C3ABF' },
              { label: 'Clientes', value: Math.max(stats.totalClientesAtivos, 1), color: '#1A56DB' },
              { label: 'Tarefas', value: Math.max(stats.tarefasAFazer, 1), color: '#f59e0b' },
            ]} />
          </div>
        </div>

        <div className="col-span-9 row-span-2 bg-surface border border-border rounded-xl p-4 flex flex-col min-h-0 shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-amber-500" />
              <h2 className="text-text-main font-black text-[10px] uppercase tracking-widest">Top Colaboradores</h2>
            </div>
            <span className="text-[9px] text-primary/60 uppercase font-black tracking-widest">RANKING DO PERÍODO</span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex items-center gap-5">
            {loading ? (
              <div className="w-full flex justify-center"><div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" /></div>
            ) : stats.rankingColaboradores.length === 0 ? (
              <p className="text-text-disabled text-[10px] font-bold uppercase italic">Aguardando atividades...</p>
            ) : (
              stats.rankingColaboradores.map((colab, i) => {
                const max = stats.rankingColaboradores[0].concluidas
                const pct = max > 0 ? (colab.concluidas / max) * 100 : 0
                return (
                  <div key={colab.nome} className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1 px-0.5">
                      <span className="text-text-main text-[10px] font-black truncate">{i + 1}º {colab.nome}</span>
                      <span className="text-primary text-[10px] font-black">{colab.concluidas}</span>
                    </div>
                    <div className="h-1 bg-hover-bg rounded-full overflow-hidden border border-border">
                      <div className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-1000"
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
