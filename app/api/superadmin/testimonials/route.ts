import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireSuperAdmin() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  const { data: profile } = await session.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return {}
}

export async function GET() {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin.from('testimonials').select('*').order('display_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  try {
    const { name, role, quote, displayOrder, active } = await request.json()
    if (!name || !quote) return NextResponse.json({ error: 'Nome e depoimento são obrigatórios.' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('testimonials')
      .insert({ name, role: role || null, quote, display_order: displayOrder ?? 0, active: active ?? true })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  try {
    const { id, name, role, quote, displayOrder, active } = await request.json()
    if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) update.name = name
    if (role !== undefined) update.role = role || null
    if (quote !== undefined) update.quote = quote
    if (displayOrder !== undefined) update.display_order = displayOrder
    if (active !== undefined) update.active = !!active

    const { data, error } = await supabaseAdmin.from('testimonials').update(update).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('testimonials').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
