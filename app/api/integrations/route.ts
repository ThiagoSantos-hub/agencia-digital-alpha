import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET — lista todas as integrações
export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('integrations')
      .select('id, type, label, status, connected_at, token_expiry, config')
      .order('type')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
  }
}

// PATCH — atualiza uma integração (ex: salvar API key manual)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, config, access_token, status } = body

    if (!type) {
      return NextResponse.json({ error: 'type é obrigatório' }, { status: 400 })
    }

    const supabase = createClient()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (config !== undefined) updates.config = config
    if (access_token !== undefined) {
      updates.access_token = access_token
      updates.status = 'connected'
      updates.connected_at = new Date().toISOString()
    }
    if (status !== undefined) updates.status = status

    const { data, error } = await supabase
      .from('integrations')
      .update(updates)
      .eq('type', type)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
  }
}

// DELETE — desconecta uma integração
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (!type) {
      return NextResponse.json({ error: 'type é obrigatório' }, { status: 400 })
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('integrations')
      .update({
        status: 'disconnected',
        access_token: null,
        refresh_token: null,
        token_expiry: null,
        connected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('type', type)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
  }
}
