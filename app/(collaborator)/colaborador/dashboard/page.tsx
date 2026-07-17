'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import {
  Users, Megaphone, BarChart2, Bell,
  CheckSquare, ListChecks, Calendar,
  TrendingUp, Activity, PieChart as PieIcon,
  CheckCircle2, Clock
} from 'lucide-react'

interface DashStats {
  totalClientesAtivos: number
  campanhasAtivas: number
  relatoriosEnviados: number
  alertasAtivos: number
  tarefasAFazer: number
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

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-text-disabled">
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
          <span className="text-[8px] text-text-muted uppercase font-bold">Demandas</span>
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

function BarChart({ items }: { items: { value: number; color: string; label: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="flex items-end justify-between h-full w-full gap-1.5 px-1">
      {items.map((item, i) => {
        const heightPct = Math.max((item.value / max) * 78, item.value > 0 ? 6 : 2)
        return (
          <div key={i} className="flex-1 flex flex-col items-center h-full justify-end min-w-0" title={item.label}>
            <span className="text-[10px] text-text-main font-bold leading-none tabular-nums mb-1.5 select-none">
              {item.value}
            </span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${heightPct}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        )
      })}
    </div>
  )
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
    alertasAtivos: 0,
    tarefasAFazer: 0,
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
        supabase.from('report_history').select('id', { count: 'exact', head: true })
          .eq('status', 'enviado')
          .gte('enviado_em', dataInicio).lte('enviado_em', dataFim + 'T23:59:59'),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('assigned_to', user.id).eq('status', 'a_fazer'),
        supabase.from('checklist_items').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('completed', false),
      ])

