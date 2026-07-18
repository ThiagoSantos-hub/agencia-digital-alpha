import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

async function requireManager() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  const { data: profile } = await session.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'collaborator') {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return { session, userId: user.id }
}

export async function GET() {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const { data, error } = await auth.session!
    .from('contract_templates')
    .select('*')
    .order('type')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { type, setup_fee, monthly_fee, currency, extra_config } = body
    if (!type) return NextResponse.json({ error: 'type é obrigatório' }, { status: 400 })

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: auth.userId,
    }
    if (setup_fee !== undefined) updates.setup_fee = setup_fee
    if (monthly_fee !== undefined) updates.monthly_fee = monthly_fee
    if (currency !== undefined) updates.currency = currency
    if (extra_config !== undefined) updates.extra_config = extra_config

    const { data, error } = await auth.session!
      .from('contract_templates')
      .update(updates)
      .eq('type', type)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
