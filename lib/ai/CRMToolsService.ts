// lib/ai/CRMToolsService.ts — v1.1.0
// Correção: recebe supabase autenticado via parâmetro em vez de criar createClient() interno
// createClient() (browser) não funciona em API routes — sem sessão, RLS bloqueia tudo

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
    let q = supabase.from('campaigns').select('id, name, status, channel, budget, start_date, end_date, client:clients(name)')
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

  // Agora recebe supabase autenticado como parâmetro
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
        description: 'Retorna status das integrações configuradas (Google, Meta, Brevo, OpenAI, etc.).',
        parameters:  {},
        required:    [],
        execute:     () => this.getIntegracoes(supabase),
      },
    ]
  }
}

export const crmTools = new CRMToolsService()
