// app/api/ai/route.ts — v1.8.1 (snapshot CRM + voz)
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

async function buildCrmSnapshot(supabase: ReturnType<typeof createServerClient>): Promise<string> {
  try {
    const [clientes, campanhas, tarefas, alertas, financeiro] = await Promise.all([
      supabase.from('clients').select('id, name, status, monthly_fee'),
      supabase.from('campaigns').select('id, name, status'),
      supabase.from('tasks').select('id, title, status').limit(20),
      supabase.from('alerts').select('id, ativo').eq('ativo', true),
      supabase
        .from('finances')
        .select('tipo, valor, status')
        .gte('data_vencimento', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    ])

    const c = clientes.data ?? []
    const camp = campanhas.data ?? []
    const t = tarefas.data ?? []
    const a = alertas.data ?? []
    const f = financeiro.data ?? []

    const ativos = c.filter((x: any) => x.status === 'ativo')
    const atrasados = c.filter((x: any) => x.status === 'atrasado')
    const campAtivas = camp.filter((x: any) => x.status === 'ativa')
    const tarefasPend = t.filter((x: any) => x.status === 'a_fazer' || x.status === 'pendente')

    let receita = 0
    let gasto = 0
    for (const l of f as any[]) {
      if (l.tipo === 'receita') receita += Number(l.valor) || 0
      if (l.tipo === 'gasto' || l.tipo === 'investimento') gasto += Number(l.valor) || 0
    }

    const topClientes = ativos
      .slice(0, 8)
      .map((x: any) => x.name)
      .filter(Boolean)
      .join(', ')

    return [
      `Clientes: total ${c.length}, ativos ${ativos.length}, atrasados ${atrasados.length}.`,
      topClientes ? `Alguns ativos: ${topClientes}.` : '',
      `Campanhas: total ${camp.length}, ativas ${campAtivas.length}.`,
      `Tarefas recentes: ${t.length} (pendentes/a fazer: ${tarefasPend.length}).`,
      `Alertas ativos: ${a.length}.`,
      `Financeiro do mês: receita R$ ${receita.toFixed(2)}, saídas R$ ${gasto.toFixed(2)}, saldo R$ ${(receita - gasto).toFixed(2)}.`,
    ]
      .filter(Boolean)
      .join(' ')
  } catch (e) {
    console.error('[API AI] snapshot CRM:', e)
    return 'Snapshot CRM indisponível no momento.'
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

    const historicoRaw: Message[] = await memoryService.recuperar(user.id)
    const historico = historicoRaw.filter(
      (m) => m.role === 'user' || (m.role === 'assistant' && !m.rawToolCalls)
    )

    const novaMensagem: Message = { role: 'user', content: mensagem }
    const mensagensParaIA: Message[] = [...historico, novaMensagem]
    const tools = crmTools.getTools(supabase)
    const crmSnapshot = await buildCrmSnapshot(supabase)

    const resposta = await alphaAI.chat(mensagensParaIA, tools, {
      notes,
      crmSnapshot,
    })
    const respostaTexto = resposta.text

    const mensagemAssistente: Message = { role: 'assistant', content: respostaTexto }
    const historicoParaSalvar = [
      ...mensagensParaIA.filter(
        (m) => m.role === 'user' || (m.role === 'assistant' && !m.rawToolCalls)
      ),
      mensagemAssistente,
    ].slice(-50)

    await memoryService.salvar(user.id, historicoParaSalvar)

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
