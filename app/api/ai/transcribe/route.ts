// app/api/ai/transcribe/route.ts — v1.2.0
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { voiceService }       from '@/lib/ai/VoiceService'

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
    
    // Log para depuração
    const authHeader = req.headers.get('Authorization')
    console.log('[API Transcribe] Iniciando requisição. Auth Header presente:', !!authHeader)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[API Transcribe] Erro de autenticação:', authError?.message || 'Usuário não encontrado')
      return NextResponse.json(
        { error: 'Não autenticado', details: authError?.message },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    console.log('[API Transcribe] Usuário autenticado:', user.email)

    const { data: aiKeys } = await supabase
      .from('personal_ai_keys')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!aiKeys?.openai_api_key) {
      return NextResponse.json(
        { error: 'Conecte sua chave da OpenAI em Integrações antes de usar a IA.' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    const formData  = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const mimeType  = formData.get('mimeType') as string ?? 'audio/webm'

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Áudio não enviado ou vazio' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    
    const texto = await voiceService.transcrever(buffer, { openAiKey: aiKeys.openai_api_key }, mimeType)
    
    if (!texto?.trim()) {
      return NextResponse.json(
        { error: 'Transcrição retornou vazia' },
        { status: 422, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json({ texto }, { headers: CORS_HEADERS })
  } catch (err: any) {
    console.error('[API Transcribe] ERRO CRÍTICO:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Erro interno na transcrição' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
