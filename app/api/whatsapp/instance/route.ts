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

  try {
    // PASSO 1: Verificar se a instância existe e seu estado
    const statusRes = await fetch(`${EVO_URL}/instance/connectionState/${name}`, {
      headers: { 'apikey': EVO_KEY },
      cache: 'no-store'
    })
    
    let statusData = await statusRes.json()

    // PASSO 2: Se a instância não existe na Evolution API, criar agora
    if (statusRes.status === 404 || statusData?.status === 404 || !statusData?.instance) {
      const createRes = await fetch(`${EVO_URL}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
        body: JSON.stringify({ 
          instanceName: name, 
          qrcode: true, 
          integration: 'WHATSAPP-BAILEYS',
          token: user.id // Token opcional para segurança extra
        }),
      })
      
      if (createRes.ok) {
        // Aguarda um pequeno delay para a API processar a criação
        await new Promise(r => setTimeout(r, 1000))
        const retryStatus = await fetch(`${EVO_URL}/instance/connectionState/${name}`, {
          headers: { 'apikey': EVO_KEY },
          cache: 'no-store'
        })
        statusData = await retryStatus.json()
      }
    }

    // PASSO 3: Se já está conectada, atualizar banco e retornar
    if (statusData?.instance?.state === 'open') {
      await supabase.from('whatsapp_instances').upsert({
        user_id: user.id,
        instance_name: name,
        status: 'connected',
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      
      return NextResponse.json({ status: 'connected', instance_name: name })
    }

    // PASSO 4: Se não está conectada, buscar o QR Code
    // Tentamos primeiro o endpoint de conexão direta
    const connectRes = await fetch(`${EVO_URL}/instance/connect/${name}`, {
      headers: { 'apikey': EVO_KEY },
      cache: 'no-store'
    })
    const connectData = await connectRes.json()

    // LÓGICA DE EXTRAÇÃO DE QR CODE (A Evolution API varia a resposta conforme a versão)
    // Procuramos em todas as propriedades possíveis, incluindo o objeto qrcode direto
    const qrcode = 
      connectData?.base64 || 
      connectData?.qrcode?.base64 || 
      connectData?.qrcode || // Às vezes o objeto qrcode já é a string base64
      connectData?.code || 
      statusData?.instance?.qrcode?.base64 || 
      statusData?.instance?.qrcode ||
      null

    // Atualiza estado no banco
    await supabase.from('whatsapp_instances').upsert({
      user_id: user.id,
      instance_name: name,
      status: 'connecting',
    }, { onConflict: 'user_id' })

    // Se mesmo assim não houver QR Code, pode ser que a instância precise ser reiniciada
    if (!qrcode && statusData?.instance) {
        // Tentativa de "acordar" a instância se ela estiver em 'close' ou 'connecting'
        await fetch(`${EVO_URL}/instance/restart/${name}`, {
            method: 'POST',
            headers: { 'apikey': EVO_KEY }
        }).catch(() => {})
    }

    return NextResponse.json({
      status: 'connecting',
      instance_name: name,
      qrcode: qrcode,
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
      // Logout e Delete na Evolution API
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

  // Limpa banco local
  await supabase.from('whatsapp_instances').delete().eq('user_id', user.id)
  await supabase.from('whatsapp_groups').delete().eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
