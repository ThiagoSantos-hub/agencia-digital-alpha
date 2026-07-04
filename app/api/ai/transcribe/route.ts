// app/api/ai/transcribe/route.ts
// Rota de transcrição de áudio — recebe o blob gravado e retorna o texto
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { voiceService }       from '@/lib/ai/VoiceService'

export async function POST(req: NextRequest) {
  try {
    // Autenticação
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Recebe o FormData com o blob de áudio
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const mimeType  = formData.get('mimeType') as string ?? 'audio/webm'

    if (!audioFile) {
      return NextResponse.json({ error: 'Áudio não enviado' }, { status: 400 })
    }

    // Converte File → Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    // Transcreve via VoiceService (ElevenLabs / Whisper)
    const texto = await voiceService.transcrever(buffer, mimeType)

    if (!texto?.trim()) {
      return NextResponse.json({ error: 'Não foi possível transcrever o áudio' }, { status: 422 })
    }

    return NextResponse.json({ texto })

  } catch (err: any) {
    console.error('[api/ai/transcribe] Erro:', err)
    return NextResponse.json({ error: 'Erro interno na transcrição' }, { status: 500 })
  }
}
