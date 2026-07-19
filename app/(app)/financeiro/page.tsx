'use client'
// app/(app)/financeiro/page.tsx — v2.3.1
// Valores ocultos por padrão; olhinho revela

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
  Search, Pencil, Trash2, CheckCircle2,
  ChevronLeft, ChevronRight, X, AlertCircle,
  RotateCcw, User, RepeatIcon, Pin, Eye, EyeOff,
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
  '#16A34A','#1A56DB','#4C3ABF','#86efac',
  '#f59e0b','#ef4444','#8b5cf6','#3b82f6','#06b6d4',
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
    <div className="flex flex-col gap-4">
      <svg viewBox="0 0 160 160" className="w-40 h-40 mx-auto">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} opacity={0.9} />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#64748B" fontSize="10" fontWeight="600">Total</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#16A34A" fontSize="9">
          {visiveis ? fmtBRL(total) : '••••••'}
        </text>
      </svg>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-text-muted truncate max-w-[110px]">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 text-right">
              <span className="text-text-muted">{s.pct}%</span>
              <span className="text-text-main font-medium">{visiveis ? fmtBRL(s.value) : '••••••'}</span>
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
  // Valores começam ocultos — usuário revela com o olhinho
  const [visiveis, setVisiveis] = useState(false)

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
    loading,
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

  // Sem isso, navegar de mês (setMesAtivo/setAnoAtivo) só refiltrava localmente
  // os lançamentos já carregados na memória (do mês em que a página abriu) —
  // nunca buscava do banco o mês pro qual o usuário navegou. Um lançamento com
  // vencimento em um mês diferente do que estava na tela quando ela carregou
  // nunca aparecia, mesmo navegando até o mês certo.
  useEffect(() => {
    atualizarFiltros({ dataInicio: periodoInicio, dataFim: periodoFim })
  }, [periodoInicio, periodoFim])

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
    const gastos = lancamentos.filter(l => l.tipo === 'gasto' || l.tipo === 'investimento')
    const porCat: Record<string, number> = {}
    gastos.forEach(l => { porCat[l.categoria] = (porCat[l.categoria] ?? 0) + l.valor })
    return Object.entries(porCat)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))
  }, [lancamentos])

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
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        {isAdmin && (
          <div className="flex gap-2">
            {(['agencia', 'pessoal'] as EscopoFinanceiro[]).map(e => (
              <button
                key={e}
                onClick={() => setEscopoAtivo(e)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  escopoAtivo === e
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-text-muted border border-border hover:border-primary/30 hover:text-text-main'
                }`}
              >
                {e === 'agencia' ? '🏢 Agência' : '👤 Pessoal'}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setVisiveis(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-border text-text-muted hover:border-primary/30 hover:text-text-main transition-colors ml-auto"
          title={visiveis ? 'Ocultar valores' : 'Mostrar valores'}
        >
          {visiveis ? <EyeOff size={15} /> : <Eye size={15} />}
          <span className="text-xs">{visiveis ? 'Ocultar' : 'Mostrar'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-cta">
              <TrendingUp size={18} />
              <span className="text-sm font-medium uppercase tracking-wider">Receitas</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-cta/10 border border-cta/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-cta" />
            </div>
            <span className="text-3xl font-bold text-text-main">{val(totais.receita)}</span>
          </div>
          <p className="text-text-muted text-xs mb-6">1 de {MESES[mesAtivo]} - {ultimoDia} de {MESES[mesAtivo]}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-cta mb-1">
                <CheckCircle2 size={14} />
                <span className="text-xs font-medium">Recebido</span>
              </div>
              <p className="text-lg font-bold text-text-main">{val(totais.receita_paga)}</p>
            </div>
            <div className="bg-background border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <RotateCcw size={14} />
                <span className="text-xs font-medium">A receber</span>
              </div>
              <p className="text-lg font-bold text-text-main">{val(totais.receita_pendente)}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-red-500">
              <TrendingDown size={18} />
              <span className="text-sm font-medium uppercase tracking-wider">Despesas</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <TrendingDown size={20} className="text-red-500" />
            </div>
            <span className="text-3xl font-bold text-text-main">{val(totais.gasto + totais.investimento)}</span>
          </div>
          <p className="text-text-muted text-xs mb-6">1 de {MESES[mesAtivo]} - {ultimoDia} de {MESES[mesAtivo]}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-cta mb-1">
                <CheckCircle2 size={14} />
                <span className="text-xs font-medium">Pago</span>
              </div>
              <p className="text-lg font-bold text-text-main">{val(totais.gasto_pago)}</p>
            </div>
            <div className="bg-background border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <RotateCcw size={14} />
                <span className="text-xs font-medium">A pagar</span>
              </div>
              <p className="text-lg font-bold text-text-main">{val(totais.gasto_pendente)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 bg-surface border border-border rounded-xl overflow-hidden shadow-sm">

          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <button onClick={() => navMes(-1)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text-main hover:border-primary/40 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-text-main font-semibold text-sm">{MESES[mesAtivo]}</span>
              <button onClick={() => navMes(1)} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text-main hover:border-primary/40 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => abrirModalCriar('receita')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cta/10 text-cta border border-cta/30 text-xs font-medium hover:bg-cta/20 transition-colors">
                <TrendingUp size={13} /> Receita
              </button>
              <button onClick={() => abrirModalCriar('despesa')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition-colors">
                <TrendingDown size={13} /> Despesa
              </button>
            </div>
          </div>

          <div className="flex border-b border-border">
            {([['todas', 'Todas'], ['receitas', 'Receitas'], ['despesas', 'Despesas']] as [AbaFiltro, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setAbaFiltro(v as AbaFiltro)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  abaFiltro === v ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-main'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="px-5 py-3 border-b border-border">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar por descrição ou categoria..."
                className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-2 text-sm text-text-main placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="divide-y divide-border">
            {loading ? (
              <div className="py-16 text-center text-text-disabled text-sm">Carregando...</div>
            ) : Object.keys(agrupados).length === 0 ? (
              <div className="py-16 text-center">
                <Wallet size={32} className="mx-auto text-text-disabled mb-3" />
                <p className="text-text-disabled text-sm">Nenhum lançamento encontrado.</p>
                <p className="text-text-disabled text-xs mt-1">Adicione uma receita ou despesa acima.</p>
              </div>
            ) : (
              Object.entries(agrupados).map(([categoria, items]) => {
                const totalGrupo = items.reduce((s, i) => s + i.valor, 0)
                const pendentes = items.filter(i => i.status === 'pendente').length
                const isReceita = items[0]?.tipo === 'receita'
                return (
                  <div key={categoria}>
                    <div className="flex items-center justify-between px-5 py-3 bg-hover-bg/60">
                      <div className="flex items-center gap-2">
                        <span className="text-text-main text-sm font-semibold">{categoria}</span>
                        <span className="text-text-disabled text-xs">({items.length})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {pendentes > 0 && (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {pendentes} pendente{pendentes > 1 ? 's' : ''}
                          </span>
                        )}
                        <span className={`text-sm font-semibold ${isReceita ? 'text-cta' : 'text-red-500'}`}>
                          {visiveis ? `${isReceita ? '+' : '-'}${fmtBRL(totalGrupo)}` : '••••••'}
                        </span>
                      </div>
                    </div>
                    {items.map(l => (
                      <div key={l.id} className={`flex items-center justify-between px-5 py-3.5 hover:bg-hover-bg transition-colors border-l-2 ${
                        l.tipo === 'receita' ? 'border-l-cta/40' : l.tipo === 'investimento' ? 'border-l-primary/40' : 'border-l-red-400/40'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-main text-sm font-medium truncate">{l.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {l.client_name && <span className="text-text-disabled text-xs flex items-center gap-1"><User size={10} /> {l.client_name}</span>}
                            {l.recorrente && <span className="text-text-disabled text-xs flex items-center gap-1"><RepeatIcon size={10} /> {l.recorrencia}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            l.status === 'pago'
                              ? 'text-cta bg-cta/10 border-cta/20'
                              : l.status === 'atrasado'
                                ? 'text-red-600 bg-red-50 border-red-200'
                                : 'text-amber-700 bg-amber-50 border-amber-200'
                          }`}>
                            {l.status === 'pago' ? 'Pago' : l.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                          </span>
                          <div className="text-right min-w-[100px]">
                            <p className={`text-sm font-semibold ${l.tipo === 'receita' ? 'text-cta' : 'text-red-500'}`}>
                              {visiveis ? fmtBRL(l.valor) : '••••••'}
                            </p>
                            <p className="text-text-disabled text-xs">{fmtData(l.data_vencimento)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {l.status !== 'pago' && (
                              <button onClick={() => marcarComoPago(l.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-disabled hover:text-cta hover:bg-cta/10 transition-colors" title="Marcar como pago">
                                <CheckCircle2 size={15} />
                              </button>
                            )}
                            <button onClick={() => abrirModalEditar(l)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-disabled hover:text-text-main hover:bg-hover-bg transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeletandoId(l.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-disabled hover:text-red-500 hover:bg-red-50 transition-colors">
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
          <div className="bg-surface border border-border rounded-xl p-5 sticky top-6 shadow-sm">
            <h3 className="text-text-main text-sm font-semibold mb-1">Despesas</h3>
            <p className="text-text-disabled text-xs mb-5">
              {String(periodoInicio).slice(8)}/{String(mesAtivo + 1).padStart(2, '0')} — {String(periodoFim).slice(8)}/{String(mesAtivo + 1).padStart(2, '0')}
            </p>
            {dadosPizza.length > 0 ? <PieChart data={dadosPizza} visiveis={visiveis} /> : (
              <div className="py-12 text-center">
                <PiggyBank size={28} className="mx-auto text-text-disabled mb-2" />
                <p className="text-text-disabled text-xs">Sem despesas no período</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalAberto(false)} />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className={`flex-shrink-0 flex items-center justify-between px-6 py-4 border-b ${
              modalTipo === 'receita' ? 'border-cta/20 bg-cta/5' : 'border-red-200 bg-red-50/50'
            }`}>
              <div className="flex items-center gap-2">
                {modalTipo === 'receita' ? <TrendingUp size={16} className="text-cta" /> : <TrendingDown size={16} className="text-red-500" />}
                <h2 className="text-text-main font-semibold text-sm">{editando ? 'Editar' : 'Adicionar'} {modalTipo === 'receita' ? 'Receita' : 'Despesa'}</h2>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-text-muted hover:text-text-main transition-colors"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {erroModal && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-sm">
                  <AlertCircle size={15} /> {erroModal}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-text-muted mb-1.5 block">Valor</label>
                <input type="number" min="0" step="0.01" value={formInput.valor || ''} onChange={e => setFormInput(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))} placeholder="R$ 0,00"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted mb-1.5 block">Descrição</label>
                <input value={formInput.descricao} onChange={e => setFormInput(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Mensalidade cliente"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              {modalTipo === 'despesa' && (
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1.5 block">Tipo</label>
                  <div className="flex gap-2">
                    {(['gasto', 'investimento'] as TipoLancamento[]).map(t => (
                      <button key={t} onClick={() => setFormInput(p => ({ ...p, tipo: t, categoria: '' }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          formInput.tipo === t ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-text-muted'
                        }`}>
                        {t === 'gasto' ? 'Gasto' : 'Investimento'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-text-muted mb-1.5 block">Categoria</label>
                <select value={formInput.categoria} onChange={e => setFormInput(p => ({ ...p, categoria: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none">
                  <option value="">Escolha uma categoria</option>
                  {categorias.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between bg-background border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  {modalTipo === 'receita' ? <TrendingUp size={15} className="text-text-muted" /> : <TrendingDown size={15} className="text-text-muted" />}
                  <div>
                    <p className="text-text-main text-xs font-medium">{modalTipo === 'receita' ? 'Não Foi Recebida' : 'Não Foi Paga'}</p>
                    <p className="text-text-disabled text-xs">Status do pagamento/recebimento</p>
                  </div>
                </div>
                <button onClick={() => setEditStatus(s => s === 'pendente' ? 'pago' : 'pendente')}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${editStatus === 'pago' ? 'bg-cta' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 transform ${editStatus === 'pago' ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted mb-1.5 block">Dia de Vencimento (1 a 31)</label>
                <input type="number" min={1} max={31} value={formInput.dia_vencimento || ''} onChange={e => setFormInput(p => ({ ...p, dia_vencimento: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) }))} placeholder="Ex: 10"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main text-sm placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                <p className="text-text-disabled text-xs mt-1">A data de vencimento será calculada automaticamente para o próximo mês com esse dia.</p>
              </div>
              <div className="flex items-center justify-between bg-background border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Pin size={15} className="text-text-muted" />
                  <div>
                    <p className="text-text-main text-xs font-medium">{modalTipo === 'receita' ? 'Receita Fixa' : 'Despesa Fixa'}</p>
                    <p className="text-text-disabled text-xs">Classifica como uma {modalTipo === 'receita' ? 'receita' : 'despesa'} fixa</p>
                  </div>
                </div>
                <button onClick={() => setFormInput(p => ({ ...p, recorrente: !p.recorrente }))}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${formInput.recorrente ? 'bg-cta' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 transform ${formInput.recorrente ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {formInput.recorrente && (
                <div>
                  <label className="text-xs font-medium text-text-muted mb-1.5 block">Repetir</label>
                  <div className="flex gap-2">
                    {(['mensal', 'semanal', 'anual'] as const).map(r => (
                      <button key={r} onClick={() => setFormInput(p => ({ ...p, recorrencia: r }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          formInput.recorrencia === r ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-text-muted'
                        }`}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 px-6 py-5 border-t border-border bg-surface">
              <div className="flex flex-col gap-2.5">
                <button onClick={handleSalvar} disabled={salvando}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
                    modalTipo === 'receita'
                      ? 'bg-cta text-white hover:bg-cta-hover'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}>
                  {salvando ? 'Salvando...' : `Salvar ${modalTipo === 'receita' ? 'Receita' : 'Despesa'}`}
                </button>
                <button onClick={() => setModalAberto(false)} className="w-full py-2 text-xs font-semibold text-text-muted hover:text-text-main uppercase tracking-widest transition-colors">
                  Fechar Modal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletandoId(null)} />
          <div className="relative w-full max-w-sm bg-surface border border-red-200 rounded-xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-text-main font-semibold text-center mb-1">Excluir lançamento?</h3>
            <p className="text-text-muted text-sm text-center mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletandoId(null)} className="flex-1 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:text-text-main transition-colors">Cancelar</button>
              <button onClick={() => handleDeletar(deletandoId)} className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm hover:bg-red-100 transition-colors font-medium">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
