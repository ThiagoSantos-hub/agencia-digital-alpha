// app/api/ai/route.ts — v1.8.2 (latência menor)
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { alphaAI } from '@/lib/ai/AIService'
import { memoryService } from '@/lib/ai/MemoryService'
import { voiceService } from '@/lib/ai/VoiceService'
import { crmTools } from '@/lib/ai/CRMToolsService'
import type { Message } from '@/lib/ai/types'
import type { BrainNote } from '@/lib/ai/alphaPersona'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/** Snapshot leve: só contagens (head), sem puxar linhas inteiras */
async function buildCrmSnapshot(supabase: ReturnType<typeof createServerClient>): Promise<string> {
  try {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10)

    const [
      clientesTotal,
      clientesAtivos,
      clientesAtrasados,
      campanhasTotal,
      campanhasAtivas,
      tarefasPend,
      alertas,
      financas,
    ] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'atrasado'),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'ativa'),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['a_fazer', 'pendente']),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('finances').select('tipo, valor').gte('data_vencimento', inicioMes),
    ])

    let receita = 0
    let gasto = 0
    for (const l of financas.data ?? []) {
      const v = Number((l as any).valor) || 0
      if ((l as any).tipo === 'receita') receita += v
      else if ((l as any).tipo === 'gasto' || (l as any).tipo === 'investimento') gasto += v
    }

    return [
      `Clientes: total ${clientesTotal.count ?? 0}, ativos ${clientesAtivos.count ?? 0}, atrasados ${clientesAtrasados.count ?? 0}.`,
      `Campanhas: total ${campanhasTotal.count ?? 0}, ativas ${campanhasAtivas.count ?? 0}.`,
      `Tarefas pendentes: ${tarefasPend.count ?? 0}.`,
      `Alertas ativos: ${alertas.count ?? 0}.`,
      `Financeiro do mês: receita R$ ${receita.toFixed(0)}, saídas R$ ${gasto.toFixed(0)}, saldo R$ ${(receita - gasto).toFixed(0)}.`,
    ].join(' ')
  } catch (e) {
    console.error('[API AI] snapshot CRM:', e)
    return 'Snapshot CRM indisponível.'
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado', details: authError?.message },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const body = await req.json()
    const mensagem: string = body.mensagem ?? ''
    const incluirVoz: boolean = body.incluirVoz ?? false
    const notes: BrainNote[] | undefined = Array.isArray(body.notes) ? body.notes : undefined

    if (!mensagem.trim()) {
      return NextResponse.json(
        { error: 'Mensagem vazia' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Paralelo: histórico + snapshot CRM
    const [historicoRaw, crmSnapshot] = await Promise.all([
      memoryService.recuperar(user.id),
      buildCrmSnapshot(supabase),
    ])

    // Só últimas 6 mensagens — menos tokens = resposta mais rápida
    const historico = historicoRaw
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && !m.rawToolCalls))
      .slice(-6)

    const mensagensParaIA: Message[] = [
      ...historico,
      { role: 'user', content: mensagem },
    ]

    // Ferramentas só se a pergunta parece precisar de detalhe (não só contagem)
    const precisaFerramenta = /\b(lista|nome|quais|quem|cadastr|ativ|inativ|métric|metric|campanha .*cliente|cliente .*campanha|tarefa|financeiro detalh|lançamento)\b/i.test(
      mensagem
    )
    const tools = precisaFerramenta ? crmTools.getTools(supabase) : undefined

    const resposta = await alphaAI.chat(mensagensParaIA, tools, {
      notes,
      crmSnapshot,
      maxTokens: 120,
      temperature: 0.3,
    })
    const respostaTexto = resposta.text || 'Sem dados no momento, diretor.'

    // Salva histórico em background — não bloqueia a resposta
    const historicoParaSalvar = [
      ...mensagensParaIA.filter(
        (m) => m.role === 'user' || (m.role === 'assistant' && !m.rawToolCalls)
      ),
      { role: 'assistant' as const, content: respostaTexto },
    ].slice(-50)
    void memoryService.salvar(user.id, historicoParaSalvar)

    let audioBase64: string | null = null
    if (incluirVoz) {
      try {
        const textoFala = respostaTexto.replace(/\[\[SAVE:[\s\S]*?\]\]/gi, '').trim()
        audioBase64 = await voiceService.sintetizarBase64(textoFala || respostaTexto)
      } catch (e) {
        console.error('[API AI] Erro na síntese de voz:', e)
        audioBase64 = null
      }
    }

    return NextResponse.json(
      { resposta: respostaTexto, audio: audioBase64 },
      { headers: CORS_HEADERS }
    )
  } catch (err: any) {
    console.error('[API AI] Erro interno:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
