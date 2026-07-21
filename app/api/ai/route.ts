// app/api/ai/route.ts — v1.8.4 (latência de “pensar” menor)
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

// Cache em memória do snapshot CRM (evita 8 queries a cada pergunta)
let crmCache: { at: number; text: string } | null = null
const CRM_CACHE_MS = 45_000

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function looksLikeCrmQuestion(msg: string): boolean {
  return /\b(cliente|clientes|campanha|campanhas|tarefa|tarefas|financeiro|receita|gasto|alerta|alertas|integra|meta ads|mensalidade|colaborador|crm|dashboard|relat[oó]rio|agenda|reuni[aã]o|reuni[oõ]es|e-?mail|compromisso)\b/i.test(
    msg
  )
}

async function buildCrmSnapshot(supabase: ReturnType<typeof createServerClient>): Promise<string> {
  const now = Date.now()
  if (crmCache && now - crmCache.at < CRM_CACHE_MS) {
    return crmCache.text
  }

  try {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10)

    const [clientesAtivos, campanhasAtivas, tarefasPend, alertas, financas] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
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

    const text = [
      `Clientes ativos: ${clientesAtivos.count ?? 0}.`,
      `Campanhas ativas: ${campanhasAtivas.count ?? 0}.`,
      `Tarefas pendentes: ${tarefasPend.count ?? 0}.`,
      `Alertas: ${alertas.count ?? 0}.`,
      `Mês: receita R$ ${receita.toFixed(0)}, saídas R$ ${gasto.toFixed(0)}.`,
    ].join(' ')

    crmCache = { at: now, text }
    return text
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

    const { data: aiKeys } = await supabase
      .from('personal_ai_keys')
      .select('openai_api_key, elevenlabs_api_key, elevenlabs_voice_id, preferred_name, work_context')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!aiKeys?.openai_api_key) {
      return NextResponse.json(
        { error: 'Conecte sua chave da OpenAI em Integrações antes de usar a IA.' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    const body = await req.json()
    const mensagem: string = body.mensagem ?? ''
    const incluirVoz: boolean = body.incluirVoz ?? false
    const notes: BrainNote[] | undefined = Array.isArray(body.notes) ? body.notes : undefined

    const voiceSpeed = clamp(Number(body.voiceSpeed) || 1.3, 0.8, 1.5)
    const maxTokens = Math.round(clamp(Number(body.maxTokens) || 120, 60, 400))
    const temperature = clamp(Number(body.temperature) || 0.3, 0.1, 0.9)

    if (!mensagem.trim()) {
      return NextResponse.json(
        { error: 'Mensagem vazia' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const isCrm = looksLikeCrmQuestion(mensagem)

    // Histórico curto (voz: 2 msgs | texto: 4)
    const histLimit = incluirVoz ? 2 : 4

    const [historicoRaw, crmSnapshot] = await Promise.all([
      memoryService.recuperar(user.id),
      isCrm ? buildCrmSnapshot(supabase) : Promise.resolve(''),
    ])

    const historico = historicoRaw
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && !m.rawToolCalls))
      .slice(-histLimit)

    const mensagensParaIA: Message[] = [
      ...historico,
      { role: 'user', content: mensagem },
    ]

    const precisaFerramenta =
      isCrm &&
      /\b(lista|nome|quais|quem|cadastr|ativ|inativ|métric|metric|lançamento|agenda|reuni[aã]o|reuni[oõ]es|e-?mail|compromisso|hoje|amanh[aã])\b/i.test(mensagem)
    const tools = precisaFerramenta ? crmTools.getTools(supabase, user.id) : undefined

    // Notas compactas: só título+body curto (menos tokens no prompt = LLM mais rápido)
    const notesCompact = notes?.map((n) => ({
      ...n,
      body: n.body.length > 120 ? n.body.slice(0, 117) + '…' : n.body,
    }))

    const resposta = await alphaAI.chat(aiKeys.openai_api_key, mensagensParaIA, tools, {
      notes: notesCompact,
      crmSnapshot: crmSnapshot || undefined,
      maxTokens,
      temperature,
      compact: true,
      preferredName: aiKeys.preferred_name ?? undefined,
      workContext: aiKeys.work_context ?? undefined,
    })
    const respostaTexto = resposta.text || 'Sem dados no momento.'

    // Salva em background
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
        const voiceKeys = {
          openAiKey: aiKeys.openai_api_key,
          elevenLabsKey: aiKeys.elevenlabs_api_key ?? undefined,
          elevenLabsVoiceId: aiKeys.elevenlabs_voice_id ?? undefined,
        }
        const voiceProvider = voiceKeys.elevenLabsKey && voiceKeys.elevenLabsVoiceId ? 'elevenlabs' : 'openai'
        audioBase64 = await voiceService.sintetizarBase64(textoFala || respostaTexto, voiceKeys, voiceProvider, {
          speed: voiceSpeed,
        })
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
