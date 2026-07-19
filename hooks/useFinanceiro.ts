// hooks/useFinanceiro.ts — v2.0.0
// Projeto: Agência Digital Alpha
// Módulo Financeiro — CRUD + recorrência por dia do mês + filtros + totais
// Supabase client: sempre import { createClient } from '@/lib/supabase'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './useAuth'

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
  dia_vencimento:   number          // 1–31 — dia fixo do mês em que o cliente paga
  data_vencimento:  string          // ISO date YYYY-MM-DD — calculado automaticamente
  data_pagamento:   string | null   // preenchido só pelo sistema ao marcar como pago
  status:           StatusLancamento
  client_id:        string | null
  recorrente:       boolean
  recorrencia:      Recorrencia | null
  created_at:       string
  updated_at:       string
  // join opcional
  client_name?:     string
}

/**
 * LancamentoInput — o que o formulário envia.
 *
 * Não inclui data_vencimento nem data_pagamento:
 *  - data_vencimento é calculada pelo hook a partir de dia_vencimento
 *  - data_pagamento é preenchida pelo sistema em marcarComoPago()
 */
export interface LancamentoInput {
  escopo:          EscopoFinanceiro
  tipo:            TipoLancamento
  categoria:       string
  descricao:       string
  valor:           number
  dia_vencimento:  number          // 1–31
  status?:         StatusLancamento
  client_id?:      string | null
  recorrente?:     boolean
  recorrencia?:    Recorrencia | null
}

