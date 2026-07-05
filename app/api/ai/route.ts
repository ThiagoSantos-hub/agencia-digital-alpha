// app/api/ai/route.ts — v1.6.0
// Correção: histórico filtrado para excluir mensagens tool e assistant com rawToolCalls
// Evita erro 400 da OpenAI: "messages with role 'tool' must be a response to a preceeding message with 'tool_calls'"
// v1.6.0: adicionado suporte a CORS para chamadas da extensão Chrome Alpha AI
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { alphaAI }            from '@/lib/ai/AIService'
import { memoryService }      from '@/lib/ai/MemoryService'
import { voiceService }       from '@/lib/ai/VoiceService'
import { crmTools }           from '@/lib/ai/CRMToolsService'
import type { Message }       from '@/lib/ai/types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Preflight handler para extensão Chrome
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401, headers: CORS_HEADERS }
      )
    }
    // 2. Parse do body
    const body = await req.json()
    const mensagem:   string  = body.mensagem   ?? ''
    const incluirVoz: boolean = body.incluirVoz ?? false
    if (!mensagem.trim()) {
      return NextResponse.json(
        { error: 'Mensagem vazia' },
        { status: 400, headers: CORS_HEADERS }
      )
    }
    // 3. Recuperar histórico
    // [FIX v1.5] Filtra mensagens tool e assistant com rawToolCalls —
    // esses pares só fazem sentido dentro de uma única chamada à API,
    // não devem ser persistidos no histórico entre conversas.
    const historicoRaw: Message[] = await memoryService.recuperar(user.id)
    const historico = historicoRaw.filter(
      m => (m.role === 'user') ||
           (m.role === 'assistant' && !m.rawToolCalls)
    )
    // 4. Montar mensagem do usuário
    const novaMensagem: Message = { role: 'user', content: mensagem }
    const mensagensParaIA: Message[] = [...historico, novaMensagem]
    // 5. Tools do CRM
    const tools = crmTools.getTools(supabase)
    // 6. Chamar AIService
    const resposta = await alphaAI.chat(mensagensParaIA, tools)
    const respostaTexto = resposta.text
    // 7. Salvar histórico — apenas user e assistant limpos (sem rawToolCalls)
    // [FIX v1.5] mensagensParaIA pode conter assistants intermediários com rawToolCalls
    // gerados dentro do loop de tool calling — filtramos antes de salvar.
    const mensagemAssistente: Message = { role: 'assistant', content: respostaTexto }
    const historicoParaSalvar = [
      ...mensagensParaIA.filter(
        m => (m.role === 'user') ||
             (m.role === 'assistant' && !m.rawToolCalls)
      ),
      mensagemAssistente,
    ].slice(-50)
    await memoryService.salvar(user.id, historicoParaSalvar)
    // 8. Gerar áudio opcional
    let audioBase64: string | null = null
    if (incluirVoz) {
      try {
        audioBase64 = await voiceService.sintetizarBase64(respostaTexto)
      } catch {
        audioBase64 = null
      }
    }
    return NextResponse.json(
      { resposta: respostaTexto, audio: audioBase64 },
      { headers: CORS_HEADERS }
    )
  } catch (err: any) {
    console.error('[api/ai] Erro interno:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
