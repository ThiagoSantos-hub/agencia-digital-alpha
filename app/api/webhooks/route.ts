import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET — lista todos os webhooks
export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .order('slot')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
  }
}

// PATCH — atualiza um slot de webhook
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { slot, name, url, event, active } = body

    if (!slot) {
      return NextResponse.json({ error: 'slot é obrigatório' }, { status: 400 })
    }

    const supabase = createClient()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updates.name = name
    if (url !== undefined) updates.url = url
    if (event !== undefined) updates.event = event
    if (active !== undefined) updates.active = active

    const { data, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('slot', slot)
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

// DELETE — limpa um slot de webhook
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slot = searchParams.get('slot')

    if (!slot) {
      return NextResponse.json({ error: 'slot é obrigatório' }, { status: 400 })
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('webhooks')
      .update({
        name: null,
        url: null,
        event: null,
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('slot', Number(slot))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
  }
}
