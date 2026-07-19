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

// A Alpha (assistente de voz do ElevenLabs) é uma ferramenta interna do dono
// da plataforma, não uma feature multi-tenant — trava toda consulta na empresa
// dona da plataforma (is_platform_owner = true), nunca em outras empresas,
// mesmo que o segredo compartilhado (ALPHA_API_SECRET) algum dia vaze.
let platformCompanyIdCache: string | null = null
async function getPlatformCompanyId(): Promise<string | null> {
  if (platformCompanyIdCache) return platformCompanyIdCache
  const { data } = await supabase.from('companies').select('id').eq('is_platform_owner', true).maybeSingle()
  platformCompanyIdCache = data?.id ?? null
  return platformCompanyIdCache
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

async function getClientes() {
  const companyId = await getPlatformCompanyId()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, company, status, monthly_fee, payment_day, phone, email, inactive_at')
    .eq('company_id', companyId)
    .order('name')

  if (error) return { erro: error.message }

  const ativos     = data.filter(c => c.status === 'ativo')
  const atrasados  = data.filter(c => c.status === 'atrasado')
  const inativos   = data.filter(c => c.status === 'inativo')
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
      telefone: c.phone,
    })),
    lista_atrasados: atrasados.map(c => ({
      nome: c.name,
      empresa: c.company,
      mensalidade: c.monthly_fee ? fmtBRL(c.monthly_fee) : null,
      dia_pagamento: c.payment_day,
      telefone: c.phone,
    })),
    lista_inativos: inativos.map(c => ({
      nome: c.name,
      empresa: c.company,
      inativo_desde: c.inactive_at,
    })),
  }
}

async function getFinanceiro() {
  const companyId = await getPlatformCompanyId()

  const { data: mesAtual } = await supabase
    .from('finances')
    .select('tipo, valor, status, categoria, descricao, data_vencimento')
    .eq('company_id', companyId)
    .eq('escopo', 'agencia')
    .gte('data_vencimento', inicioMes(0))
    .lte('data_vencimento', fimMes(0))

  const { data: mesPassado } = await supabase
    .from('finances')
    .select('tipo, valor, status')
    .eq('company_id', companyId)
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

  const { data: vencendo } = await supabase
    .from('finances')
    .select('descricao, valor, data_vencimento, status')
    .eq('company_id', companyId)
    .eq('escopo', 'agencia')
    .eq('status', 'pendente')
    .gte('data_vencimento', hoje())
    .lte('data_vencimento', diasAtras(-7))
    .order('data_vencimento')

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
  const { cliente } = params
  const companyId = await getPlatformCompanyId()

  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      id, name, status, channel,
      start_date, end_date, budget,
      clients(id, name, company),
      campaign_metrics(metric_key, metric_label, metric_value)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) return { erro: error.message }

  let filtradas = data as any[]
  if (cliente) {
    filtradas = data.filter((c: any) =>
      (c.clients?.name ?? '').toLowerCase().includes(cliente.toLowerCase()) ||
      (c.clients?.company ?? '').toLowerCase().includes(cliente.toLowerCase())
    )
  }

  const ativas      = filtradas.filter((c: any) => c.status === 'ativa')
  const pausadas    = filtradas.filter((c: any) => c.status === 'pausada')
  const finalizadas = filtradas.filter((c: any) => c.status === 'finalizada')

  return {
    total: filtradas.length,
    ativas: ativas.length,
    pausadas: pausadas.length,
    finalizadas: finalizadas.length,
    campanhas: filtradas.map((c: any) => {
      const metricas: Record<string, string> = {}
      ;(c.campaign_metrics ?? []).forEach((m: any) => {
        metricas[m.metric_label] = m.metric_value ?? '—'
      })
      return {
        nome: c.name,
        cliente: c.clients?.name ?? null,
        empresa: c.clients?.company ?? null,
        status: c.status,
        canal: c.channel,
        orcamento: c.budget ? fmtBRL(Number(c.budget)) : null,
        metricas,
      }
    }),
  }
}

async function getIntegracoes() {
  const companyId = await getPlatformCompanyId()
  const { data, error } = await supabase
    .from('integrations')
    .select('type, label, status, connected_at')
    .eq('company_id', companyId)
    .order('label')

  if (error) return { erro: error.message }

  const conectadas    = data.filter(i => i.status === 'connected')
  const desconectadas = data.filter(i => i.status === 'disconnected')

  return {
    total: data.length,
    conectadas: conectadas.length,
    desconectadas: desconectadas.length,
    lista_conectadas: conectadas.map(i => ({
      nome: i.label,
      tipo: i.type,
    })),
    lista_desconectadas: desconectadas.map(i => ({
      nome: i.label,
      tipo: i.type,
    })),
  }
}

async function getResumoGeral() {
  const [clientes, financeiro, campanhas, integracoes] = await Promise.all([
    getClientes(),
    getFinanceiro(),
    getCampanhas(),
    getIntegracoes(),
  ])

  return {
    clientes: {
      ativos: (clientes as any).ativos,
      atrasados: (clientes as any).atrasados,
      receita_mensal: (clientes as any).receita_mensal_prevista,
    },
    financeiro: {
      receita_mes: (financeiro as any).mes_atual?.receita_total,
      saldo_mes: (financeiro as any).mes_atual?.saldo,
      receita_pendente: (financeiro as any).mes_atual?.receita_pendente,
    },
    campanhas: {
      ativas: (campanhas as any).ativas,
      pausadas: (campanhas as any).pausadas,
    },
    integracoes: {
      conectadas: (integracoes as any).conectadas,
      lista: (integracoes as any).lista_conectadas,
    },
    data_consulta: new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }),
    hora_consulta: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
// IMPORTANTE: Sempre retorna status 200 — o SDK do ElevenLabs crasha com 4xx/5xx

export async function POST(req: NextRequest) {
  if (!verificarSecret(req)) {
    return NextResponse.json({ sucesso: false, mensagem: 'Nao autorizado' })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ sucesso: false, mensagem: 'Body invalido' })
  }

  const { acao, params } = body

  try {
    let resultado: any

    switch (acao) {
      case 'get_clientes':
        resultado = await getClientes()
        break
      case 'get_financeiro':
        resultado = await getFinanceiro()
        break
      case 'get_campanhas':
        resultado = await getCampanhas(params ?? {})
        break
      case 'get_integracoes':
        resultado = await getIntegracoes()
        break
      case 'get_resumo_geral':
        resultado = await getResumoGeral()
        break
      default:
        return NextResponse.json({ sucesso: false, mensagem: `Acao desconhecida: ${acao}` })
    }

    return NextResponse.json({ sucesso: true, data: resultado })
  } catch (err: any) {
    return NextResponse.json({ sucesso: false, mensagem: err.message ?? 'Erro interno' })
  }
}

export async function GET(req: NextRequest) {
  if (!verificarSecret(req)) {
    return NextResponse.json({ sucesso: false, mensagem: 'Nao autorizado' })
  }
  return NextResponse.json({ status: 'Alpha API online', timestamp: new Date().toISOString() })
}
