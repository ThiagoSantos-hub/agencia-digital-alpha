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
    return NextResponse.json({ error: 'Evolution API não configurada.' }, { status: 503 })
  }

  const name = instanceName(user.id)

  try {
    // 1. Verifica o estado da conexão
    const statusRes = await fetch(`${EVO_URL}/instance/connectionState/${name}`, {
      headers: { 'apikey': EVO_KEY },
    })
    
    let statusData = await statusRes.json()

    // 2. Se a instância não existe, cria ela
    if (statusRes.status === 404 || statusData?.error || !statusData?.instance) {
      const createRes = await fetch(`${EVO_URL}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
        body: JSON.stringify({ instanceName: name, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
      })
      
      if (createRes.ok) {
        // Após criar, busca o estado novamente para pegar o QR Code inicial
        const newStatusRes = await fetch(`${EVO_URL}/instance/connectionState/${name}`, {
          headers: { 'apikey': EVO_KEY },
        })
        statusData = await newStatusRes.json()
      }
    }

    // 3. Se estiver conectada, retorna sucesso
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
      })
    }

    // 4. Se não estiver conectada, solicita o QR Code explicitamente
    const qrRes = await fetch(`${EVO_URL}/instance/connect/${name}`, {
      headers: { 'apikey': EVO_KEY },
    })
    const qrData = await qrRes.json()

    await supabase.from('whatsapp_instances').upsert({
      user_id: user.id,
      instance_name: name,
      status: 'connecting',
    }, { onConflict: 'user_id' })

    // Pega o QR Code de onde quer que ele esteja na resposta (a Evolution muda às vezes)
    const qrcode = qrData?.base64 || qrData?.qrcode?.base64 || qrData?.code || statusData?.instance?.qrcode?.base64 || null

    return NextResponse.json({
      status: 'connecting',
      instance_name: name,
      qrcode: qrcode,
    })

  } catch (err: any) {
    console.error('Erro detalhado WhatsApp:', err)
    return NextResponse.json({ error: 'Erro de comunicação com o servidor WhatsApp.' }, { status: 500 })
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
