// hooks/useFinanceiro.ts
// Projeto: Agência Digital Alpha
// Módulo Financeiro — CRUD + filtros por período + totais
// Supabase client: sempre import { createClient } from '@/lib/supabase'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

// ============================================================
// TIPOS
// ============================================================

export type EscopoFinanceiro = 'agencia' | 'pessoal'
export type TipoLancamento   = 'receita' | 'gasto' | 'investimento'
export type StatusLancamento = 'pendente' | 'pago' | 'atrasado'
export type PeriodoFiltro    = 'semana' | 'mes' | '6meses' | 'ano' | 'personalizado'
export type Recorrencia      = 'mensal' | 'semanal' | 'anual'

export interface Lancamento {
  id:               string
  user_id:          string
  escopo:           EscopoFinanceiro
  tipo:             TipoLancamento
  categoria:        string
  descricao:        string
  valor:            number
  data_vencimento:  string   // ISO date YYYY-MM-DD
  data_pagamento:   string | null
  status:           StatusLancamento
  client_id:        string | null
  recorrente:       boolean
  recorrencia:      Recorrencia | null
  created_at:       string
  updated_at:       string
  // join opcional
  client_name?:     string
}

export interface LancamentoInput {
  escopo:           EscopoFinanceiro
  tipo:             TipoLancamento
  categoria:        string
  descricao:        string
  valor:            number
  data_vencimento:  string
  data_pagamento?:  string | null
  status?:          StatusLancamento
  client_id?:       string | null
  recorrente?:      boolean
  recorrencia?:     Recorrencia | null
}

export interface Totais {
  receita:      number
  gasto:        number
  investimento: number
  saldo:        number
}

export interface FiltrosFinanceiro {
  periodo:        PeriodoFiltro
  dataInicio?:    string   // usado quando periodo = 'personalizado'
  dataFim?:       string
  tipo?:          TipoLancamento | 'todos'
  escopo?:        EscopoFinanceiro | 'todos'
  status?:        StatusLancamento | 'todos'
}

// ============================================================
// CATEGORIAS POR TIPO E ESCOPO
// ============================================================

export const CATEGORIAS: Record<EscopoFinanceiro, Record<TipoLancamento, string[]>> = {
  agencia: {
    receita: [
      'Mensalidade de cliente',
      'Projeto avulso',
      'Consultoria',
      'Outros',
    ],
    gasto: [
      'Ferramentas e software',
      'Salários / colaboradores',
      'Marketing próprio',
      'Aluguel / escritório',
      'Impostos',
      'Outros',
    ],
    investimento: [
      'Cursos e capacitação',
      'Equipamentos',
      'Ads próprios',
      'Outros',
    ],
  },
  pessoal: {
    receita: [
      'Salário fixo',
      'Freelance',
      'Outros',
    ],
    gasto: [
      'Alimentação',
      'Aluguel / moradia',
      'Internet',
      'Gás / água / luz',
      'Transporte',
      'Saúde',
      'Educação',
      'Lazer',
      'Outros',
    ],
    investimento: [
      'Poupança',
      'Ações / cripto',
      'Outros',
    ],
  },
}

// ============================================================
// UTILITÁRIOS DE DATA
// ============================================================

