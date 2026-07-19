import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

async function requireAdmin() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  const { data: profile } = await session.from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return { session, companyId: profile.company_id as string }
}

// GET — lista os webhooks da própria empresa
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const { data, error } = await auth.session!
      .from('webhooks')
      .select('*')
      .eq('company_id', auth.companyId)
      .order('slot')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
  }
}

// PATCH — atualiza um slot de webhook da própria empresa
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { slot, name, url, event, active } = body

    if (!slot) {
      return NextResponse.json({ error: 'slot é obrigatório' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updates.name = name
    if (url !== undefined) updates.url = url
    if (event !== undefined) updates.event = event
    if (active !== undefined) updates.active = active

    const { data, error } = await auth.session!
      .from('webhooks')
      .upsert({ company_id: auth.companyId, slot, ...updates }, { onConflict: 'company_id,slot' })
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

// DELETE — limpa um slot de webhook da própria empresa
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const slot = searchParams.get('slot')

    if (!slot) {
      return NextResponse.json({ error: 'slot é obrigatório' }, { status: 400 })
    }

    const { error } = await auth.session!
      .from('webhooks')
      .update({
        name: null,
        url: null,
        event: null,
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', auth.companyId)
      .eq('slot', Number(slot))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
  }
}
