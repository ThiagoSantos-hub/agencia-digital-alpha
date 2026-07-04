// app/api/ai/route.ts — v1.2.0
// Correção: trocado createClient (browser) por createServerClient (server)
// O browser client não lê cookies em API Routes — causava erro 401

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'  // ← CORRIGIDO
import { alphaAI }            from '@/lib/ai/AIService'
import { memoryService }      from '@/lib/ai/MemoryService'
import { voiceService }       from '@/lib/ai/VoiceService'
import { crmTools }           from '@/lib/ai/CRMToolsService'
import type { Message }       from '@/lib/ai/types'

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação — server client lê cookies corretamente
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Parse do body
    const body = await req.json()
    const mensagem:   string  = body.mensagem   ?? ''
    const incluirVoz: boolean = body.incluirVoz ?? false

    if (!mensagem.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    }

    // 3. Recuperar histórico
    const historico: Message[] = await memoryService.recuperar(user.id)

    // 4. Montar mensagem do usuário
    const novaMensagem: Message = { role: 'user', content: mensagem }
    const mensagensParaIA: Message[] = [...historico, novaMensagem]

    // 5. Tools do CRM
    const tools = crmTools.getTools()

    // 6. Chamar AIService
    const resposta = await alphaAI.chat(mensagensParaIA, tools)
    const respostaTexto = resposta.text

    // 7. Salvar histórico (máx 50 mensagens)
    const mensagemAssistente: Message = { role: 'assistant', content: respostaTexto }
    await memoryService.salvar(user.id, [
      ...mensagensParaIA,
      mensagemAssistente,
    ].slice(-50))

    // 8. Gerar áudio opcional
    let audioBase64: string | null = null
    if (incluirVoz) {
      try {
        audioBase64 = await voiceService.sintetizarBase64(respostaTexto)
      } catch {
        audioBase64 = null
      }
    }

    return NextResponse.json({ resposta: respostaTexto, audio: audioBase64 })

  } catch (err: any) {
    console.error('[api/ai] Erro interno:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
