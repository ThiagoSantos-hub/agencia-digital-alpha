'use client'
// app/(app)/financeiro/page.tsx — v2.2.0
// CORREÇÕES v2.1.0: [BUG F-1 a F-7]
// NOVO v2.2.0: [FEATURE] Botão olho para ocultar/mostrar valores financeiros

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
  RotateCcw, User, RepeatIcon, Pin, Eye, EyeOff,
  ChevronDown
} from 'lucide-react'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtData = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const PALETTE = [
  '#1A56DB','#16A34A','#F59E0B','#EF4444',
  '#8b5cf6','#06b6d4','#10b981','#f97316','#0ea5e9',
]

type AbaFiltro = 'todas' | 'receitas' | 'despesas'

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

function PieChart({ data, visiveis }: { data: { label: string; value: number; color: string }[], visiveis: boolean }) {
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
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1E293B" fontSize="10" fontWeight="600">Total</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#16A34A" fontSize="9" fontWeight="bold">
          {visiveis ? fmtBRL(total) : '••••••'}
        </text>
      </svg>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[#64748B] truncate max-w-[110px]">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 text-right">
              <span className="text-[#64748B] opacity-60">{s.pct}%</span>
              <span className="text-[#1E293B] font-medium">{visiveis ? fmtBRL(s.value) : '••••••'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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

  // [FEATURE v2.2.0] Ocultar/mostrar valores
  const [visiveis, setVisiveis] = useState(true)

  const [modalAberto, setModalAberto] = useState(false)
  const [modalTipo, setModalTipo] = useState<'receita' | 'despesa'>('receita')
  const [editando, setEditando] = useState<Lancamento | null>(null)
  const [formInput, setFormInput] = useState<LancamentoInput>(inputVazio)
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
    supabase.from('clients').select('id, name, monthly_fee, payment_day').order('name')
      .then(({ data }) => setClientes(data ?? []))
  }, [isAdmin])

  const listagem = useMemo(() => {
    const filtradosPorMes = lancamentos.filter(l => {
      const dataVenc = new Date(l.data_vencimento + 'T00:00:00')
      return l.recorrente || (dataVenc.getMonth() === mesAtivo && dataVenc.getFullYear() === anoAtivo)
    })

    return filtradosPorMes.map(l => {
      const dataVencOriginal = new Date(l.data_vencimento + 'T00:00:00')
      const ehMesDiferente = dataVencOriginal.getMonth() !== mesAtivo || dataVencOriginal.getFullYear() !== anoAtivo

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
    const gastos = listagem.filter(l => l.tipo === 'gasto' || l.tipo === 'investimento')
    const porCat: Record<string, number> = {}
    gastos.forEach(l => { porCat[l.categoria] = (porCat[l.categoria] ?? 0) + l.valor })
    return Object.entries(porCat)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))
  }, [listagem])

  // helper para exibir ou mascarar
  const val = (v: number) => visiveis ? fmtBRL(v) : '••••••'

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
    setFormInput({ ...inputVazio, escopo: escopoAtivo, tipo: tipo === 'receita' ? 'receita' : 'gasto' })
    setErroModal(null)
    setModalAberto(true)
  }

  function abrirModalEditar(l: Lancamento) {
    setEditando(l)
    setModalTipo(l.tipo === 'receita' ? 'receita' : 'despesa')
    setEditStatus(l.status)
    setFormInput({
      escopo: l.escopo, tipo: l.tipo, categoria: l.categoria, descricao: l.descricao,
      valor: l.valor, dia_vencimento: l.dia_vencimento, client_id: l.client_id,
      recorrente: l.recorrente, recorrencia: l.recorrencia,
    })
    setErroModal(null)
    setModalAberto(true)
  }

  async function handleSalvar() {
    if (!formInput.descricao.trim()) { setErroModal('Informe a descrição.'); return }
    if (!formInput.categoria) { setErroModal('Selecione a categoria.'); return }
    if (!formInput.valor || formInput.valor <= 0) { setErroModal('Informe um valor válido.'); return }
    if (!formInput.dia_vencimento || formInput.dia_vencimento < 1 || formInput.dia_vencimento > 31) {
      setErroModal('Informe o dia de vencimento (1 a 31).'); return
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 space-y-6">

      {/* Topo: abas escopo + botão olho */}
      <div className="flex items-center justify-between">
        {isAdmin && (
          <div className="flex gap-2">
            {(['agencia', 'pessoal'] as EscopoFinanceiro[]).map(e => (
              <button
                key={e}
                onClick={() => setEscopoAtivo(e)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${escopoAtivo === e
                  ? 'bg-[#EFF6FF] text-[#1A56DB] border border-[#BFDBFE]'
                  : 'text-[#64748B] border border-[#E2E8F0] hover:border-[#1A56DB] hover:text-[#1A56DB] bg-white'}`}
              >
                {e === 'agencia' ? '🏢 Agência' : '👤 Pessoal'}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setVisiveis(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-[#E2E8F0] text-[#64748B] hover:border-[#1A56DB] hover:text-[#1A56DB] bg-white transition-all ml-auto shadow-sm"
          title={visiveis ? 'Ocultar valores' : 'Mostrar valores'}
        >
          {visiveis ? <EyeOff size={15} /> : <Eye size={15} />}
          <span className="text-xs font-medium">{visiveis ? 'Ocultar' : 'Mostrar'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Receitas */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[#16A34A]">
              <TrendingUp size={18} />
              <span className="text-sm font-semibold uppercase tracking-wider">Receitas</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-[#16A34A]" />
            </div>
            <span className="text-3xl font-bold text-[#1E293B]">{val(totais.receita)}</span>
          </div>
          <p className="text-[#64748B] text-xs mb-6 font-medium">1 de {MESES[mesAtivo]} - {ultimoDia} de {MESES[mesAtivo]}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[#16A34A] mb-1">
                <CheckCircle2 size={14} />
                <span className="text-xs font-semibold">Recebido</span>
              </div>
              <p className="text-lg font-bold text-[#1E293B]">{val(totais.receita_paga)}</p>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[#F59E0B] mb-1">
                <RotateCcw size={14} />
                <span className="text-xs font-semibold">A receber</span>
              </div>
              <p className="text-lg font-bold text-[#1E293B]">{val(totais.receita_pendente)}</p>
            </div>
          </div>
        </div>

        {/* Card Despesas */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[#EF4444]">
              <TrendingDown size={18} />
              <span className="text-sm font-semibold uppercase tracking-wider">Despesas</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
              <TrendingDown size={20} className="text-[#EF4444]" />
            </div>
            <span className="text-3xl font-bold text-[#1E293B]">{val(totais.gasto + totais.investimento)}</span>
          </div>
          <p className="text-[#64748B] text-xs mb-6 font-medium">Previsão total de saídas</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[#EF4444] mb-1">
                <CheckCircle2 size={14} />
                <span className="text-xs font-semibold">Pago</span>
              </div>
              <p className="text-lg font-bold text-[#1E293B]">{val(totais.gasto_pago)}</p>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[#F59E0B] mb-1">
                <RotateCcw size={14} />
                <span className="text-xs font-semibold">A pagar</span>
              </div>
              <p className="text-lg font-bold text-[#1E293B]">{val(totais.gasto_pendente)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Ações e Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => navMes(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-[#64748B] transition-all"><ChevronLeft size={20} /></button>
          <div className="flex flex-col items-center min-w-[140px]">
            <span className="text-sm font-bold text-[#1E293B] uppercase tracking-tight">{MESES[mesAtivo]}</span>
            <span className="text-[10px] font-semibold text-[#64748B]">{anoAtivo}</span>
          </div>
          <button onClick={() => navMes(1)} className="p-2 hover:bg-gray-100 rounded-lg text-[#64748B] transition-all"><ChevronRight size={20} /></button>
        </div>

        <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
          {(['todas', 'receitas', 'despesas'] as AbaFiltro[]).map(a => (
            <button
              key={a}
              onClick={() => setAbaFiltro(a)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${abaFiltro === a
                ? 'bg-white text-[#1A56DB] shadow-sm'
                : 'text-[#64748B] hover:text-[#1E293B]'}`}
            >
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => abrirModalCriar('despesa')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#EF4444] text-sm font-semibold hover:bg-red-50 transition-all shadow-sm"
          >
            <TrendingDown size={16} /> Saída
          </button>
          <button
            onClick={() => abrirModalCriar('receita')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A56DB] text-white text-sm font-semibold hover:bg-[#1A56DB]/90 transition-all shadow-sm"
          >
            <Plus size={16} /> Entrada
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listagem principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3 bg-[#F8FAFC]">
              <Search size={18} className="text-[#64748B]" />
              <input
                type="text"
                placeholder="Buscar lançamentos..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-[#1E293B] w-full placeholder-[#64748B] font-medium"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="px-6 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Vencimento</th>
                    <th className="px-6 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Valor</th>
                    <th className="px-6 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-[#64748B] animate-pulse font-medium">Carregando dados...</td></tr>
                  ) : listagem.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-[#64748B] italic font-medium">Nenhum lançamento este mês.</td></tr>
                  ) : (
                    listagem.map(l => {
                      const atrasado = l.status === 'pendente' && new Date(l.data_vencimento + 'T23:59:59') < hoje
                      return (
                        <tr key={l.id} className="hover:bg-[#F8FAFC] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-[#1E293B]">{fmtData(l.data_vencimento)}</span>
                              {l.recorrente && <span className="text-[9px] text-[#1A56DB] font-bold flex items-center gap-0.5"><RepeatIcon size={8}/> RECORRENTE</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[#1E293B]">{l.descricao}</span>
                              <span className="text-[10px] text-[#64748B] font-semibold uppercase">{l.categoria}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-bold ${l.tipo === 'receita' ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>
                              {l.tipo === 'receita' ? '+' : '-'} {val(l.valor)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {l.status === 'pago' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase">Pago</span>
                              ) : atrasado ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 uppercase">Atrasado</span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">Pendente</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {l.status === 'pendente' && (
                                <button
                                  onClick={() => marcarComoPago(l.id)}
                                  className="p-1.5 text-[#16A34A] hover:bg-green-50 rounded-lg transition-all"
                                  title="Marcar como pago"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => abrirModalEditar(l)}
                                className="p-1.5 text-[#1A56DB] hover:bg-blue-50 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => setDeletandoId(l.id)}
                                className="p-1.5 text-[#EF4444] hover:bg-red-50 rounded-lg transition-all"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Lateral: Resumo por Categoria */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#1E293B] uppercase tracking-wider mb-6 flex items-center gap-2">
              <PiggyBank size={18} className="text-[#1A56DB]" />
              Gastos por Categoria
            </h3>
            {dadosPizza.length > 0 ? (
              <PieChart data={dadosPizza} visiveis={visiveis} />
            ) : (
              <div className="py-12 text-center text-[#64748B] italic text-sm font-medium">
                Sem despesas registradas.
              </div>
            )}
          </div>

          <div className="bg-[#1A56DB] rounded-3xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform duration-500">
              <Wallet size={120} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 opacity-80">Saldo Projetado</h3>
            <p className="text-3xl font-bold mb-1">{val(totais.saldo)}</p>
            <p className="text-[10px] opacity-70 font-medium">Considerando todos os lançamentos do mês</p>
          </div>
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#E2E8F0] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${modalTipo === 'receita' ? 'bg-green-50 text-[#16A34A]' : 'bg-red-50 text-[#EF4444]'}`}>
                  {modalTipo === 'receita' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <h3 className="text-lg font-semibold text-[#1E293B]">
                  {editando ? 'Editar Lançamento' : `Nova ${modalTipo === 'receita' ? 'Receita' : 'Despesa'}`}
                </h3>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-[#64748B] hover:text-[#1E293B] transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {erroModal && (
                <div className="bg-red-50 border border-red-100 text-[#EF4444] px-4 py-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <AlertCircle size={14} /> {erroModal}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Descrição *</label>
                <input
                  type="text"
                  value={formInput.descricao}
                  onChange={e => setFormInput({ ...formInput, descricao: e.target.value })}
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all font-medium"
                  placeholder="Ex: Pagamento Mensalidade"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Valor (R$) *</label>
                  <input
                    type="number"
                    value={formInput.valor || ''}
                    onChange={e => setFormInput({ ...formInput, valor: Number(e.target.value) })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all font-bold"
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Dia Vencimento *</label>
                  <input
                    type="number"
                    min="1" max="31"
                    value={formInput.dia_vencimento}
                    onChange={e => setFormInput({ ...formInput, dia_vencimento: Number(e.target.value) })}
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Categoria *</label>
                  <div className="relative">
                    <select
                      value={formInput.categoria}
                      onChange={e => setFormInput({ ...formInput, categoria: e.target.value })}
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all appearance-none font-medium"
                    >
                      <option value="">Selecione...</option>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">Tipo</label>
                  <div className="relative">
                    <select
                      value={formInput.tipo}
                      onChange={e => setFormInput({ ...formInput, tipo: e.target.value as any })}
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all appearance-none font-medium"
                    >
                      <option value="receita">Receita</option>
                      <option value="gasto">Gasto</option>
                      <option value="investimento">Investimento</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {escopoAtivo === 'agencia' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest flex items-center gap-1">
                    <User size={10} /> Cliente Vinculado (Opcional)
                  </label>
                  <div className="relative">
                    <select
                      value={formInput.client_id || ''}
                      onChange={e => setFormInput({ ...formInput, client_id: e.target.value || null })}
                      className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all appearance-none font-medium"
                    >
                      <option value="">Nenhum</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={16} />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6 py-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formInput.recorrente}
                    onChange={e => setFormInput({ ...formInput, recorrente: e.target.checked })}
                    className="w-4 h-4 rounded border-[#E2E8F0] text-[#1A56DB] focus:ring-[#1A56DB]"
                  />
                  <span className="text-xs font-semibold text-[#1E293B] group-hover:text-[#1A56DB] transition-colors flex items-center gap-1">
                    <RepeatIcon size={12} /> Lançamento Recorrente
                  </span>
                </label>

                {editando && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={editStatus === 'pago'}
                      onChange={e => setEditStatus(e.target.checked ? 'pago' : 'pendente')}
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#16A34A] focus:ring-[#16A34A]"
                    />
                    <span className="text-xs font-semibold text-[#1E293B] group-hover:text-[#16A34A] transition-colors flex items-center gap-1">
                      <CheckCircle2 size={12} /> Já está pago
                    </span>
                  </label>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setModalAberto(false)}
                  className="flex-1 py-3 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-2xl hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className={`flex-1 py-3 rounded-2xl text-white font-semibold shadow-sm transition-all flex items-center justify-center gap-2 ${modalTipo === 'receita' ? 'bg-[#16A34A] hover:bg-[#16A34A]/90' : 'bg-[#EF4444] hover:bg-[#EF4444]/90'} disabled:opacity-50`}
                >
                  {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Lançamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação Delete */}
      {deletandoId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#EF4444] flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-[#1E293B] mb-2">Excluir lançamento?</h3>
            <p className="text-sm text-[#64748B] mb-6 font-medium">Esta ação não pode ser desfeita e removerá o registro permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletandoId(null)} className="flex-1 py-2.5 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-xl hover:bg-gray-50 transition-all">Cancelar</button>
              <button onClick={() => handleDeletar(deletandoId)} className="flex-1 py-2.5 bg-[#EF4444] text-white font-semibold rounded-xl hover:bg-[#EF4444]/90 transition-all shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
