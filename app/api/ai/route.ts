// app/api/ai/route.ts — v1.8.0 (Second Brain notes no prompt)
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

    const resposta = await alphaAI.chat(mensagensParaIA, tools, { notes })
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
        // Remove tags [[SAVE:...]] do áudio
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