export interface Totais {
  receita:      number
  gasto:        number
  investimento: number
  saldo:        number
  receita_paga: number
  receita_pendente: number
  gasto_pago: number
  gasto_pendente: number
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

/**
 * Dado um dia do mês (1–31) e uma referência de ano/mês,
 * retorna a data ISO YYYY-MM-DD correta — se o dia for maior
 * que o último dia do mês (ex: dia 31 em fevereiro), usa o
 * último dia do mês para não pular para o mês seguinte.
 */
function montarDataVencimento(dia: number, ano: number, mes: number): string {
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  const diaReal   = Math.min(dia, ultimoDia)
  const mm        = String(mes + 1).padStart(2, '0')
  const dd        = String(diaReal).padStart(2, '0')
  return `${ano}-${mm}-${dd}`
}

/**
 * A partir de um dia fixo de vencimento, calcula a data do
 * vencimento no mês corrente. Se esse dia já passou, usa o
 * mês seguinte — assim o cadastro sempre cria o próximo
 * vencimento relevante.
 */
function proximaDataVencimento(dia: number): string {
  const hoje    = new Date()
  const ano     = hoje.getFullYear()
  const mes     = hoje.getMonth()
  const diaHoje = hoje.getDate()

  if (dia >= diaHoje) {
    // O vencimento deste mês ainda não chegou (ou é hoje)
    return montarDataVencimento(dia, ano, mes)
  } else {
    // O vencimento deste mês já passou → próximo é mês seguinte
    const mesProx = mes + 1 > 11 ? 0 : mes + 1
    const anoProx = mes + 1 > 11 ? ano + 1 : ano
    return montarDataVencimento(dia, anoProx, mesProx)
  }
}

/**
 * Dado um data_vencimento ISO, retorna a data do mês seguinte
 * mantendo o mesmo dia_vencimento (usado na renovação automática).
 */
function vencimentoProximoMes(dataAtual: string, dia: number): string {
  const [anoStr, mesStr] = dataAtual.split('-')
  const ano = parseInt(anoStr, 10)
  const mes = parseInt(mesStr, 10) - 1   // 0-indexed

  const mesProx = mes + 1 > 11 ? 0    : mes + 1
  const anoProx = mes + 1 > 11 ? ano + 1 : ano
  return montarDataVencimento(dia, anoProx, mesProx)
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useFinanceiro(filtrosIniciais?: Partial<FiltrosFinanceiro>) {
  const supabase = createClient()
  const { profile } = useAuth()

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [totais,      setTotais]      = useState<Totais>({ 
    receita: 0, 
    gasto: 0, 
    investimento: 0, 
    saldo: 0,
    receita_paga: 0,
    receita_pendente: 0,
    gasto_pago: 0,
    gasto_pendente: 0
  })
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
      const t: Totais = { 
        receita: 0, 
        gasto: 0, 
        investimento: 0, 
        saldo: 0,
        receita_paga: 0,
        receita_pendente: 0,
        gasto_pago: 0,
        gasto_pendente: 0
      }
      lista.forEach(l => {
        if (l.tipo === 'receita') {
          t.receita += l.valor
          if (l.status === 'pago') t.receita_paga += l.valor
          else t.receita_pendente += l.valor
        }
        if (l.tipo === 'gasto') {
          t.gasto += l.valor
          if (l.status === 'pago') t.gasto_pago += l.valor
          else t.gasto_pendente += l.valor
        }
        if (l.tipo === 'investimento') {
          t.investimento += l.valor
          if (l.status === 'pago') t.gasto_pago += l.valor
          else t.gasto_pendente += l.valor
        }
      })
      t.saldo = t.receita - t.gasto - t.investimento
      setTotais(t)

    } catch (e: any) {
      setError(e.message ?? 'Erro ao buscar lançamentos')
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => {
    fetchLancamentos()

    if (!profile?.company_id) return

    // Filtra por empresa — sem isso, qualquer mudança em finances de QUALQUER
    // empresa disparava refetch em todos os navegadores conectados. Canal com
    // nome único por instância (evita erro de subscribe duplicado quando mais
    // de um componente usa este hook ao mesmo tempo).
    const channel = supabase
      .channel(`finances-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', table: 'finances', schema: 'public', filter: `company_id=eq.${profile.company_id}` }, () => {
        fetchLancamentos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLancamentos, supabase, profile?.company_id])

  // ── CREATE ─────────────────────────────────────────────────
  /**
   * Recebe LancamentoInput (com dia_vencimento, sem data_vencimento).
   * Calcula automaticamente a data_vencimento correta para o mês.
   */
  async function createLancamento(input: LancamentoInput): Promise<boolean> {
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Usuário não autenticado'); return false }

    const dataVencimento = proximaDataVencimento(input.dia_vencimento)

    const { error: err } = await supabase.from('finances').insert({
      user_id:         user.id,
      escopo:          input.escopo,
      tipo:            input.tipo,
      categoria:       input.categoria,
      descricao:       input.descricao,
      valor:           input.valor,
      dia_vencimento:  input.dia_vencimento,
      data_vencimento: dataVencimento,
      data_pagamento:  null,
      status:          input.status ?? 'pendente',
      client_id:       input.client_id ?? null,
      recorrente:      input.recorrente ?? true,    // padrão true — clientes recorrentes
      recorrencia:     input.recorrencia ?? 'mensal',
    })

    if (err) { setError(err.message); return false }
    await fetchLancamentos()
    return true
  }

  // ── UPDATE ─────────────────────────────────────────────────
  /**
   * Atualiza campos de um lançamento existente.
   * Se dia_vencimento for alterado, recalcula data_vencimento.
   */
  async function updateLancamento(
    id: string,
    input: Partial<LancamentoInput> & { data_vencimento?: string; data_pagamento?: string | null; status?: StatusLancamento }
  ): Promise<boolean> {
    setError(null)

    const payload: Record<string, any> = { ...input }

    // Se o dia mudou, recalcular a data_vencimento deste lançamento
    if (input.dia_vencimento !== undefined && input.data_vencimento === undefined) {
      payload.data_vencimento = proximaDataVencimento(input.dia_vencimento)
    }

    const { error: err } = await supabase
      .from('finances')
      .update(payload)
      .eq('id', id)

    if (err) { setError(err.message); return false }
    await fetchLancamentos()
    return true
  }

  // ── MARCAR COMO PAGO ───────────────────────────────────────
  /**
   * 1. Marca o lançamento atual como pago (preenche data_pagamento).
   * 2. Se for recorrente, cria automaticamente o lançamento do
   *    próximo mês com status 'pendente' — sem nenhuma ação manual.
   */
  async function marcarComoPago(id: string): Promise<boolean> {
    setError(null)
    const hoje = new Date().toISOString().split('T')[0]

    // Buscar o lançamento atual para copiar os dados no próximo mês
    const { data: rows, error: fetchErr } = await supabase
      .from('finances')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !rows) {
      setError(fetchErr?.message ?? 'Lançamento não encontrado')
      return false
    }

    const lancamento = rows as Lancamento

    // 1. Marcar como pago
    const { error: updateErr } = await supabase
      .from('finances')
      .update({ status: 'pago', data_pagamento: hoje })
      .eq('id', id)

    if (updateErr) { setError(updateErr.message); return false }

    // 2. Se for recorrente mensal, criar o do próximo mês automaticamente
    if (lancamento.recorrente && lancamento.recorrencia === 'mensal') {
      const proximaData = vencimentoProximoMes(
        lancamento.data_vencimento,
        lancamento.dia_vencimento
      )

      // Verificar se já existe lançamento para esse cliente nessa data
      // (evita duplicatas caso marcarComoPago seja chamado duas vezes)
      const { data: existente } = await supabase
        .from('finances')
        .select('id')
        .eq('user_id',         lancamento.user_id)
        .eq('client_id',       lancamento.client_id)
        .eq('data_vencimento', proximaData)
        .eq('escopo',          lancamento.escopo)
        .maybeSingle()

      if (!existente) {
        const { error: insertErr } = await supabase.from('finances').insert({
          user_id:         lancamento.user_id,
          escopo:          lancamento.escopo,
          tipo:            lancamento.tipo,
          categoria:       lancamento.categoria,
          descricao:       lancamento.descricao,
          valor:           lancamento.valor,
          dia_vencimento:  lancamento.dia_vencimento,
          data_vencimento: proximaData,
          data_pagamento:  null,
          status:          'pendente',
          client_id:       lancamento.client_id,
          recorrente:      true,
          recorrencia:     'mensal',
        })

        if (insertErr) {
          // Não desfaz o pagamento — só loga o erro da renovação
          console.error('[useFinanceiro] Erro ao criar renovação mensal:', insertErr.message)
        }
      }
    }

    await fetchLancamentos()
    return true
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
