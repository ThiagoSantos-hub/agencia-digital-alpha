import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const EVO_URL  = process.env.EVOLUTION_API_URL  || ''
const EVO_KEY  = process.env.EVOLUTION_API_KEY  || ''

function instanceName(userId: string) {
  return `alpha_${userId.replace(/-/g, '').slice(0, 16)}`
}

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // ============================================================
  // LÓGICA UNIFICADA: qualquer usuário (admin, gestor ou
  // colaborador) passa pelo mesmo fluxo — verificar/criar a
  // própria instância na Evolution API.
  // O colaborador tem sua própria instância separada do admin.
  // Para acessar grupos do admin, o colaborador usa a rota
  // GET /api/whatsapp/groups?source=agency.
  // ============================================================

  if (!EVO_URL || !EVO_KEY) {
    return NextResponse.json({ error: 'Evolution API não configurada. Adicione EVOLUTION_API_URL e EVOLUTION_API_KEY nas variáveis de ambiente.' }, { status: 503 })
  }

  const name = instanceName(user.id)

  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!instance) {
    try {
      const createRes = await fetch(`${EVO_URL}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
        body: JSON.stringify({ instanceName: name, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
      })
      await createRes.json()
    } catch { }

    await supabase.from('whatsapp_instances').upsert({
      user_id: user.id,
      instance_name: name,
      status: 'connecting',
    }, { onConflict: 'user_id' })
  }

  try {
    const statusRes = await fetch(`${EVO_URL}/instance/connectionState/${name}`, {
      headers: { 'apikey': EVO_KEY },
    })
    const statusData = await statusRes.json()
    const isConnected = statusData?.instance?.state === 'open'

    if (isConnected) {
      await supabase.from('whatsapp_instances').upsert({
        user_id: user.id,
        instance_name: name,
        status: 'connected',
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      return NextResponse.json({
        status: 'connected',
        instance_name: name,
        grupos_visiveis_colaboradores: instance?.grupos_visiveis_colaboradores ?? false,
      })
    }

    const qrRes = await fetch(`${EVO_URL}/instance/connect/${name}`, {
      headers: { 'apikey': EVO_KEY },
    })
    const qrData = await qrRes.json()

    await supabase.from('whatsapp_instances').upsert({
      user_id: user.id,
      instance_name: name,
      status: 'connecting',
    }, { onConflict: 'user_id' })

    return NextResponse.json({
      status: 'connecting',
      instance_name: name,
      qrcode: qrData?.base64 || qrData?.qrcode?.base64 || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()

  if (typeof body.grupos_visiveis_colaboradores === 'boolean') {
    const { error } = await supabase
      .from('whatsapp_instances')
      .update({ grupos_visiveis_colaboradores: body.grupos_visiveis_colaboradores })
      .eq('user_id', user.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const name = instanceName(user.id)

  if (EVO_URL && EVO_KEY) {
    try {
      await fetch(`${EVO_URL}/instance/logout/${name}`, {
        method: 'DELETE',
        headers: { 'apikey': EVO_KEY },
      })
      await fetch(`${EVO_URL}/instance/delete/${name}`, {
        method: 'DELETE',
        headers: { 'apikey': EVO_KEY },
      })
    } catch { }
  }

  await supabase.from('whatsapp_instances').delete().eq('user_id', user.id)
  await supabase.from('whatsapp_groups').delete().eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