      setStats({
        totalClientesAtivos: clientesRes.count ?? 0,
        campanhasAtivas: campanhasRes.count ?? 0,
        relatoriosEnviados: relatoriosRes.count ?? 0,
        alertasAtivos: alertasRes.count ?? 0,
        tarefasAFazer: tarefasRes.count ?? 0,
        checklistsPendentes: checklistsRes.count ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [user, dataInicio, dataFim])

  const cards = [
    { label: 'Clientes Ativos',      valor: stats.totalClientesAtivos, icon: Users,       cor: '#1A56DB' },
    { label: 'Campanhas Ativas',     valor: stats.campanhasAtivas,     icon: Megaphone,   cor: '#4C3ABF' },
    { label: 'Relatórios Enviados',  valor: stats.relatoriosEnviados,  icon: BarChart2,   cor: '#f59e0b' },
    { label: 'Alertas Ativos',       valor: stats.alertasAtivos,       icon: Bell,        cor: '#ef4444' },
    { label: 'Tarefas a Fazer',      valor: stats.tarefasAFazer,       icon: CheckSquare, cor: '#3b82f6' },
    { label: 'Checklists Pendentes', valor: stats.checklistsPendentes, icon: ListChecks,  cor: '#16A34A' },
  ]

  const barItems = [
    { value: stats.totalClientesAtivos || 0, color: '#1A56DB', label: 'Clientes' },
    { value: stats.campanhasAtivas || 0,     color: '#4C3ABF', label: 'Campanhas' },
    { value: stats.relatoriosEnviados || 0,  color: '#f59e0b', label: 'Relatórios' },
    { value: stats.alertasAtivos || 0,       color: '#ef4444', label: 'Alertas' },
    { value: stats.tarefasAFazer || 0,       color: '#3b82f6', label: 'Tarefas' },
    { value: stats.checklistsPendentes || 0, color: '#16A34A', label: 'Checklists' },
  ]

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 overflow-hidden p-1">
      <div className="h-16 flex flex-shrink-0 items-center gap-4">
        <div className="bg-surface border border-border rounded-xl px-5 h-full flex items-center gap-4 flex-1 min-w-0 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-sm font-bold">{nome.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-text-main text-base font-bold truncate">Olá, {nome}! 👋</h1>
            <p className="text-text-muted text-[10px] truncate">{getFraseDoDia()}</p>
          </div>
          <div className="ml-auto text-right hidden md:block flex-shrink-0">
             <p className="text-[9px] text-primary/70 font-bold uppercase tracking-widest leading-none">Painel Colaborador</p>
             <p className="text-text-muted text-[9px] mt-1">{hoje.toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl px-4 h-full flex items-center gap-3 flex-shrink-0 shadow-sm">
          <Calendar size={14} className="text-primary" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-hover-bg border border-border rounded-lg px-2 py-1 text-text-main text-[10px] focus:outline-none focus:border-primary/50"
            />
            <span className="text-text-disabled text-[10px]">~</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="bg-hover-bg border border-border rounded-lg px-2 py-1 text-text-main text-[10px] focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-4 min-h-0">
        <div className="col-span-3 row-span-6 grid grid-rows-6 gap-3 min-h-0">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-surface border border-border rounded-xl px-4 flex items-center justify-between transition-all hover:bg-hover-bg min-h-0 overflow-hidden shadow-sm">
                <div className="min-w-0">
                  <p className="text-text-muted text-[9px] font-bold uppercase tracking-tight mb-0.5 truncate">{card.label}</p>
                  <p className="text-xl font-black tracking-tighter leading-none" style={{ color: card.cor }}>
                    {loading ? '...' : card.valor}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: card.cor + '15', border: `1px solid ${card.cor}25` }}>
                  <Icon size={16} style={{ color: card.cor }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="col-span-6 row-span-4 bg-surface border border-border rounded-xl p-4 flex flex-col min-h-0 shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <h2 className="text-text-main font-bold text-xs uppercase tracking-wide">Meu Histórico</h2>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end">
              <span className="flex items-center gap-1 text-[9px] text-text-muted font-medium">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#1A56DB' }} /> Clientes
              </span>
              <span className="flex items-center gap-1 text-[9px] text-text-muted font-medium">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4C3ABF' }} /> Campanhas
              </span>
              <span className="flex items-center gap-1 text-[9px] text-text-muted font-medium">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} /> Relatórios
              </span>
              <span className="flex items-center gap-1 text-[9px] text-text-muted font-medium">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }} /> Alertas
              </span>
              <span className="flex items-center gap-1 text-[9px] text-text-muted font-medium">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6' }} /> Tarefas
              </span>
              <span className="flex items-center gap-1 text-[9px] text-text-muted font-medium">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#16A34A' }} /> Checklists
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <BarChart items={barItems} />
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between flex-shrink-0">
            <div className="text-[9px] text-text-muted">Indicadores do período filtrado</div>
            <div className="text-[9px] text-text-muted italic">Atualizado agora</div>
          </div>
        </div>

        <div className="col-span-3 row-span-4 bg-surface border border-border rounded-xl p-4 flex flex-col min-h-0 shadow-sm">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <Activity size={14} className="text-amber-500" />
            <h2 className="text-text-main font-bold text-xs uppercase tracking-wide">Minhas Demandas</h2>
          </div>
          <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden">
            <DonutChart data={[
              { label: 'Tarefas', value: Math.max(stats.tarefasAFazer, 0), color: '#3b82f6' },
              { label: 'Checklists', value: Math.max(stats.checklistsPendentes, 0), color: '#16A34A' },
              { label: 'Campanhas', value: Math.max(stats.campanhasAtivas, 0), color: '#4C3ABF' },
            ]} />
          </div>
        </div>

        <div className="col-span-9 row-span-2 bg-surface border border-border rounded-xl p-4 flex flex-col min-h-0 shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-primary" />
              <h2 className="text-text-main font-bold text-xs uppercase tracking-wide">Próximas Tarefas</h2>
            </div>
            <span className="text-[9px] text-primary/60 uppercase font-black tracking-widest">FILA DE TRABALHO</span>
          </div>
          <div className="flex-1 min-h-0 flex items-center gap-4 overflow-hidden">
             <div className="flex-1 bg-background border border-border rounded-xl p-2.5 flex items-center gap-3 min-w-0">
                <Clock size={12} className="text-amber-500 flex-shrink-0" />
                <div className="min-w-0">
                   <p className="text-text-main text-[9px] font-bold truncate">Ajustar orçamentos Meta</p>
                   <p className="text-text-muted text-[8px]">Prioridade Alta</p>
                </div>
             </div>
             <div className="flex-1 bg-background border border-border rounded-xl p-2.5 flex items-center gap-3 min-w-0">
                <Clock size={12} className="text-primary flex-shrink-0" />
                <div className="min-w-0">
                   <p className="text-text-main text-[9px] font-bold truncate">Relatório Semanal Alpha</p>
                   <p className="text-text-muted text-[8px]">Prioridade Média</p>
                </div>
             </div>
             <div className="flex-1 bg-background border border-border rounded-xl p-2.5 flex items-center gap-3 min-w-0">
                <Clock size={12} className="text-text-muted flex-shrink-0" />
                <div className="min-w-0">
                   <p className="text-text-main text-[9px] font-bold truncate">Configurar novo Pixel</p>
                   <p className="text-text-muted text-[8px]">Prioridade Baixa</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
