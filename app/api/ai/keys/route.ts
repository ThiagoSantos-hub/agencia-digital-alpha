import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data } = await supabase
    .from('personal_ai_keys')
    .select('openai_api_key, elevenlabs_api_key, elevenlabs_voice_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    openaiConnected: !!data?.openai_api_key,
    elevenlabsConnected: !!(data?.elevenlabs_api_key && data?.elevenlabs_voice_id),
  })
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { openaiApiKey, elevenlabsApiKey, elevenlabsVoiceId } = await request.json()

  const update: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
  if (openaiApiKey !== undefined) update.openai_api_key = openaiApiKey || null
  if (elevenlabsApiKey !== undefined) update.elevenlabs_api_key = elevenlabsApiKey || null
  if (elevenlabsVoiceId !== undefined) update.elevenlabs_voice_id = elevenlabsVoiceId || null

  const { error } = await supabase
    .from('personal_ai_keys')
    .upsert(update, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const type = new URL(request.url).searchParams.get('type')
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (type === 'openai') update.openai_api_key = null
  else if (type === 'elevenlabs') {
    update.elevenlabs_api_key = null
    update.elevenlabs_voice_id = null
  } else {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  const { error } = await supabase
    .from('personal_ai_keys')
    .update(update)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
