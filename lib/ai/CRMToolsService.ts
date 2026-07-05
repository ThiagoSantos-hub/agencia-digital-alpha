// lib/ai/CRMToolsService.ts — v1.3.0
// Adicionado: cadastrarCliente, cadastrarColaborador

import type { CRMTool } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

export class CRMToolsService {

  private async query<T>(
    supabase: SupabaseClient,
    table: string,
    select = '*',
    filters?: Record<string, any>
  ): Promise<T[]> {
    let q = supabase.from(table).select(select)
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        q = q.eq(key, val)
      }
    }
    const { data } = await q
    return (data ?? []) as T[]
  }

  async getClientes(supabase: SupabaseClient): Promise<string> {
    const data = await this.query(supabase, 'clients', 'id, name, company, status, monthly_fee, payment_day')
    return JSON.stringify(data)
  }

  async getTarefas(supabase: SupabaseClient, status?: string): Promise<string> {
    let q = supabase.from('tasks').select('id, title, status, priority, due_date, assignee:profiles(name), client:clients(name)')
    if (status) q = q.eq('status', status)
    const { data } = await q
    return JSON.stringify(data ?? [])
  }

  async getFinanceiro(supabase: SupabaseClient, escopo: 'agencia' | 'pessoal' = 'agencia'): Promise<string> {
    const hoje   = new Date()
    const inicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
    const fim    = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-31`
    const { data } = await supabase
      .from('finances')
      .select('tipo, categoria, descricao, valor, status, data_vencimento')
      .eq('escopo', escopo)
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)
    const lista = data ?? []
    const totais = { receita: 0, gasto: 0, investimento: 0, saldo: 0 }
    lista.forEach((l: any) => {
      if (l.tipo === 'receita')      totais.receita      += l.valor
      if (l.tipo === 'gasto')        totais.gasto        += l.valor
      if (l.tipo === 'investimento') totais.investimento += l.valor
    })
    totais.saldo = totais.receita - totais.gasto - totais.investimento
    return JSON.stringify({ totais, lancamentos: lista })
  }

  async getCampanhas(supabase: SupabaseClient, status?: string): Promise<string> {
    let q = supabase.from('campaigns').select('id, name, status, channel, budget, start_date, end_date, meta_campaign_id, client:clients(name)')
    if (status) q = q.eq('status', status)
    const { data } = await q
    return JSON.stringify(data ?? [])
  }

  async getIntegracoes(supabase: SupabaseClient): Promise<string> {
    const data = await this.query(supabase, 'integrations', 'type, label, status')
    return JSON.stringify(data)
  }

  async getResumoGeral(supabase: SupabaseClient): Promise<string> {
    const [clientes, tarefas, campanhas] = await Promise.all([
      this.query(supabase, 'clients', 'status'),
      this.query(supabase, 'tasks', 'status'),
      this.query(supabase, 'campaigns', 'status'),
    ])
    const resumo = {
      clientes: {
        total:     clientes.length,
        ativos:    clientes.filter((c: any) => c.status === 'ativo').length,
        atrasados: clientes.filter((c: any) => c.status === 'atrasado').length,
        inativos:  clientes.filter((c: any) => c.status === 'inativo').length,
      },
      tarefas: {
        total:        tarefas.length,
        pendentes:    tarefas.filter((t: any) => t.status === 'pendente').length,
        em_andamento: tarefas.filter((t: any) => t.status === 'em_andamento').length,
        concluidas:   tarefas.filter((t: any) => t.status === 'concluida').length,
      },
      campanhas: {
        total:       campanhas.length,
        ativas:      campanhas.filter((c: any) => c.status === 'ativa').length,
        pausadas:    campanhas.filter((c: any) => c.status === 'pausada').length,
        finalizadas: campanhas.filter((c: any) => c.status === 'finalizada').length,
      },
    }
    return JSON.stringify(resumo)
  }

  async getMetricasCampanha(
    supabase: SupabaseClient,
    nomeCliente?: string,
    nomeCampanha?: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<string> {
    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('type', 'meta_ads')
      .maybeSingle()

    if (!integration?.access_token) {
      return JSON.stringify({ erro: 'Meta Ads não conectado' })
    }

    let q = supabase
      .from('campaigns')
      .select('id, name, meta_campaign_id, budget, status, client:clients(name, meta_ad_account_id)')
      .not('meta_campaign_id', 'is', null)

    const { data: campanhas } = await q
    if (!campanhas || campanhas.length === 0) {
      return JSON.stringify({ erro: 'Nenhuma campanha com ID do Meta encontrada' })
    }

    let campanhasFiltradas = campanhas
    if (nomeCliente) {
      campanhasFiltradas = campanhasFiltradas.filter((c: any) =>
        c.client?.name?.toLowerCase().includes(nomeCliente.toLowerCase())
      )
    }
    if (nomeCampanha) {
      campanhasFiltradas = campanhasFiltradas.filter((c: any) =>
        c.name?.toLowerCase().includes(nomeCampanha.toLowerCase())
      )
    }

    if (campanhasFiltradas.length === 0) {
      return JSON.stringify({ erro: 'Nenhuma campanha encontrada com esse filtro' })
    }

    const hoje = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const trintaDiasAtras = new Date(hoje)
    trintaDiasAtras.setDate(hoje.getDate() - 30)

    const since = dataInicio || fmt(trintaDiasAtras)
    const until = dataFim   || fmt(hoje)

    const resultados: any[] = []
    const fields = 'impressions,reach,clicks,ctr,spend,cpm,cpc,actions'

    for (const camp of campanhasFiltradas.slice(0, 10)) {
      try {
        const metaUrl = new URL(`https://graph.facebook.com/v19.0/${camp.meta_campaign_id}/insights`)
        metaUrl.searchParams.set('fields', fields)
        metaUrl.searchParams.set('time_range', JSON.stringify({ since, until }))
        metaUrl.searchParams.set('access_token', integration.access_token)

        const res = await fetch(metaUrl.toString())
        const metaData = await res.json()
        const insight = metaData.data?.[0]

        if (insight) {
          const fmtBRL = (v: string) => v ? `R$ ${(parseFloat(v)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
          const resultado = insight.actions?.find((a: any) =>
            ['lead', 'purchase', 'onsite_conversion.messaging_conversation_started_7d', 'offsite_conversion.fb_pixel_lead'].includes(a.action_type)
          )
          resultados.push({
            campanha:   camp.name,
            cliente:    (camp.client as any)?.name ?? '—',
            periodo:    `${since} a ${until}`,
            impressoes: insight.impressions ? parseInt(insight.impressions).toLocaleString('pt-BR') : '—',
            alcance:    insight.reach ? parseInt(insight.reach).toLocaleString('pt-BR') : '—',
            cliques:    insight.clicks ? parseInt(insight.clicks).toLocaleString('pt-BR') : '—',
            ctr:        insight.ctr ? `${parseFloat(insight.ctr).toFixed(2)}%` : '—',
            gasto:      fmtBRL(insight.spend),
            cpm:        fmtBRL(insight.cpm),
            cpc:        fmtBRL(insight.cpc),
            resultados: resultado ? parseInt(resultado.value).toLocaleString('pt-BR') : '—',
          })
        } else {
          resultados.push({
            campanha: camp.name,
            cliente:  (camp.client as any)?.name ?? '—',
            periodo:  `${since} a ${until}`,
            info:     'Sem dados no período informado',
          })
        }
      } catch (err: any) {
        resultados.push({ campanha: camp.name, erro: err.message })
      }
    }

    return JSON.stringify(resultados)
  }

  // ── NOVO: Cadastrar Cliente ───────────────────────────────────────────────
  async cadastrarCliente(
    supabase: SupabaseClient,
    nome: string,
    empresa: string,
    telefone: string,
    mensalidade: number,
    diaPagamento: number,
    email?: string
  ): Promise<string> {
    const { data, error } = await supabase.from('clients').insert({
      name:        nome,
      company:     empresa,
      phone:       telefone,
      email:       email ?? null,
      monthly_fee: mensalidade,
      payment_day: diaPagamento,
      status:      'ativo',
    }).select().single()

    if (error) return JSON.stringify({ erro: error.message })
    return JSON.stringify({ sucesso: true, cliente: data })
  }

  // ── NOVO: Cadastrar Colaborador ───────────────────────────────────────────
  async cadastrarColaborador(
    supabase: SupabaseClient,
    nome: string,
    email: string,
    cargo: string,
    telefone?: string
  ): Promise<string> {
    // Cria o perfil na tabela profiles
    const { data, error } = await supabase.from('profiles').insert({
      name:  nome,
      email: email,
      role:  'member',
      phone: telefone ?? null,
      cargo: cargo,
    }).select().single()

    if (error) return JSON.stringify({ erro: error.message })
    return JSON.stringify({ sucesso: true, colaborador: data })
  }

  getTools(supabase: SupabaseClient): CRMTool[] {
    return [
      {
        name:        'getResumoGeral',
        description: 'Retorna um resumo geral da agência: total de clientes, tarefas e campanhas com seus status.',
        parameters:  {},
        required:    [],
        execute:     () => this.getResumoGeral(supabase),
      },
      {
        name:        'getClientes',
        description: 'Retorna lista de todos os clientes com status e mensalidade.',
        parameters:  {},
        required:    [],
        execute:     () => this.getClientes(supabase),
      },
      {
        name:        'getTarefas',
        description: 'Retorna lista de tarefas. Pode filtrar por status: pendente, em_andamento, concluida, cancelada.',
        parameters: {
          status: {
            type:        'string',
            description: 'Filtrar por status da tarefa',
            enum:        ['pendente', 'em_andamento', 'concluida', 'cancelada'],
          },
        },
        required: [],
        execute:  (args) => this.getTarefas(supabase, args.status),
      },
      {
        name:        'getFinanceiro',
        description: 'Retorna lançamentos e totais financeiros do mês atual. Escopo: agencia ou pessoal.',
        parameters: {
          escopo: {
            type:        'string',
            description: 'Escopo financeiro a consultar',
            enum:        ['agencia', 'pessoal'],
          },
        },
        required: [],
        execute:  (args) => this.getFinanceiro(supabase, args.escopo ?? 'agencia'),
      },
      {
        name:        'getCampanhas',
        description: 'Retorna campanhas de marketing. Pode filtrar por status: ativa, pausada, finalizada, rascunho.',
        parameters: {
          status: {
            type:        'string',
            description: 'Filtrar por status da campanha',
            enum:        ['ativa', 'pausada', 'finalizada', 'rascunho'],
          },
        },
        required: [],
        execute:  (args) => this.getCampanhas(supabase, args.status),
      },
      {
        name:        'getIntegracoes',
        description: 'Retorna status das integrações configuradas.',
        parameters:  {},
        required:    [],
        execute:     () => this.getIntegracoes(supabase),
      },
      {
        name:        'getMetricasCampanha',
        description: 'Busca métricas reais do Meta Ads: gasto, impressões, cliques, CTR, CPM, CPC.',
        parameters: {
          nomeCliente:  { type: 'string', description: 'Nome do cliente (parcial)' },
          nomeCampanha: { type: 'string', description: 'Nome da campanha (parcial)' },
          dataInicio:   { type: 'string', description: 'Data início YYYY-MM-DD' },
          dataFim:      { type: 'string', description: 'Data fim YYYY-MM-DD' },
        },
        required: [],
        execute:  (args) => this.getMetricasCampanha(supabase, args.nomeCliente, args.nomeCampanha, args.dataInicio, args.dataFim),
      },
      // ── NOVO ──────────────────────────────────────────────────────────────
      {
        name:        'cadastrarCliente',
        description: 'Cadastra um novo cliente na agência. Use quando o usuário pedir para registrar ou cadastrar um cliente novo.',
        parameters: {
          nome:         { type: 'string', description: 'Nome completo do cliente' },
          empresa:      { type: 'string', description: 'Nome da empresa do cliente' },
          telefone:     { type: 'string', description: 'Telefone com DDD, apenas números' },
          mensalidade:  { type: 'number', description: 'Valor da mensalidade em reais' },
          diaPagamento: { type: 'number', description: 'Dia do mês para vencimento (1-31)' },
          email:        { type: 'string', description: 'Email do cliente (opcional)' },
        },
        required: ['nome', 'empresa', 'telefone', 'mensalidade', 'diaPagamento'],
        execute:  (args) => this.cadastrarCliente(
          supabase,
          args.nome,
          args.empresa,
          args.telefone,
          args.mensalidade,
          args.diaPagamento,
          args.email
        ),
      },
      {
        name:        'cadastrarColaborador',
        description: 'Cadastra um novo colaborador ou funcionário da agência.',
        parameters: {
          nome:     { type: 'string', description: 'Nome completo do colaborador' },
          email:    { type: 'string', description: 'Email do colaborador' },
          cargo:    { type: 'string', description: 'Cargo ou função do colaborador' },
          telefone: { type: 'string', description: 'Telefone com DDD (opcional)' },
        },
        required: ['nome', 'email', 'cargo'],
        execute:  (args) => this.cadastrarColaborador(
          supabase,
          args.nome,
          args.email,
          args.cargo,
          args.telefone
        ),
      },
    ]
  }
}

export const crmTools = new CRMToolsService()
