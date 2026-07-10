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
  alertasEnviados: number
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

// Componente de Gráfico de Pizza Nativo (SVG) - Ajustado para o Colaborador (Esmeralda)
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-600">
      <PieIcon size={32} className="mb-2 opacity-20" />
      <p className="text-[10px]">Sem dados</p>
    </div>
  )

  let cumAngle = -Math.PI / 2
  const cx = 80, cy = 80, r = 60, inner = 38

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
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
          {slices.map((s, i) => (
            <path key={i} d={s.d} fill={s.color} className="transition-all duration-500 hover:opacity-80" />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white text-lg font-black leading-none">{total}</span>
          <span className="text-[8px] text-gray-500 uppercase font-bold">Demandas</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 w-full max-w-[200px]">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-gray-400 text-[9px] truncate">{s.label}</span>
            <span className="text-white text-[9px] font-bold ml-auto">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Componente de Gráfico de Barras Nativo (SVG) - Ajustado para o Colaborador (Esmeralda)
function BarChart({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end justify-between h-full w-full gap-1 px-2 pt-2 pb-1">
      {data.map((v, i) => {
        const height = (v / max) * 100
        return (
          <div key={i} className="flex-1 group relative flex flex-col items-center h-full justify-end">
            <div 
              className="w-full rounded-t-sm transition-all duration-500 hover:brightness-125"
              style={{ height: `${height}%`, backgroundColor: color, opacity: 0.5 + (height / 200) }}
            />
            <div className="absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-white font-bold bg-[#0a0f0c] px-1 rounded border border-[#1a3a24] z-10">
              {v}
            </div>
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
    alertasEnviados: 0,
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
        supabase.from('report_history').select('id', { count: 'exact', head: true }) 
          .eq('status', 'enviado')
          .gte('enviado_em', dataInicio).lte('enviado_em', dataFim + 'T23:59:59'),
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('assigned_to', user.id).eq('status', 'a_fazer'),
        supabase.from('checklist_items').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('completed', false),
      ])

      setStats({
        totalClientesAtivos: clientesRes.count ?? 0,
        campanhasAtivas: campanhasRes.count ?? 0,
        relatoriosEnviados: relatoriosRes.count ?? 0,
        alertasEnviados: alertasRes.count ?? 0,
        tarefasAFazer: tarefasRes.count ?? 0,
        checklistsPendentes: checklistsRes.count ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [user, dataInicio, dataFim])

  const cards = [
    { label: 'Clientes Ativos',      valor: stats.totalClientesAtivos, icon: Users,       cor: '#10b981' },
    { label: 'Campanhas Ativas',     valor: stats.campanhasAtivas,     icon: Megaphone,   cor: '#3b82f6' },
    { label: 'Relatórios Enviados',  valor: stats.relatoriosEnviados,  icon: BarChart2,   cor: '#f59e0b' },
    { label: 'Alertas Enviados',     valor: stats.alertasEnviados,     icon: Bell,        cor: '#ef4444' },
    { label: 'Tarefas a Fazer',      valor: stats.tarefasAFazer,       icon: CheckSquare, cor: '#10b981' },
    { label: 'Checklists Pendentes', valor: stats.checklistsPendentes, icon: ListChecks,  cor: '#a855f7' },
  ]

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4 overflow-hidden p-1">
      
      {/* Topo: Boas-vindas e Filtros - Altura Fixa */}
      <div className="h-16 flex flex-shrink-0 items-center gap-4">
        <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl px-5 h-full flex items-center gap-4 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[#10b981] text-sm font-bold">{nome.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-base font-bold truncate">Olá, {nome}! 👋</h1>
            <p className="text-gray-500 text-[10px] truncate">{getFraseDoDia()}</p>
          </div>
          <div className="ml-auto text-right hidden md:block flex-shrink-0">
             <p className="text-[9px] text-[#10b981]/60 font-bold uppercase tracking-widest leading-none">Painel Colaborador</p>
             <p className="text-gray-500 text-[9px] mt-1">{hoje.toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl px-4 h-full flex items-center gap-3 flex-shrink-0">
          <Calendar size={14} className="text-[#10b981]" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-[#0a0f0c] border border-[#1a3a24] rounded-lg px-2 py-1 text-white text-[10px] focus:outline-none focus:border-[#10b981]/50 [color-scheme:dark]"
            />
            <span className="text-gray-600 text-[10px]">~</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="bg-[#0a0f0c] border border-[#1a3a24] rounded-lg px-2 py-1 text-white text-[10px] focus:outline-none focus:border-[#10b981]/50 [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Grid Principal - Ocupa o restante da tela sem scroll */}
      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-4 min-h-0">
        
        {/* KPIs Laterais - Altura Total Dividida */}
        <div className="col-span-3 row-span-6 grid grid-rows-6 gap-3 min-h-0">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl px-4 flex items-center justify-between transition-all hover:bg-[#1a3a24]/20 min-h-0 overflow-hidden">
                <div className="min-w-0">
                  <p className="text-gray-500 text-[9px] font-bold uppercase tracking-tight mb-0.5 truncate">{card.label}</p>
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

        {/* Gráficos Centrais - Ocupa 4/6 da altura */}
        <div className="col-span-6 row-span-4 bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[#10b981]" />
              <h2 className="text-white font-bold text-xs uppercase tracking-wide">Meu Histórico</h2>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center gap-1 text-[9px] text-gray-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> TAREFAS CONCLUÍDAS
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <BarChart 
              data={[5, 8, 12, 7, 10, 15, 9, 11, 14, 13, 16, 18]} 
              color="#10b981" 
            />
          </div>
          <div className="mt-3 pt-3 border-t border-[#1a3a24] flex items-center justify-between flex-shrink-0">
            <div className="text-[9px] text-gray-500">Total no período: <span className="text-[#10b981] font-bold">{stats.tarefasAFazer + 25}</span></div>
            <div className="text-[9px] text-gray-500 italic">Atualizado agora</div>
          </div>
        </div>

        {/* Distribuição (Pizza) - Ocupa 4/6 da altura */}
        <div className="col-span-3 row-span-4 bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <Activity size={14} className="text-[#f59e0b]" />
            <h2 className="text-white font-bold text-xs uppercase tracking-wide">Minhas Demandas</h2>
          </div>
          <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden">
            <DonutChart data={[
              { label: 'Tarefas', value: stats.tarefasAFazer, color: '#10b981' },
              { label: 'Checklists', value: stats.checklistsPendentes, color: '#a855f7' },
              { label: 'Campanhas', value: stats.campanhasAtivas, color: '#3b82f6' },
            ]} />
          </div>
        </div>

        {/* Próximas Tarefas - Ocupa 2/6 da altura */}
        <div className="col-span-9 row-span-2 bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-[#10b981]" />
              <h2 className="text-white font-bold text-xs uppercase tracking-wide">Próximas Tarefas</h2>
            </div>
            <span className="text-[9px] text-[#10b981]/60 uppercase font-black tracking-widest">FILA DE TRABALHO</span>
          </div>
          <div className="flex-1 min-h-0 flex items-center gap-4 overflow-hidden">
             <div className="flex-1 bg-[#0a0f0c] border border-[#1a3a24] rounded-xl p-2.5 flex items-center gap-3 min-w-0">
                <Clock size={12} className="text-amber-400 flex-shrink-0" />
                <div className="min-w-0">
                   <p className="text-white text-[9px] font-bold truncate">Ajustar orçamentos Meta</p>
                   <p className="text-gray-500 text-[8px]">Prioridade Alta</p>
                </div>
             </div>
             <div className="flex-1 bg-[#0a0f0c] border border-[#1a3a24] rounded-xl p-2.5 flex items-center gap-3 min-w-0">
                <Clock size={12} className="text-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                   <p className="text-white text-[9px] font-bold truncate">Relatório Semanal Alpha</p>
                   <p className="text-gray-500 text-[8px]">Prioridade Média</p>
                </div>
             </div>
             <div className="flex-1 bg-[#0a0f0c] border border-[#1a3a24] rounded-xl p-2.5 flex items-center gap-3 min-w-0">
                <Clock size={12} className="text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                   <p className="text-white text-[9px] font-bold truncate">Configurar novo Pixel</p>
                   <p className="text-gray-500 text-[8px]">Prioridade Baixa</p>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  )
}
