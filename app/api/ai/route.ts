// app/api/ai/route.ts — v1.7.0
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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // Log para depuração no servidor
    const authHeader = req.headers.get('Authorization')
    console.log('[API AI] Requisição recebida. Auth Header:', !!authHeader)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[API AI] Erro de autenticação:', authError?.message || 'Usuário não encontrado')
      return NextResponse.json(
        { error: 'Não autenticado', details: authError?.message },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    console.log('[API AI] Usuário validado:', user.email)

    const body = await req.json()
    const mensagem:   string  = body.mensagem   ?? ''
    const incluirVoz: boolean = body.incluirVoz ?? false

    if (!mensagem.trim()) {
      return NextResponse.json(
        { error: 'Mensagem vazia' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const historicoRaw: Message[] = await memoryService.recuperar(user.id)
    const historico = historicoRaw.filter(
      m => (m.role === 'user') ||
           (m.role === 'assistant' && !m.rawToolCalls)
    )

    const novaMensagem: Message = { role: 'user', content: mensagem }
    const mensagensParaIA: Message[] = [...historico, novaMensagem]
    const tools = crmTools.getTools(supabase)
    
    const resposta = await alphaAI.chat(mensagensParaIA, tools)
    const respostaTexto = resposta.text

    const mensagemAssistente: Message = { role: 'assistant', content: respostaTexto }
    const historicoParaSalvar = [
      ...mensagensParaIA.filter(
        m => (m.role === 'user') ||
             (m.role === 'assistant' && !m.rawToolCalls)
      ),
      mensagemAssistente,
    ].slice(-50)
    
    await memoryService.salvar(user.id, historicoParaSalvar)

    let audioBase64: string | null = null
    if (incluirVoz) {
      try {
        audioBase64 = await voiceService.sintetizarBase64(respostaTexto)
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
