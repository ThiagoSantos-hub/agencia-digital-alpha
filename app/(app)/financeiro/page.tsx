'use client'
// app/(app)/financeiro/page.tsx — v2.1.0
// Módulo Financeiro — Visual inspirado no Grana Zen
// Projeto: Agência Digital Alpha
// CORREÇÕES v2.1.0:
//   [BUG F-1] inputVazio: adicionado dia_vencimento (obrigatório em LancamentoInput)
//   [BUG F-2] Cards de totais: corrigido acesso para .receita/.gasto/.investimento (singular)
//   [BUG F-3] formInput tipado corretamente como LancamentoInput — sem data_vencimento/status
//   [BUG F-4] abrirModalEditar: mapeamento correto Lancamento → LancamentoInput
//   [BUG F-5] handleSalvar: valida dia_vencimento em vez de data_vencimento
//   [BUG F-6] Formulário: campo dia_vencimento (1-31) no lugar de data_vencimento (date)
//   [BUG F-7] Toggle de status usa editStatus (estado separado)

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  useFinanceiro,
  LancamentoInput,
  Lancamento,
  CATEGORIAS,
  EscopoFinanceiro,
  TipoLancamento,
  StatusLancamento,
  PeriodoFiltro,
} from '@/hooks/useFinanceiro'
import {
  TrendingUp, TrendingDown, PiggyBank, Wallet,
  Plus, Search, Pencil, Trash2, CheckCircle2,
  ChevronLeft, ChevronRight, X, AlertCircle,
  RotateCcw, User, RepeatIcon, Pin,
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtData = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const PALETTE = [
  '#00ff88','#00cc6a','#4ade80','#86efac',
  '#f59e0b','#ef4444','#8b5cf6','#3b82f6','#06b6d4',
]

// ─── Tipos ───────────────────────────────────────────────────────────────────

type AbaFiltro = 'todas' | 'receitas' | 'despesas'

// [BUG F-1 CORRIGIDO] Adicionado dia_vencimento (obrigatório em LancamentoInput).
// data_vencimento é calculado automaticamente pelo hook a partir de dia_vencimento.
// status é gerenciado em editStatus (estado separado), não no formInput.
const inputVazio: LancamentoInput = {
  escopo: 'agencia',
  tipo: 'receita',
  categoria: '',
  descricao: '',
  valor: 0,
  dia_vencimento: new Date().getDate(),
  client_id: null,
  recorrente: false,
  recorrencia: null,
}

// ─── Mini gráfico de pizza SVG ────────────────────────────────────────────────

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  let cumAngle = -Math.PI / 2
  const cx = 80, cy = 80, r = 65, inner = 42

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
    <div className="flex flex-col gap-4">
      <svg viewBox="0 0 160 160" className="w-40 h-40 mx-auto">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} opacity={0.9} />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">Total</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#00ff88" fontSize="9">
          {fmtBRL(total)}
        </text>
      </svg>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-gray-400 truncate max-w-[110px]">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 text-right">
              <span className="text-gray-500">{s.pct}%</span>
              <span className="text-white font-medium">{fmtBRL(s.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const supabase = createClient()

  const [isAdmin, setIsAdmin] = useState(false)
  const [escopoAtivo, setEscopoAtivo] = useState<EscopoFinanceiro>('agencia')
  const [clientes, setClientes] = useState<{ id: string; name: string }[]>([])

  const hoje = new Date()
  const [mesAtivo, setMesAtivo] = useState(hoje.getMonth())
  const [anoAtivo, setAnoAtivo] = useState(hoje.getFullYear())

  const [abaFiltro, setAbaFiltro] = useState<AbaFiltro>('todas')
  const [busca, setBusca] = useState('')

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [modalTipo, setModalTipo] = useState<'receita' | 'despesa'>('receita')
  const [editando, setEditando] = useState<Lancamento | null>(null)
  // [BUG F-3] formInput é estritamente LancamentoInput — sem data_vencimento/status
  const [formInput, setFormInput] = useState<LancamentoInput>(inputVazio)
  // [BUG F-7] status gerenciado separadamente pois não faz parte de LancamentoInput
  const [editStatus, setEditStatus] = useState<StatusLancamento>('pendente')
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState<string | null>(null)

  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  const periodoInicio = `${anoAtivo}-${String(mesAtivo + 1).padStart(2, '0')}-01`
  const ultimoDia = new Date(anoAtivo, mesAtivo + 1, 0).getDate()
  const periodoFim = `${anoAtivo}-${String(mesAtivo + 1).padStart(2, '0')}-${ultimoDia}`

  const {
    lancamentos,
    totais: totaisBrutos,
    loading,
    refetch,
    atualizarFiltros,
    createLancamento,
    updateLancamento,
    marcarComoPago,
    deleteLancamento,
  } = useFinanceiro({
    periodo: 'personalizado' as PeriodoFiltro,
    escopo: escopoAtivo,
    tipo: 'todos' as TipoLancamento | 'todos',
    status: 'todos' as StatusLancamento | 'todos',
    dataInicio: periodoInicio,
    dataFim: periodoFim,
  })

  // Atualiza o filtro de escopo no hook sempre que o botão Agência/Pessoal mudar
  useEffect(() => {
    atualizarFiltros({ escopo: escopoAtivo })
  }, [escopoAtivo])

  useEffect(() => {
    async function checkPerfil() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      const admin = data?.role === 'admin'
      setIsAdmin(admin)
      setEscopoAtivo(admin ? 'agencia' : 'pessoal')
    }
    checkPerfil()
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    // [INTEGRAÇÃO] Buscar clientes com mensalidades para preencher o financeiro
    supabase.from('clients').select('id, name, monthly_fee, payment_day').order('name')
      .then(({ data }) => setClientes(data ?? []))
  }, [isAdmin])

  // [INTEGRAÇÃO] Simplificado: Financeiro não cadastra clientes mais.
  // Apenas receitas avulsas ou gastos.

  // ─── Listagem filtrada ───────────────────────────────────────────────────────

  const listagem = useMemo(() => {
    // 1. Primeiro, filtramos apenas os lançamentos que devem aparecer no mês selecionado
    const filtradosPorMes = lancamentos.filter(l => {
      const dataVenc = new Date(l.data_vencimento + 'T00:00:00')
      const mesLancamento = dataVenc.getMonth()
      const anoLancamento = dataVenc.getFullYear()

      return l.recorrente || (mesLancamento === mesAtivo && anoLancamento === anoAtivo)
    })

    // 2. Ajustamos status para recorrências e corrigimos a data
    return filtradosPorMes.map(l => {
      const dataVencOriginal = new Date(l.data_vencimento + 'T00:00:00')
      const mesOriginal = dataVencOriginal.getMonth()
      const anoOriginal = dataVencOriginal.getFullYear()
      const ehMesDiferente = mesOriginal !== mesAtivo || anoOriginal !== anoAtivo

      if (l.recorrente && ehMesDiferente) {
        return { 
          ...l, 
          status: 'pendente' as StatusLancamento, 
          data_pagamento: null,
          data_vencimento: `${anoAtivo}-${String(mesAtivo + 1).padStart(2, '0')}-${String(l.dia_vencimento).padStart(2, '0')}`
        }
      }
      return l
    }).filter(l => {
      const tipoOk =
        abaFiltro === 'todas' ||
        (abaFiltro === 'receitas' && l.tipo === 'receita') ||
        (abaFiltro === 'despesas' && (l.tipo === 'gasto' || l.tipo === 'investimento'))
      const buscaOk =
        l.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        l.categoria.toLowerCase().includes(busca.toLowerCase())
      return tipoOk && buscaOk
    })
  }, [lancamentos, abaFiltro, busca, mesAtivo, anoAtivo])

  // [INTELIGÊNCIA] Recalcular totais baseados na listagem projetada (não nos brutos do banco)
  const totais = useMemo(() => {
    const t = { receita: 0, gasto: 0, investimento: 0, saldo: 0, receita_paga: 0, receita_pendente: 0, gasto_pago: 0, gasto_pendente: 0 }
    listagem.forEach(l => {
      if (l.tipo === 'receita') {
        t.receita += l.valor
        if (l.status === 'pago') t.receita_paga += l.valor
        else t.receita_pendente += l.valor
      } else if (l.tipo === 'gasto') {
        t.gasto += l.valor
        if (l.status === 'pago') t.gasto_pago += l.valor
        else t.gasto_pendente += l.valor
      } else if (l.tipo === 'investimento') {
        t.investimento += l.valor
        if (l.status === 'pago') t.gasto_pago += l.valor
        else t.gasto_pendente += l.valor
      }
    })
    t.saldo = t.receita - t.gasto - t.investimento
    return t
  }, [listagem])

  const agrupados = useMemo(() => {
    const grupos: Record<string, Lancamento[]> = {}
    listagem.forEach(l => {
      if (!grupos[l.categoria]) grupos[l.categoria] = []
      grupos[l.categoria].push(l)
    })
    return grupos
  }, [listagem])

  const dadosPizza = useMemo(() => {
    const gastos = lancamentos.filter(l => l.tipo === 'gasto' || l.tipo === 'investimento')
    const porCat: Record<string, number> = {}
    gastos.forEach(l => { porCat[l.categoria] = (porCat[l.categoria] ?? 0) + l.valor })
    return Object.entries(porCat)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))
  }, [lancamentos])

  // ─── Ações ───────────────────────────────────────────────────────────────────

  function navMes(dir: -1 | 1) {
    setMesAtivo(prev => {
      let m = prev + dir
      if (m < 0) { setAnoAtivo(a => a - 1); return 11 }
      if (m > 11) { setAnoAtivo(a => a + 1); return 0 }
      return m
    })
  }

  function abrirModalCriar(tipo: 'receita' | 'despesa') {
    setEditando(null)
    setModalTipo(tipo)
    setEditStatus('pendente')
    setFormInput({
      ...inputVazio,
      escopo: escopoAtivo,
      tipo: tipo === 'receita' ? 'receita' : 'gasto',
    })
    setErroModal(null)
    setModalAberto(true)
  }

  // [BUG F-4 CORRIGIDO] Mapeamento correto Lancamento → LancamentoInput
  function abrirModalEditar(l: Lancamento) {
    setEditando(l)
    setModalTipo(l.tipo === 'receita' ? 'receita' : 'despesa')
    setEditStatus(l.status)
    setFormInput({
      escopo:         l.escopo,
      tipo:           l.tipo,
      categoria:      l.categoria,
      descricao:      l.descricao,
      valor:          l.valor,
      dia_vencimento: l.dia_vencimento,
      client_id:      l.client_id,
      recorrente:     l.recorrente,
      recorrencia:    l.recorrencia,
    })
    setErroModal(null)
    setModalAberto(true)
  }

  async function handleSalvar() {
    if (!formInput.descricao.trim()) { setErroModal('Informe a descrição.'); return }
    if (!formInput.categoria) { setErroModal('Selecione a categoria.'); return }
    if (!formInput.valor || formInput.valor <= 0) { setErroModal('Informe um valor válido.'); return }
    // [BUG F-5 CORRIGIDO] Valida dia_vencimento (campo real do LancamentoInput)
    if (!formInput.dia_vencimento || formInput.dia_vencimento < 1 || formInput.dia_vencimento > 31) {
      setErroModal('Informe o dia de vencimento (1 a 31).')
      return
    }

    setSalvando(true)
    setErroModal(null)

    const ok = editando
      ? await updateLancamento(editando.id, { ...formInput, status: editStatus })
      : await createLancamento(formInput)

    setSalvando(false)
    if (ok) setModalAberto(false)
    else setErroModal('Erro ao salvar. Tente novamente.')
  }

  async function handleDeletar(id: string) {
    await deleteLancamento(id)
    setDeletandoId(null)
  }

  const categorias = CATEGORIAS[formInput.escopo]?.[formInput.tipo] ?? []

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {isAdmin && (
        <div className="flex gap-2">
          {(['agencia', 'pessoal'] as EscopoFinanceiro[]).map(e => (
            <button
              key={e}
              onClick={() => setEscopoAtivo(e)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${escopoAtivo === e
                ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30'
                : 'text-gray-400 border border-[#1a3a24] hover:border-[#00ff88]/30 hover:text-white'}`}
            >
              {e === 'agencia' ? '🏢 Agência' : '👤 Pessoal'}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Receitas */}
        <div className="bg-[#0d1510] border border-[#1a3a24] rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[#00ff88]">
              <TrendingUp size={18} />
              <span className="text-sm font-medium uppercase tracking-wider">Receitas</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-[#00ff88]" />
            </div>
            <span className="text-3xl font-bold text-white">{fmtBRL(totais.receita)}</span>
          </div>
          <p className="text-gray-500 text-xs mb-6">1 de {MESES[mesAtivo]} - {ultimoDia} de {MESES[mesAtivo]}</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[#00ff88] mb-1">
                <CheckCircle2 size={14} />
                <span className="text-xs font-medium">Recebido</span>
              </div>
              <p className="text-lg font-bold text-white">{fmtBRL(totais.receita_paga)}</p>
            </div>
            <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <RotateCcw size={14} />
                <span className="text-xs font-medium">A receber</span>
              </div>
              <p className="text-lg font-bold text-white">{fmtBRL(totais.receita_pendente)}</p>
            </div>
          </div>
        </div>

        {/* Card Despesas */}
        <div className="bg-[#0d1510] border border-[#1a3a24] rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-red-400">
              <TrendingDown size={18} />
              <span className="text-sm font-medium uppercase tracking-wider">Despesas</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <TrendingDown size={20} className="text-red-400" />
            </div>
            <span className="text-3xl font-bold text-white">{fmtBRL(totais.gasto + totais.investimento)}</span>
          </div>
          <p className="text-gray-500 text-xs mb-6">1 de {MESES[mesAtivo]} - {ultimoDia} de {MESES[mesAtivo]}</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-500 mb-1">
                <CheckCircle2 size={14} />
                <span className="text-xs font-medium">Pago</span>
              </div>
              <p className="text-lg font-bold text-white">{fmtBRL(totais.gasto_pago)}</p>
            </div>
            <div className="bg-[#0a0f0c] border border-[#1a3a24] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <RotateCcw size={14} />
                <span className="text-xs font-medium">A pagar</span>
              </div>
              <p className="text-lg font-bold text-white">{fmtBRL(totais.gasto_pendente)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 bg-[#0d1510] border border-[#1a3a24] rounded-2xl overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a3a24]">
            <div className="flex items-center gap-3">
              <button onClick={() => navMes(-1)} className="w-7 h-7 rounded-lg border border-[#1a3a24] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#00ff88]/40 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-white font-semibold text-sm">{MESES[mesAtivo]}</span>
              <button onClick={() => navMes(1)} className="w-7 h-7 rounded-lg border border-[#1a3a24] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#00ff88]/40 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => abrirModalCriar('receita')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30 text-xs font-medium hover:bg-[#00ff88]/20 transition-colors">
                <TrendingUp size={13} /> Receita
              </button>
              <button onClick={() => abrirModalCriar('despesa')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-medium hover:bg-red-500/20 transition-colors">
                <TrendingDown size={13} /> Despesa
              </button>
            </div>
          </div>

          <div className="flex border-b border-[#1a3a24]">
            {([['todas', 'Todas'], ['receitas', 'Receitas'], ['despesas', 'Despesas']] as [AbaFiltro, string][]).map(([val, label]) => (
              <button key={val} onClick={() => setAbaFiltro(val)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${abaFiltro === val ? 'text-[#00ff88] border-b-2 border-[#00ff88]' : 'text-gray-500 hover:text-gray-300'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="px-5 py-3 border-b border-[#1a3a24]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar por descrição ou categoria..."
                className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ff88]/40" />
            </div>
          </div>

          <div className="divide-y divide-[#1a3a24]">
            {loading ? (
              <div className="py-16 text-center text-gray-600 text-sm">Carregando...</div>
            ) : Object.keys(agrupados).length === 0 ? (
              <div className="py-16 text-center">
                <Wallet size={32} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-600 text-sm">Nenhum lançamento encontrado.</p>
                <p className="text-gray-700 text-xs mt-1">Adicione uma receita ou despesa acima.</p>
              </div>
            ) : (
              Object.entries(agrupados).map(([categoria, items]) => {
                const totalGrupo = items.reduce((s, i) => s + i.valor, 0)
                const pendentes = items.filter(i => i.status === 'pendente').length
                const isReceita = items[0]?.tipo === 'receita'
                return (
                  <div key={categoria}>
                    <div className="flex items-center justify-between px-5 py-3 bg-[#0a0f0c]/60">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold">{categoria}</span>
                        <span className="text-gray-600 text-xs">({items.length})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {pendentes > 0 && (
                          <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                            {pendentes} pendente{pendentes > 1 ? 's' : ''}
                          </span>
                        )}
                        <span className={`text-sm font-semibold ${isReceita ? 'text-[#00ff88]' : 'text-red-400'}`}>
                          {isReceita ? '+' : '-'}{fmtBRL(totalGrupo)}
                        </span>
                      </div>
                    </div>
                    {items.map(l => (
                      <div key={l.id} className={`flex items-center justify-between px-5 py-3.5 hover:bg-[#1a3a24]/20 transition-colors border-l-2 ${l.tipo === 'receita' ? 'border-l-[#00ff88]/40' : l.tipo === 'investimento' ? 'border-l-blue-500/40' : 'border-l-red-500/40'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{l.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {l.client_name && <span className="text-gray-600 text-xs flex items-center gap-1"><User size={10} /> {l.client_name}</span>}
                            {l.recorrente && <span className="text-gray-600 text-xs flex items-center gap-1"><RepeatIcon size={10} /> {l.recorrencia}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${l.status === 'pago' ? 'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/20' : l.status === 'atrasado' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'}`}>
                            {l.status === 'pago' ? 'Pago' : l.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                          </span>
                          <div className="text-right min-w-[100px]">
                            <p className={`text-sm font-semibold ${l.tipo === 'receita' ? 'text-[#00ff88]' : 'text-red-400'}`}>{fmtBRL(l.valor)}</p>
                            <p className="text-gray-600 text-xs">{fmtData(l.data_vencimento)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {l.status !== 'pago' && (
                              <button onClick={() => marcarComoPago(l.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-[#00ff88] hover:bg-[#00ff88]/10 transition-colors" title="Marcar como pago">
                                <CheckCircle2 size={15} />
                              </button>
                            )}
                            <button onClick={() => abrirModalEditar(l)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-white hover:bg-[#1a3a24] transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeletandoId(l.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="w-72 flex-shrink-0">
          <div className="bg-[#0d1510] border border-[#1a3a24] rounded-2xl p-5 sticky top-6">
            <h3 className="text-white text-sm font-semibold mb-1">Despesas</h3>
            <p className="text-gray-600 text-xs mb-5">
              {String(periodoInicio).slice(8)}/{String(mesAtivo + 1).padStart(2, '0')} — {String(periodoFim).slice(8)}/{String(mesAtivo + 1).padStart(2, '0')}
            </p>
            {dadosPizza.length > 0 ? <PieChart data={dadosPizza} /> : (
              <div className="py-12 text-center">
                <PiggyBank size={28} className="mx-auto text-gray-700 mb-2" />
                <p className="text-gray-600 text-xs">Sem despesas no período</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal criar/editar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalAberto(false)} />
          <div className="relative w-full max-w-md bg-[#0d1510] border border-[#1a3a24] rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className={`flex-shrink-0 flex items-center justify-between px-6 py-4 border-b ${modalTipo === 'receita' ? 'border-[#00ff88]/20' : 'border-red-500/20'}`}
              style={{ background: modalTipo === 'receita' ? 'rgba(0,255,136,0.05)' : 'rgba(239,68,68,0.05)' }}>
              <div className="flex items-center gap-2">
                {modalTipo === 'receita' ? <TrendingUp size={16} className="text-[#00ff88]" /> : <TrendingDown size={16} className="text-red-400" />}
                <h2 className="text-white font-semibold text-sm">{editando ? 'Editar' : 'Adicionar'} {modalTipo === 'receita' ? 'Receita' : 'Despesa'}</h2>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 custom-scrollbar">
              {erroModal && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-400 text-sm">
                  <AlertCircle size={15} /> {erroModal}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Valor</label>
                <input type="number" min="0" step="0.01" value={formInput.valor || ''} onChange={e => setFormInput(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))} placeholder="R$ 0,00"
                  className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#00ff88]/40" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Descrição</label>
                <input value={formInput.descricao} onChange={e => setFormInput(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Mensalidade cliente"
                  className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#00ff88]/40" />
              </div>

              {modalTipo === 'despesa' && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tipo</label>
                  <div className="flex gap-2">
                    {(['gasto', 'investimento'] as TipoLancamento[]).map(t => (
                      <button key={t} onClick={() => setFormInput(p => ({ ...p, tipo: t, categoria: '' }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${formInput.tipo === t ? 'border-[#00ff88]/40 text-[#00ff88] bg-[#00ff88]/10' : 'border-[#1a3a24] text-gray-500'}`}>
                        {t === 'gasto' ? 'Gasto' : 'Investimento'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Categoria</label>
                <select value={formInput.categoria} onChange={e => setFormInput(p => ({ ...p, categoria: e.target.value }))}
                  className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00ff88]/40 appearance-none">
                  <option value="">Escolha uma categoria</option>
                  {categorias.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* [INTEGRAÇÃO] Seleção de cliente removida. O financeiro agora é para gastos e receitas avulsas. Clientes são automáticos. */}

              {/* [BUG F-7] Toggle usa editStatus */}
              <div className="flex items-center justify-between bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  {modalTipo === 'receita' ? <TrendingUp size={15} className="text-gray-500" /> : <TrendingDown size={15} className="text-gray-500" />}
                  <div>
                    <p className="text-white text-xs font-medium">{modalTipo === 'receita' ? 'Não Foi Recebida' : 'Não Foi Paga'}</p>
                    <p className="text-gray-600 text-xs">Status do pagamento/recebimento</p>
                  </div>
                </div>
                <button onClick={() => setEditStatus(s => s === 'pendente' ? 'pago' : 'pendente')}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${editStatus === 'pago' ? 'bg-[#00ff88]' : 'bg-[#1a3a24]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 transform ${editStatus === 'pago' ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* [BUG F-6] Dia de vencimento (1-31) */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Dia de Vencimento (1 a 31)</label>
                <input type="number" min={1} max={31} value={formInput.dia_vencimento || ''} onChange={e => setFormInput(p => ({ ...p, dia_vencimento: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) }))} placeholder="Ex: 10"
                  className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#00ff88]/40" />
                <p className="text-gray-600 text-xs mt-1">A data de vencimento será calculada automaticamente para o próximo mês com esse dia.</p>
              </div>

              <div className="flex items-center justify-between bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Pin size={15} className="text-gray-500" />
                  <div>
                    <p className="text-white text-xs font-medium">{modalTipo === 'receita' ? 'Receita Fixa' : 'Despesa Fixa'}</p>
                    <p className="text-gray-600 text-xs">Classifica como uma {modalTipo === 'receita' ? 'receita' : 'despesa'} fixa</p>
                  </div>
                </div>
                <button onClick={() => setFormInput(p => ({ ...p, recorrente: !p.recorrente }))}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${formInput.recorrente ? 'bg-[#00ff88]' : 'bg-[#1a3a24]'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 transform ${formInput.recorrente ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {formInput.recorrente && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Repetir</label>
                  <div className="flex gap-2">
                    {(['mensal', 'semanal', 'anual'] as const).map(r => (
                      <button key={r} onClick={() => setFormInput(p => ({ ...p, recorrencia: r }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${formInput.recorrencia === r ? 'border-[#00ff88]/40 text-[#00ff88] bg-[#00ff88]/10' : 'border-[#1a3a24] text-gray-500'}`}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-3">
                <User size={15} className="text-gray-500" />
                <div>
                  <p className="text-white text-xs font-medium">Pessoa Responsável</p>
                  <p className="text-gray-600 text-xs">Thiago Santos</p>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 px-6 py-5 border-t border-[#1a3a24] bg-[#0d1510]/95 backdrop-blur-sm z-20">
              <div className="flex flex-col gap-2.5">
                <button onClick={handleSalvar} disabled={salvando}
                  className={`w-full py-4 rounded-xl text-sm font-bold shadow-xl transition-all active:scale-[0.96] disabled:opacity-50 ${modalTipo === 'receita' ? 'bg-[#00ff88] text-[#0a0f0c] hover:bg-[#00dd77] shadow-[#00ff88]/20' : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'}`}>
                  {salvando ? 'Salvando...' : `Salvar ${modalTipo === 'receita' ? 'Receita' : 'Despesa'}`}
                </button>
                <button onClick={() => setModalAberto(false)} className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-300 uppercase tracking-widest transition-colors">
                  Fechar Modal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal exclusão */}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeletandoId(null)} />
          <div className="relative w-full max-w-sm bg-[#0d1510] border border-red-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-center mb-1">Excluir lançamento?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletandoId(null)} className="flex-1 py-2.5 rounded-xl border border-[#1a3a24] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
              <button onClick={() => handleDeletar(deletandoId)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/30 transition-colors font-medium">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
