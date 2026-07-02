'use client'
// app/(app)/financeiro/page.tsx — v1.0.0
// Módulo Financeiro — Dashboard + Listagem + Modal CRUD
// Projeto: Agência Digital Alpha

import { useState, useEffect } from 'react'
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
  Plus, Search, Filter, Pencil, Trash2, CheckCircle2,
  ChevronDown, X, AlertCircle, Calendar,
} from 'lucide-react'

// ── Helpers de formatação ─────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtData = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

// ── Cores por tipo ────────────────────────────────────────────
const corTipo: Record<TipoLancamento, string> = {
  receita:      'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/20',
  gasto:        'text-red-400 bg-red-400/10 border-red-400/20',
  investimento: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
}
const corStatus: Record<StatusLancamento, string> = {
  pendente: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  pago:     'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/20',
  atrasado: 'text-red-400 bg-red-400/10 border-red-400/20',
}

const labelTipo: Record<TipoLancamento, string> = {
  receita: 'Receita', gasto: 'Gasto', investimento: 'Investimento',
}
const labelStatus: Record<StatusLancamento, string> = {
  pendente: 'Pendente', pago: 'Pago', atrasado: 'Atrasado',
}
const labelPeriodo: Record<PeriodoFiltro, string> = {
  semana: 'Esta semana', mes: 'Este mês', '6meses': 'Últimos 6 meses',
  ano: 'Este ano', personalizado: 'Personalizado',
}

// ── Valores iniciais do modal ─────────────────────────────────
const inputVazio: LancamentoInput = {
  escopo:          'agencia',
  tipo:            'receita',
  categoria:       '',
  descricao:       '',
  valor:           0,
  data_vencimento: '',
  status:          'pendente',
  client_id:       null,
  recorrente:      false,
  recorrencia:     null,
}

