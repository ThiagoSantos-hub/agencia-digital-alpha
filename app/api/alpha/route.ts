// app/api/alpha/route.ts
// API da Alpha — acesso aos dados reais do sistema
// Chamada pelas Tools do ElevenLabs
// Protegida por ALPHA_API_SECRET

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verificarSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-alpha-secret')
  return secret === process.env.ALPHA_API_SECRET
}

function hoje(): string {
  return new Date().toISOString().split('T')[0]
}

function diasAtras(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().split('T')[0]
}

function inicioMes(mesesAtras = 0): string {
  const d = new Date()
  d.setMonth(d.getMonth() - mesesAtras)
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function fimMes(mesesAtras = 0): string {
  const d = new Date()
  d.setMonth(d.getMonth() - mesesAtras + 1)
  d.setDate(0)
  return d.toISOString().split('T')[0]
}

function fmtBRL(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

// ─── Handlers por ação ────────────────────────────────────────────────────────

async function getClientes() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, company, status, monthly_fee, payment_day, phone, email, inactive_at')
    .order('name')

  if (error) return { erro: error.message }

  const ativos    = data.filter(c => c.status === 'ativo')
  const atrasados = data.filter(c => c.status === 'atrasado')
  const inativos  = data.filter(c => c.status === 'inativo')
  const prospectos = data.filter(c => c.status === 'prospecto')

  const receitaMensal = ativos.reduce((s, c) => s + (c.monthly_fee ?? 0), 0)

  return {
    total: data.length,
    ativos: ativos.length,
    atrasados: atrasados.length,
    inativos: inativos.length,
    prospectos: prospectos.length,
    receita_mensal_prevista: fmtBRL(receitaMensal),
    lista_ativos: ativos.map(c => ({
      nome: c.name,
      empresa: c.company,
      mensalidade: c.monthly_fee ? fmtBRL(c.monthly_fee) : null,
      dia_pagamento: c.payment_day,
    })),
    lista_atrasados: atrasados.map(c => ({
      nome: c.name,
      empresa: c.company,
      mensalidade: c.monthly_fee ? fmtBRL(c.monthly_fee) : null,
      dia_pagamento: c.payment_day,
    })),
    lista_inativos: inativos.map(c => ({
      nome: c.name,
      empresa: c.company,
      inativo_desde: c.inactive_at,
    })),
  }
}

async function getTarefas() {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id, title, status, priority, due_date,
      clients(name),
      profiles(name)
    `)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) return { erro: error.message }

  const pendentes    = data.filter(t => t.status === 'pendente')
  const em_andamento = data.filter(t => t.status === 'em_andamento')
  const concluidas   = data.filter(t => t.status === 'concluida')

  const atrasadas = pendentes.filter(t => t.due_date && t.due_date < hoje())

  return {
    total: data.length,
    pendentes: pendentes.length,
    em_andamento: em_andamento.length,
    concluidas: concluidas.length,
    atrasadas: atrasadas.length,
    lista_pendentes: pendentes.slice(0, 10).map(t => ({
      titulo: t.title,
      prioridade: t.priority,
      prazo: t.due_date,
      cliente: (t.clients as any)?.name ?? null,
      responsavel: (t.profiles as any)?.name ?? null,
      atrasada: t.due_date ? t.due_date < hoje() : false,
    })),
    lista_em_andamento: em_andamento.slice(0, 5).map(t => ({
      titulo: t.title,
      prioridade: t.priority,
      cliente: (t.clients as any)?.name ?? null,
      responsavel: (t.profiles as any)?.name ?? null,
    })),
  }
}

async function getFinanceiro() {
  // Mês atual
  const { data: mesAtual } = await supabase
    .from('finances')
    .select('tipo, valor, status, categoria, descricao, data_vencimento')
    .eq('escopo', 'agencia')
    .gte('data_vencimento', inicioMes(0))
    .lte('data_vencimento', fimMes(0))

  // Mês passado
  const { data: mesPassado } = await supabase
    .from('finances')
    .select('tipo, valor, status')
    .eq('escopo', 'agencia')
    .gte('data_vencimento', inicioMes(1))
    .lte('data_vencimento', fimMes(1))

  const calcular = (lista: any[]) => {
    const t = { receita: 0, gasto: 0, investimento: 0, receita_paga: 0, gasto_pago: 0 }
    lista?.forEach(l => {
      if (l.tipo === 'receita') {
        t.receita += Number(l.valor)
        if (l.status === 'pago') t.receita_paga += Number(l.valor)
      }
      if (l.tipo === 'gasto') {
        t.gasto += Number(l.valor)
        if (l.status === 'pago') t.gasto_pago += Number(l.valor)
      }
      if (l.tipo === 'investimento') t.investimento += Number(l.valor)
    })
    return t
  }

  const atual   = calcular(mesAtual ?? [])
  const passado = calcular(mesPassado ?? [])

  // Vencimentos próximos (próximos 7 dias)
  const { data: vencendo } = await supabase
    .from('finances')
    .select('descricao, valor, data_vencimento, status')
    .eq('escopo', 'agencia')
    .eq('status', 'pendente')
    .gte('data_vencimento', hoje())
    .lte('data_vencimento', diasAtras(-7))
    .order('data_vencimento')

  // Principais gastos do mês
  const gastosPorCategoria: Record<string, number> = {}
  mesAtual?.filter(l => l.tipo === 'gasto' || l.tipo === 'investimento').forEach(l => {
    gastosPorCategoria[l.categoria] = (gastosPorCategoria[l.categoria] ?? 0) + Number(l.valor)
  })

  return {
    mes_atual: {
      receita_total: fmtBRL(atual.receita),
      receita_recebida: fmtBRL(atual.receita_paga),
      receita_pendente: fmtBRL(atual.receita - atual.receita_paga),
      gastos_total: fmtBRL(atual.gasto + atual.investimento),
      gastos_pagos: fmtBRL(atual.gasto_pago),
      saldo: fmtBRL(atual.receita - atual.gasto - atual.investimento),
    },
    mes_passado: {
      receita_total: fmtBRL(passado.receita),
      gastos_total: fmtBRL(passado.gasto + passado.investimento),
      saldo: fmtBRL(passado.receita - passado.gasto - passado.investimento),
    },
    comparacao: {
      receita_diferenca: fmtBRL(atual.receita - passado.receita),
      receita_cresceu: atual.receita >= passado.receita,
      gastos_diferenca: fmtBRL((atual.gasto + atual.investimento) - (passado.gasto + passado.investimento)),
    },
    vencendo_em_7_dias: (vencendo ?? []).map(v => ({
      descricao: v.descricao,
      valor: fmtBRL(Number(v.valor)),
      vence_em: v.data_vencimento,
    })),
    maiores_gastos_mes: Object.entries(gastosPorCategoria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, val]) => ({ categoria: cat, valor: fmtBRL(val) })),
  }
}

async function getCampanhas(params: { periodo?: string; cliente?: string } = {}) {
  const { periodo = '7dias', cliente } = params

  const diasMap: Record<string, number> = {
    hoje: 0,
    ontem: 1,
    '7dias': 7,
    '30dias': 30,
  }
  const dias = diasMap[periodo] ?? 7
  const dataInicio = diasAtras(dias === 0 ? 0 : dias)
  const dataFim = periodo === 'ontem' ? diasAtras(1) : hoje()

  // Buscar campanhas
  let query = supabase
    .from('campaigns')
    .select(`
      id, name, status, channel,
      start_date, end_date, budget,
      clients(name, company),
      campaign_metrics(metric_key, metric_label, metric_value, updated_at)
    `)
    .order('created_at', { ascending: false })

  if (cliente) {
    query = query.ilike('clients.name', `%${cliente}%`)
  }

  const { data, error } = await query
  if (error) return { erro: error.message }

  const ativas    = data.filter(c => c.status === 'ativa')
  const pausadas  = data.filter(c => c.status === 'pausada')

  return {
    total: data.length,
    ativas: ativas.length,
    pausadas: pausadas.length,
    periodo_consultado: periodo,
    campanhas: data.slice(0, 10).map(c => {
      const metricas: Record<string, string> = {}
      ;(c.campaign_metrics as any[])?.forEach((m: any) => {
        metricas[m.metric_label] = m.metric_value ?? '—'
      })
      return {
        nome: c.name,
        cliente: (c.clients as any)?.name ?? null,
        empresa: (c.clients as any)?.company ?? null,
        status: c.status,
        canal: c.channel,
        orcamento: c.budget ? fmtBRL(Number(c.budget)) : null,
        metricas,
      }
    }),
  }
}

async function getResumoGeral() {
  const [clientes, tarefas, financeiro, campanhas] = await Promise.all([
    getClientes(),
    getTarefas(),
    getFinanceiro(),
    getCampanhas(),
  ])

  return {
    clientes: {
      ativos: (clientes as any).ativos,
      atrasados: (clientes as any).atrasados,
      receita_mensal: (clientes as any).receita_mensal_prevista,
    },
    tarefas: {
      pendentes: (tarefas as any).pendentes,
      atrasadas: (tarefas as any).atrasadas,
      em_andamento: (tarefas as any).em_andamento,
    },
    financeiro: {
      receita_mes: (financeiro as any).mes_atual.receita_total,
      saldo_mes: (financeiro as any).mes_atual.saldo,
      receita_pendente: (financeiro as any).mes_atual.receita_pendente,
    },
    campanhas: {
      ativas: (campanhas as any).ativas,
      pausadas: (campanhas as any).pausadas,
    },
    data_consulta: new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }),
    hora_consulta: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!verificarSecret(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { acao, params } = body

  try {
    let resultado: any

    switch (acao) {
      case 'get_clientes':
        resultado = await getClientes()
        break
      case 'get_tarefas':
        resultado = await getTarefas()
        break
      case 'get_financeiro':
        resultado = await getFinanceiro()
        break
      case 'get_campanhas':
        resultado = await getCampanhas(params ?? {})
        break
      case 'get_resumo_geral':
        resultado = await getResumoGeral()
        break
      default:
        return NextResponse.json({ erro: `Ação desconhecida: ${acao}` }, { status: 400 })
    }

    return NextResponse.json({ sucesso: true, data: resultado })
  } catch (err: any) {
    return NextResponse.json({ erro: err.message ?? 'Erro interno' }, { status: 500 })
  }
}

// GET para teste rápido (verificar se a API está online)
export async function GET(req: NextRequest) {
  if (!verificarSecret(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }
  return NextResponse.json({ status: 'Alpha API online ✅', timestamp: new Date().toISOString() })
}