function getIntervalo(filtros: FiltrosFinanceiro): { inicio: string; fim: string } {
  const hoje = new Date()
  const fmt  = (d: Date) => d.toISOString().split('T')[0]

  switch (filtros.periodo) {
    case 'semana': {
      const inicio = new Date(hoje)
      inicio.setDate(hoje.getDate() - 6)
      return { inicio: fmt(inicio), fim: fmt(hoje) }
    }
    case 'mes': {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      return { inicio: fmt(inicio), fim: fmt(hoje) }
    }
    case '6meses': {
      const inicio = new Date(hoje)
      inicio.setMonth(hoje.getMonth() - 5)
      inicio.setDate(1)
      return { inicio: fmt(inicio), fim: fmt(hoje) }
    }
    case 'ano': {
      const inicio = new Date(hoje.getFullYear(), 0, 1)
      return { inicio: fmt(inicio), fim: fmt(hoje) }
    }
    case 'personalizado':
      return {
        inicio: filtros.dataInicio ?? fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
        fim:    filtros.dataFim    ?? fmt(hoje),
      }
  }
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useFinanceiro(filtrosIniciais?: Partial<FiltrosFinanceiro>) {
  const supabase = createClient()

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [totais,      setTotais]      = useState<Totais>({ receita: 0, gasto: 0, investimento: 0, saldo: 0 })
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  const [filtros, setFiltros] = useState<FiltrosFinanceiro>({
    periodo: 'mes',
    tipo:    'todos',
    escopo:  'todos',
    status:  'todos',
    ...filtrosIniciais,
  })

  // ── FETCH ──────────────────────────────────────────────────
  const fetchLancamentos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { inicio, fim } = getIntervalo(filtros)

      let query = supabase
        .from('finances')
        .select(`
          *,
          clients (name)
        `)
        .gte('data_vencimento', inicio)
        .lte('data_vencimento', fim)
        .order('data_vencimento', { ascending: false })

      if (filtros.tipo   && filtros.tipo   !== 'todos') query = query.eq('tipo',   filtros.tipo)
      if (filtros.escopo && filtros.escopo !== 'todos') query = query.eq('escopo', filtros.escopo)
      if (filtros.status && filtros.status !== 'todos') query = query.eq('status', filtros.status)

      const { data, error: err } = await query

      if (err) throw err

      const lista: Lancamento[] = (data ?? []).map((row: any) => ({
        ...row,
        client_name: row.clients?.name ?? null,
      }))

      setLancamentos(lista)

      // Calcular totais
      const t: Totais = { receita: 0, gasto: 0, investimento: 0, saldo: 0 }
      lista.forEach(l => {
        if (l.tipo === 'receita')      t.receita      += l.valor
        if (l.tipo === 'gasto')        t.gasto        += l.valor
        if (l.tipo === 'investimento') t.investimento += l.valor
      })
      t.saldo = t.receita - t.gasto - t.investimento
      setTotais(t)

    } catch (e: any) {
      setError(e.message ?? 'Erro ao buscar lançamentos')
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => { fetchLancamentos() }, [fetchLancamentos])

  // ── CREATE ─────────────────────────────────────────────────
  async function createLancamento(input: LancamentoInput): Promise<boolean> {
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Usuário não autenticado'); return false }

    const { error: err } = await supabase.from('finances').insert({
      ...input,
      user_id:    user.id,
      status:     input.status ?? 'pendente',
      recorrente: input.recorrente ?? false,
    })

    if (err) { setError(err.message); return false }
    await fetchLancamentos()
    return true
  }

  // ── UPDATE ─────────────────────────────────────────────────
  async function updateLancamento(id: string, input: Partial<LancamentoInput>): Promise<boolean> {
    setError(null)

    const { error: err } = await supabase
      .from('finances')
      .update(input)
      .eq('id', id)

    if (err) { setError(err.message); return false }
    await fetchLancamentos()
    return true
  }

  // ── MARCAR COMO PAGO ───────────────────────────────────────
  async function marcarComoPago(id: string, dataPagamento?: string): Promise<boolean> {
    const hoje = new Date().toISOString().split('T')[0]
    return updateLancamento(id, {
      status:         'pago',
      data_pagamento: dataPagamento ?? hoje,
    })
  }

  // ── DELETE ─────────────────────────────────────────────────
  async function deleteLancamento(id: string): Promise<boolean> {
    setError(null)

    const { error: err } = await supabase
      .from('finances')
      .delete()
      .eq('id', id)

    if (err) { setError(err.message); return false }
    await fetchLancamentos()
    return true
  }

  // ── ALTERAR FILTROS ────────────────────────────────────────
  function atualizarFiltros(novosFiltros: Partial<FiltrosFinanceiro>) {
    setFiltros(prev => ({ ...prev, ...novosFiltros }))
  }

  return {
    lancamentos,
    totais,
    loading,
    error,
    filtros,
    atualizarFiltros,
    refetch: fetchLancamentos,
    createLancamento,
    updateLancamento,
    marcarComoPago,
    deleteLancamento,
  }
}