// ═════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════
export default function FinanceiroPage() {
  const supabase = createClient()

  // Controle de escopo por perfil
  const [isAdmin, setIsAdmin]   = useState(false)
  const [escopoAtivo, setEscopoAtivo] = useState<EscopoFinanceiro>('agencia')

  // Clientes para o dropdown
  const [clientes, setClientes] = useState<{ id: string; name: string }[]>([])

  // Busca e filtros locais
  const [busca,         setBusca]         = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<PeriodoFiltro>('mes')
  const [filtroTipo,    setFiltroTipo]    = useState<TipoLancamento | 'todos'>('todos')
  const [filtroStatus,  setFiltroStatus]  = useState<StatusLancamento | 'todos'>('todos')

  // Modal
  const [modalAberto,    setModalAberto]    = useState(false)
  const [editando,       setEditando]       = useState<Lancamento | null>(null)
  const [formInput,      setFormInput]      = useState<LancamentoInput>(inputVazio)
  const [salvando,       setSalvando]       = useState(false)
  const [erroModal,      setErroModal]      = useState<string | null>(null)

  // Confirmação de exclusão
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  const {
    lancamentos,
    totais,
    loading,
    error,
    filtros,
    atualizarFiltros,
    refetch,
    createLancamento,
    updateLancamento,
    marcarComoPago,
    deleteLancamento,
  } = useFinanceiro({
    periodo: filtroPeriodo,
    escopo:  escopoAtivo,
    tipo:    filtroTipo,
    status:  filtroStatus,
  })

  // ── Detectar perfil ───────────────────────────────────────
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

  // ── Buscar clientes (Admin) ───────────────────────────────
  useEffect(() => {
    if (!isAdmin) return
    supabase.from('clients').select('id, name').order('name')
      .then(({ data }) => setClientes(data ?? []))
  }, [isAdmin])

  // ── Sincronizar filtros com hook ──────────────────────────
  useEffect(() => {
    atualizarFiltros({
      periodo: filtroPeriodo,
      escopo:  escopoAtivo,
      tipo:    filtroTipo,
      status:  filtroStatus,
    })
  }, [filtroPeriodo, escopoAtivo, filtroTipo, filtroStatus])

  // ── Listagem filtrada por busca ───────────────────────────
  const listagem = lancamentos.filter(l =>
    l.descricao.toLowerCase().includes(busca.toLowerCase()) ||
    l.categoria.toLowerCase().includes(busca.toLowerCase()) ||
    (l.client_name ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  // ── Abrir modal (criar) ───────────────────────────────────
  function abrirModalCriar() {
    setEditando(null)
    setFormInput({ ...inputVazio, escopo: escopoAtivo })
    setErroModal(null)
    setModalAberto(true)
  }

  // ── Abrir modal (editar) ──────────────────────────────────
  function abrirModalEditar(l: Lancamento) {
    setEditando(l)
    setFormInput({
      escopo:          l.escopo,
      tipo:            l.tipo,
      categoria:       l.categoria,
      descricao:       l.descricao,
      valor:           l.valor,
      data_vencimento: l.data_vencimento,
      data_pagamento:  l.data_pagamento,
      status:          l.status,
      client_id:       l.client_id,
      recorrente:      l.recorrente,
      recorrencia:     l.recorrencia,
    })
    setErroModal(null)
    setModalAberto(true)
  }

  // ── Salvar (criar ou editar) ──────────────────────────────
  async function handleSalvar() {
    if (!formInput.descricao.trim()) { setErroModal('Informe a descrição.'); return }
    if (!formInput.categoria)        { setErroModal('Selecione a categoria.'); return }
    if (!formInput.valor || formInput.valor <= 0) { setErroModal('Informe um valor válido.'); return }
    if (!formInput.data_vencimento)  { setErroModal('Informe a data de vencimento.'); return }

    setSalvando(true)
    setErroModal(null)

    let ok = false
    if (editando) {
      ok = await updateLancamento(editando.id, formInput)
    } else {
      ok = await createLancamento(formInput)
    }

    setSalvando(false)
    if (ok) setModalAberto(false)
    else    setErroModal('Erro ao salvar. Tente novamente.')
  }

  // ── Excluir ───────────────────────────────────────────────
  async function handleDeletar(id: string) {
    await deleteLancamento(id)
    setDeletandoId(null)
  }

  // ── Categorias disponíveis no form ────────────────────────
  const categorias = CATEGORIAS[formInput.escopo]?.[formInput.tipo] ?? []

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* ── CABEÇALHO ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Controle completo de receitas, gastos e investimentos
          </p>
        </div>
        <button
          onClick={abrirModalCriar}
          className="flex items-center gap-2 bg-[#00ff88] text-[#0a0f0c] font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-[#00e87a] transition-colors"
        >
          <Plus size={16} />
          Novo Lançamento
        </button>
      </div>

      {/* ── ABAS ESCOPO (só Admin vê ambas) ── */}
      {isAdmin && (
        <div className="flex gap-2 bg-[#0f1a14] border border-[#1a3a24] rounded-xl p-1 w-fit">
          {(['agencia', 'pessoal'] as EscopoFinanceiro[]).map(s => (
            <button
              key={s}
              onClick={() => setEscopoAtivo(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                escopoAtivo === s
                  ? 'bg-[#00ff88] text-[#0a0f0c]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {s === 'agencia' ? '🏢 Agência' : '👤 Pessoal'}
            </button>
          ))}
        </div>
      )}

      {/* ── CARDS DE TOTAIS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita */}
        <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Receitas</span>
            <div className="w-8 h-8 bg-[#00ff88]/10 rounded-xl flex items-center justify-center">
              <TrendingUp size={16} className="text-[#00ff88]" />
            </div>
          </div>
          <p className="text-[#00ff88] text-2xl font-bold">{fmtBRL(totais.receita)}</p>
          <p className="text-gray-600 text-xs mt-1">{labelPeriodo[filtroPeriodo]}</p>
        </div>

        {/* Gastos */}
        <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Gastos</span>
            <div className="w-8 h-8 bg-red-400/10 rounded-xl flex items-center justify-center">
              <TrendingDown size={16} className="text-red-400" />
            </div>
          </div>
          <p className="text-red-400 text-2xl font-bold">{fmtBRL(totais.gasto)}</p>
          <p className="text-gray-600 text-xs mt-1">{labelPeriodo[filtroPeriodo]}</p>
        </div>

        {/* Investimentos */}
        <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Investimentos</span>
            <div className="w-8 h-8 bg-blue-400/10 rounded-xl flex items-center justify-center">
              <PiggyBank size={16} className="text-blue-400" />
            </div>
          </div>
          <p className="text-blue-400 text-2xl font-bold">{fmtBRL(totais.investimento)}</p>
          <p className="text-gray-600 text-xs mt-1">{labelPeriodo[filtroPeriodo]}</p>
        </div>

        {/* Saldo */}
        <div className={`border rounded-2xl p-5 ${
          totais.saldo >= 0
            ? 'bg-[#0f1a14] border-[#1a3a24]'
            : 'bg-red-950/20 border-red-900/30'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Saldo</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              totais.saldo >= 0 ? 'bg-[#00ff88]/10' : 'bg-red-400/10'
            }`}>
              <Wallet size={16} className={totais.saldo >= 0 ? 'text-[#00ff88]' : 'text-red-400'} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${totais.saldo >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
            {fmtBRL(totais.saldo)}
          </p>
          <p className="text-gray-600 text-xs mt-1">{labelPeriodo[filtroPeriodo]}</p>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div className="flex flex-wrap gap-3">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar lançamento..."
            className="w-full bg-[#0f1a14] border border-[#1a3a24] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ff88]/40"
          />
        </div>

        {/* Período */}
        <div className="relative">
          <select
            value={filtroPeriodo}
            onChange={e => setFiltroPeriodo(e.target.value as PeriodoFiltro)}
            className="appearance-none bg-[#0f1a14] border border-[#1a3a24] rounded-xl px-4 py-2.5 pr-8 text-sm text-white focus:outline-none focus:border-[#00ff88]/40 cursor-pointer"
          >
            {(Object.keys(labelPeriodo) as PeriodoFiltro[]).filter(p => p !== 'personalizado').map(p => (
              <option key={p} value={p}>{labelPeriodo[p]}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        {/* Tipo */}
        <div className="relative">
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value as TipoLancamento | 'todos')}
            className="appearance-none bg-[#0f1a14] border border-[#1a3a24] rounded-xl px-4 py-2.5 pr-8 text-sm text-white focus:outline-none focus:border-[#00ff88]/40 cursor-pointer"
          >
            <option value="todos">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="gasto">Gastos</option>
            <option value="investimento">Investimentos</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value as StatusLancamento | 'todos')}
            className="appearance-none bg-[#0f1a14] border border-[#1a3a24] rounded-xl px-4 py-2.5 pr-8 text-sm text-white focus:outline-none focus:border-[#00ff88]/40 cursor-pointer"
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="pago">Pagos</option>
            <option value="atrasado">Atrasados</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* ── TABELA DE LANÇAMENTOS ── */}
      <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-[#1a3a24] flex items-center justify-between">
          <span className="text-white font-semibold text-sm">
            Lançamentos
            {listagem.length > 0 && (
              <span className="ml-2 text-gray-500 font-normal">({listagem.length})</span>
            )}
          </span>
        </div>

        {/* Estado de erro */}
        {error && (
          <div className="flex items-center gap-2 px-5 py-4 text-red-400 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Estado de loading */}
        {loading && !error && (
          <div className="py-16 text-center text-gray-500 text-sm">Carregando lançamentos...</div>
        )}

        {/* Estado vazio */}
        {!loading && !error && listagem.length === 0 && (
          <div className="py-16 text-center">
            <Wallet size={32} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-400 font-medium text-sm">Nenhum lançamento encontrado</p>
            <p className="text-gray-600 text-xs mt-1">Clique em "Novo Lançamento" para começar</p>
          </div>
        )}

        {/* Tabela */}
        {!loading && listagem.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a3a24]">
                  {['Descrição', 'Tipo', 'Categoria', 'Valor', 'Vencimento', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listagem.map((l, i) => (
                  <tr key={l.id} className={`border-b border-[#1a3a24]/50 last:border-0 hover:bg-[#1a3a24]/20 transition-colors ${i % 2 === 0 ? '' : 'bg-[#0a0f0c]/30'}`}>
                    {/* Descrição */}
                    <td className="px-5 py-3">
                      <p className="text-white font-medium">{l.descricao}</p>
                      {l.client_name && (
                        <p className="text-gray-500 text-xs mt-0.5">👤 {l.client_name}</p>
                      )}
                      {l.recorrente && (
                        <p className="text-gray-600 text-xs mt-0.5">🔄 {l.recorrencia}</p>
                      )}
                    </td>
                    {/* Tipo */}
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${corTipo[l.tipo]}`}>
                        {labelTipo[l.tipo]}
                      </span>
                    </td>
                    {/* Categoria */}
                    <td className="px-5 py-3 text-gray-400 text-xs">{l.categoria}</td>
                    {/* Valor */}
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${
                        l.tipo === 'receita' ? 'text-[#00ff88]' :
                        l.tipo === 'gasto'   ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {l.tipo === 'receita' ? '+' : '-'}{fmtBRL(l.valor)}
                      </span>
                    </td>
                    {/* Vencimento */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <Calendar size={12} />
                        {fmtData(l.data_vencimento)}
                      </div>
                      {l.data_pagamento && (
                        <p className="text-gray-600 text-xs mt-0.5">Pago: {fmtData(l.data_pagamento)}</p>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${corStatus[l.status]}`}>
                        {labelStatus[l.status]}
                      </span>
                    </td>
                    {/* Ações */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {l.status !== 'pago' && (
                          <button
                            onClick={() => marcarComoPago(l.id)}
                            title="Marcar como pago"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#00ff88] hover:bg-[#00ff88]/10 transition-colors"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => abrirModalEditar(l)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1a3a24]/40 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeletandoId(l.id)}
                          title="Excluir"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MODAL — CRIAR / EDITAR LANÇAMENTO
      ══════════════════════════════════════════════════════ */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalAberto(false)} />
          <div className="relative w-full max-w-lg bg-[#0f1a14] border border-[#1a3a24] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a3a24]">
              <h2 className="text-white font-semibold">
                {editando ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Corpo */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Escopo (só Admin vê) */}
              {isAdmin && (
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Escopo</label>
                  <div className="flex gap-2">
                    {(['agencia', 'pessoal'] as EscopoFinanceiro[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setFormInput(p => ({ ...p, escopo: s, categoria: '' }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                          formInput.escopo === s
                            ? 'bg-[#00ff88]/10 border-[#00ff88]/40 text-[#00ff88]'
                            : 'border-[#1a3a24] text-gray-400 hover:text-white'
                        }`}
                      >
                        {s === 'agencia' ? '🏢 Agência' : '👤 Pessoal'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tipo */}
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Tipo</label>
                <div className="flex gap-2">
                  {(['receita', 'gasto', 'investimento'] as TipoLancamento[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setFormInput(p => ({ ...p, tipo: t, categoria: '' }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        formInput.tipo === t
                          ? t === 'receita'      ? 'bg-[#00ff88]/10 border-[#00ff88]/40 text-[#00ff88]'
                          : t === 'gasto'        ? 'bg-red-400/10 border-red-400/40 text-red-400'
                          :                        'bg-blue-400/10 border-blue-400/40 text-blue-400'
                          : 'border-[#1a3a24] text-gray-400 hover:text-white'
                      }`}
                    >
                      {labelTipo[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Categoria</label>
                <div className="relative">
                  <select
                    value={formInput.categoria}
                    onChange={e => setFormInput(p => ({ ...p, categoria: e.target.value }))}
                    className="w-full appearance-none bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 pr-8 text-sm text-white focus:outline-none focus:border-[#00ff88]/40"
                  >
                    <option value="">Selecione...</option>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Descrição</label>
                <input
                  value={formInput.descricao}
                  onChange={e => setFormInput(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Ex: Mensalidade junho — Cliente João"
                  className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ff88]/40"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Valor (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formInput.valor || ''}
                  onChange={e => setFormInput(p => ({ ...p, valor: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                  className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ff88]/40"
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Vencimento</label>
                  <input
                    type="date"
                    value={formInput.data_vencimento}
                    onChange={e => setFormInput(p => ({ ...p, data_vencimento: e.target.value }))}
                    className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00ff88]/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Pagamento</label>
                  <input
                    type="date"
                    value={formInput.data_pagamento ?? ''}
                    onChange={e => setFormInput(p => ({ ...p, data_pagamento: e.target.value || null }))}
                    className="w-full bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00ff88]/40"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Status</label>
                <div className="relative">
                  <select
                    value={formInput.status ?? 'pendente'}
                    onChange={e => setFormInput(p => ({ ...p, status: e.target.value as StatusLancamento }))}
                    className="w-full appearance-none bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 pr-8 text-sm text-white focus:outline-none focus:border-[#00ff88]/40"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Cliente (só agência) */}
              {formInput.escopo === 'agencia' && isAdmin && clientes.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 block">Cliente (opcional)</label>
                  <div className="relative">
                    <select
                      value={formInput.client_id ?? ''}
                      onChange={e => setFormInput(p => ({ ...p, client_id: e.target.value || null }))}
                      className="w-full appearance-none bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-2.5 pr-8 text-sm text-white focus:outline-none focus:border-[#00ff88]/40"
                    >
                      <option value="">Sem vínculo</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Recorrência */}
              <div className="flex items-center gap-3 bg-[#0a0f0c] border border-[#1a3a24] rounded-xl px-4 py-3">
                <input
                  type="checkbox"
                  id="recorrente"
                  checked={formInput.recorrente ?? false}
                  onChange={e => setFormInput(p => ({
                    ...p,
                    recorrente: e.target.checked,
                    recorrencia: e.target.checked ? 'mensal' : null,
                  }))}
                  className="accent-[#00ff88] w-4 h-4"
                />
                <label htmlFor="recorrente" className="text-sm text-gray-300 cursor-pointer flex-1">
                  Lançamento recorrente
                </label>
                {formInput.recorrente && (
                  <div className="relative">
                    <select
                      value={formInput.recorrencia ?? 'mensal'}
                      onChange={e => setFormInput(p => ({ ...p, recorrencia: e.target.value as any }))}
                      className="appearance-none bg-[#1a3a24]/40 border border-[#1a3a24] rounded-lg px-3 py-1.5 pr-7 text-xs text-white focus:outline-none"
                    >
                      <option value="mensal">Mensal</option>
                      <option value="semanal">Semanal</option>
                      <option value="anual">Anual</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Erro */}
              {erroModal && (
                <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  <AlertCircle size={15} /> {erroModal}
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1a3a24]">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-[#1a3a24]/40 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00ff88] text-[#0a0f0c] hover:bg-[#00e87a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — CONFIRMAR EXCLUSÃO
      ══════════════════════════════════════════════════════ */}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletandoId(null)} />
          <div className="relative w-full max-w-sm bg-[#0f1a14] border border-[#1a3a24] rounded-2xl shadow-2xl p-6">
            <div className="w-12 h-12 bg-red-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-center mb-2">Excluir lançamento?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletandoId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white border border-[#1a3a24] hover:bg-[#1a3a24]/40 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeletar(deletandoId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
