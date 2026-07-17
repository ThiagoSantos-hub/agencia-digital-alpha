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

  if (!EVO_URL || !EVO_KEY) {
    return NextResponse.json({ error: 'Configuração da API ausente.' }, { status: 503 })
  }

  const name = instanceName(user.id)

  // Lê preferência salva no banco (não pode ser sobrescrita pelo status da Evolution)
  const { data: dbInstance } = await supabase
    .from('whatsapp_instances')
    .select('grupos_visiveis_colaboradores')
    .eq('user_id', user.id)
    .maybeSingle()

  const gruposVisiveis = dbInstance?.grupos_visiveis_colaboradores === true

  try {
    const statusRes = await fetch(`${EVO_URL}/instance/connectionState/${name}`, {
      headers: { 'apikey': EVO_KEY },
      cache: 'no-store'
    })
    
    let statusData = await statusRes.json()

    if (statusRes.status === 404 || statusData?.status === 404 || !statusData?.instance) {
      const createRes = await fetch(`${EVO_URL}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
        body: JSON.stringify({ 
          instanceName: name, 
          qrcode: true, 
          integration: 'WHATSAPP-BAILEYS',
          token: user.id
        }),
      })
      
      if (createRes.ok) {
        await new Promise(r => setTimeout(r, 1000))
        const retryStatus = await fetch(`${EVO_URL}/instance/connectionState/${name}`, {
          headers: { 'apikey': EVO_KEY },
          cache: 'no-store'
        })
        statusData = await retryStatus.json()
      }
    }

    const isConnected = statusData?.instance?.state === 'open' || 
                        statusData?.instance?.state === 'connected' ||
                        statusData?.state === 'open'
                        
    if (isConnected) {
      // Atualiza só status — preserva grupos_visiveis_colaboradores
      await supabase.from('whatsapp_instances').upsert({
        user_id: user.id,
        instance_name: name,
        status: 'connected',
        connected_at: new Date().toISOString(),
        grupos_visiveis_colaboradores: gruposVisiveis,
      }, { onConflict: 'user_id' })
      
      return NextResponse.json({
        status: 'connected',
        instance_name: name,
        grupos_visiveis_colaboradores: gruposVisiveis,
      })
    }

    const connectRes = await fetch(`${EVO_URL}/instance/connect/${name}`, {
      headers: { 'apikey': EVO_KEY },
      cache: 'no-store'
    })
    const connectData = await connectRes.json()

    const qrcode = 
      connectData?.base64 || 
      connectData?.qrcode?.base64 || 
      connectData?.qrcode ||
      connectData?.code || 
      statusData?.instance?.qrcode?.base64 || 
      statusData?.instance?.qrcode ||
      null

    await supabase.from('whatsapp_instances').upsert({
      user_id: user.id,
      instance_name: name,
      status: 'connecting',
      grupos_visiveis_colaboradores: gruposVisiveis,
    }, { onConflict: 'user_id' })

    if (!qrcode && statusData?.instance) {
        await fetch(`${EVO_URL}/instance/restart/${name}`, {
            method: 'POST',
            headers: { 'apikey': EVO_KEY }
        }).catch(() => {})
    }

    return NextResponse.json({
      status: 'connecting',
      instance_name: name,
      qrcode: qrcode,
      grupos_visiveis_colaboradores: gruposVisiveis,
      debug_info: !qrcode ? 'QR Code não gerado pela API. Tente reiniciar a instância.' : null
    })

  } catch (err: any) {
    console.error('Erro diagnóstico WhatsApp:', err)
    return NextResponse.json({ error: 'Falha na comunicação com o servidor WhatsApp.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()

  if (typeof body.grupos_visiveis_colaboradores === 'boolean') {
    // Garante que a linha existe antes do update
    const name = instanceName(user.id)
    const { data: existing } = await supabase
      .from('whatsapp_instances')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existing) {
      const { error: insertError } = await supabase
        .from('whatsapp_instances')
        .insert({
          user_id: user.id,
          instance_name: name,
          status: 'disconnected',
          grupos_visiveis_colaboradores: body.grupos_visiveis_colaboradores,
        })
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    } else {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ grupos_visiveis_colaboradores: body.grupos_visiveis_colaboradores })
        .eq('user_id', user.id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      grupos_visiveis_colaboradores: body.grupos_visiveis_colaboradores,
    })
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
      }).catch(() => {})
      
      await fetch(`${EVO_URL}/instance/delete/${name}`, {
        method: 'DELETE',
        headers: { 'apikey': EVO_KEY },
      }).catch(() => {})
    } catch { }
  }

  await supabase.from('whatsapp_instances').delete().eq('user_id', user.id)
  await supabase.from('whatsapp_groups').delete().eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
