// app/api/ai/route.ts
// Endpoint POST do módulo Alpha AI
// Orquestra: alphaAI (AIService) + MemoryService + CRMToolsService + VoiceService

import { NextRequest, NextResponse } from 'next/server'
import { createClient }    from '@/lib/supabase'
import { alphaAI }         from '@/lib/ai/AIService'
import { memoryService }   from '@/lib/ai/MemoryService'
import { voiceService }    from '@/lib/ai/VoiceService'
import { crmTools }        from '@/lib/ai/CRMToolsService'
import type { Message }    from '@/lib/ai/types'

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Parse do body
    const body = await req.json()
    const mensagem: string    = body.mensagem   ?? ''
    const incluirVoz: boolean = body.incluirVoz ?? false

    if (!mensagem.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    }

    // 3. Recuperar histórico do Supabase via MemoryService
    const historico: Message[] = await memoryService.recuperar(user.id)

    // 4. Montar mensagem do usuário
    const novaMensagem: Message = { role: 'user', content: mensagem }
    const mensagensParaIA: Message[] = [...historico, novaMensagem]

    // 5. Buscar tools do CRM
    const tools = crmTools.getTools()

    // 6. Chamar AIService — método chat() com tool calling automático
    const resposta = await alphaAI.chat(mensagensParaIA, tools)
    const respostaTexto = resposta.text

    // 7. Montar mensagem do assistente para salvar no histórico
    const mensagemAssistente: Message = { role: 'assistant', content: respostaTexto }

    // 8. Salvar histórico atualizado (máx 50 mensagens)
    const historicoAtualizado: Message[] = [
      ...mensagensParaIA,
      mensagemAssistente,
    ].slice(-50)
    await memoryService.salvar(user.id, historicoAtualizado)

    // 9. Gerar áudio opcional (ElevenLabs TTS)
    let audioBase64: string | null = null
    if (incluirVoz) {
      try {
        const audioBuffer = await voiceService.sintetizar(respostaTexto)
        audioBase64 = Buffer.from(audioBuffer).toString('base64')
      } catch {
        audioBase64 = null
      }
    }

    // 10. Retornar
    return NextResponse.json({
      resposta: respostaTexto,
      audio:    audioBase64,
    })

  } catch (err: any) {
    console.error('[api/ai] Erro interno:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
