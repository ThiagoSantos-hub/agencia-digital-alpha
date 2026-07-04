// app/api/ai/route.ts
// Endpoint POST do módulo Alpha AI
// Orquestra: AIService + MemoryService + CRMToolsService + VoiceService

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { alphaAI as aiService } from '@/lib/ai/AIService'
import { memoryService }    from '@/lib/ai/MemoryService'
import { voiceService }     from '@/lib/ai/VoiceService'
import { crmTools }         from '@/lib/ai/CRMToolsService'
import type { Message as AIMessage } from '@/lib/ai/types'

// Força a rota a ser dinâmica para evitar erro de pré-renderização estática (Next.js 14)
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação — pega o usuário logado via cookie de sessão usando o client de servidor
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Parse do body
    const body = await req.json()
    const mensagem: string   = body.mensagem   ?? ''
    const incluirVoz: boolean = body.incluirVoz ?? false

    if (!mensagem.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    }

    // 3. Recuperar histórico de mensagens do usuário (memória persistida no Supabase)
    const historico: AIMessage[] = await memoryService.recuperar(user.id)

    // 4. Montar mensagem do usuário e adicionar ao histórico
    const novaMensagem: AIMessage = { role: 'user', content: mensagem }
    const mensagensParaIA: AIMessage[] = [...historico, novaMensagem]

    // 5. Buscar tools do CRM para passar ao AIService
    const tools = crmTools.getTools()

    // 6. Chamar o AIService com o histórico + tools do CRM
    const aiResponse = await aiService.chat(mensagensParaIA, tools)
    const respostaTexto = aiResponse.text

    // 7. Montar mensagem de resposta
    const mensagemAssistente: AIMessage = { role: 'assistant', content: respostaTexto }

    // 8. Salvar histórico atualizado no Supabase (até 50 mensagens para não estourar contexto)
    const historicoAtualizado: AIMessage[] = [
      ...mensagensParaIA,
      mensagemAssistente,
    ].slice(-50)
    await memoryService.salvar(user.id, historicoAtualizado)

    // 9. Gerar áudio opcional via VoiceService (ElevenLabs TTS)
    let audioBase64: string | null = null
    if (incluirVoz) {
      try {
        const audioBuffer = await voiceService.sintetizar(respostaTexto)
        audioBase64 = Buffer.from(audioBuffer).toString('base64')
      } catch {
        // Voz falhou — retorna só texto sem derrubar a resposta
        audioBase64 = null
      }
    }

    // 10. Retornar resposta
    return NextResponse.json({
      resposta: respostaTexto,
      audio: audioBase64,
    })

  } catch (err: any) {
    console.error('[api/ai] Erro interno:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
