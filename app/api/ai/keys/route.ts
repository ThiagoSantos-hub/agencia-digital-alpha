import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let { data } = await supabase
    .from('personal_ai_keys')
    .select('openai_api_key, elevenlabs_api_key, elevenlabs_voice_id, elevenlabs_agent_id, alpha_webhook_secret, preferred_name, work_context, voice_provider')
    .eq('user_id', user.id)
    .maybeSingle()

  // Todo mundo precisa de um secret próprio pra colar no webhook do agente,
  // mesmo antes de configurar o resto — gera na primeira vez que a tela é aberta.
  if (!data?.alpha_webhook_secret) {
    const newSecret = crypto.randomBytes(24).toString('base64url')
    const { data: upserted } = await supabase
      .from('personal_ai_keys')
      .upsert({ user_id: user.id, alpha_webhook_secret: newSecret }, { onConflict: 'user_id' })
      .select('openai_api_key, elevenlabs_api_key, elevenlabs_voice_id, elevenlabs_agent_id, alpha_webhook_secret, preferred_name, work_context, voice_provider')
      .single()
    data = upserted
  }

  return NextResponse.json({
    openaiConnected: !!data?.openai_api_key,
    elevenlabsConnected: !!(data?.elevenlabs_api_key && data?.elevenlabs_voice_id),
    agentConnected: !!data?.elevenlabs_agent_id,
    elevenlabsAgentId: data?.elevenlabs_agent_id ?? null,
    webhookSecret: data?.alpha_webhook_secret ?? null,
    preferredName: data?.preferred_name ?? '',
    workContext: data?.work_context ?? '',
    voiceProvider: data?.voice_provider ?? 'elevenlabs',
  })
}

export async function PUT(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { openaiApiKey, elevenlabsApiKey, elevenlabsVoiceId, elevenlabsAgentId, preferredName, workContext, voiceProvider } = await request.json()

  if (voiceProvider !== undefined && !['alpha', 'elevenlabs'].includes(voiceProvider)) {
    return NextResponse.json({ error: 'Provedor de voz inválido.' }, { status: 400 })
  }

  const update: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
  if (openaiApiKey !== undefined) update.openai_api_key = openaiApiKey || null
  if (elevenlabsApiKey !== undefined) update.elevenlabs_api_key = elevenlabsApiKey || null
  if (elevenlabsVoiceId !== undefined) update.elevenlabs_voice_id = elevenlabsVoiceId || null
  if (elevenlabsAgentId !== undefined) update.elevenlabs_agent_id = elevenlabsAgentId || null
  if (preferredName !== undefined) update.preferred_name = preferredName || null
  if (workContext !== undefined) update.work_context = workContext || null
  if (voiceProvider !== undefined) update.voice_provider = voiceProvider

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
  } else if (type === 'agent') {
    update.elevenlabs_agent_id = null
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
