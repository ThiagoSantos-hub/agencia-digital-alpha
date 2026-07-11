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

  // 1. Tenta buscar o status da conexão na Evolution API
  try {
    const statusRes = await fetch(`${EVO_URL}/instance/connectionState/${name}`, {
      headers: { 'apikey': EVO_KEY },
    })
    
    const statusData = await statusRes.json()
    
    // Se a instância não existir (404 ou erro específico), vamos criá-la
    if (statusRes.status === 404 || statusData?.error || !statusData?.instance) {
      const createRes = await fetch(`${EVO_URL}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
        body: JSON.stringify({ instanceName: name, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
      })
      
      if (!createRes.ok) {
        const errData = await createRes.json()
        // Se já existir na Evolution mas não no nosso banco, ignoramos o erro e seguimos
        if (errData?.response?.message?.[0]?.includes('already exists')) {
           // prossegue
        } else {
           return NextResponse.json({ error: 'Erro ao criar instância no servidor WhatsApp.' }, { status: 500 })
        }
      }
    }

    // 2. Se estiver conectada (open), atualiza banco e retorna
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

    // 3. Se não estiver conectada, gera/busca o QR Code
    const qrRes = await fetch(`${EVO_URL}/instance/connect/${name}`, {
      headers: { 'apikey': EVO_KEY },
    })
    const qrData = await qrRes.json()

    // Atualiza o banco com o status de conectando
    await supabase.from('whatsapp_instances').upsert({
      user_id: user.id,
      instance_name: name,
      status: 'connecting',
    }, { onConflict: 'user_id' })

    // Retorna o QR Code (suporta múltiplos formatos de resposta da Evolution API)
    return NextResponse.json({
      status: 'connecting',
      instance_name: name,
      qrcode: qrData?.base64 || qrData?.qrcode?.base64 || qrData?.code || null,
    })

  } catch (err: any) {
    console.error('Erro na rota de WhatsApp Instance:', err)
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
