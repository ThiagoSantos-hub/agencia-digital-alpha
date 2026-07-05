// app/api/ai/transcribe/route.ts — v1.1.0
// v1.1.0: adicionado suporte a CORS para chamadas da extensão Chrome Alpha AI
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { voiceService }       from '@/lib/ai/VoiceService'

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
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401, headers: CORS_HEADERS }
      )
    }
    const formData  = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const mimeType  = formData.get('mimeType') as string ?? 'audio/webm'
    console.log('[transcribe] audioFile:', audioFile?.name, 'size:', audioFile?.size, 'mimeType:', mimeType)
    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Áudio não enviado ou vazio' },
        { status: 400, headers: CORS_HEADERS }
      )
    }
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    console.log('[transcribe] buffer size:', buffer.length)
    const texto = await voiceService.transcrever(buffer, mimeType)
    console.log('[transcribe] texto:', texto)
    if (!texto?.trim()) {
      return NextResponse.json(
        { error: 'Transcrição retornou vazia' },
        { status: 422, headers: CORS_HEADERS }
      )
    }
    return NextResponse.json({ texto }, { headers: CORS_HEADERS })
  } catch (err: any) {
    console.error('[transcribe] ERRO DETALHADO:', err)
    const status = err?.message?.includes('não configurada') ? 503 : 500
    return NextResponse.json(
      { error: err?.message ?? 'Erro interno na transcrição' },
      { status, headers: CORS_HEADERS }
    )
  }
}
