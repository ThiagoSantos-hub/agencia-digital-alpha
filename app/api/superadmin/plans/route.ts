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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// GET — lista todos os planos (ativos e inativos: o superadmin precisa ver
// legados como Básico pra ainda conseguir editar empresas presas neles).
export async function GET() {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin.from('plans').select('*').order('display_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { name, priceBrl, clientLimit, monthlyReportsLimit, monthlyAlertsLimit, stripePriceId, isFree, active, displayOrder, features } = body

    if (!name) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

    const id = slugify(name)
    const { data: existing } = await supabaseAdmin.from('plans').select('id').eq('id', id).maybeSingle()
    if (existing) return NextResponse.json({ error: `Já existe um plano com o identificador "${id}". Escolha outro nome.` }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('plans')
      .insert({
        id,
        name,
        price_brl: priceBrl ?? 0,
        client_limit: clientLimit === '' || clientLimit === null ? null : clientLimit,
        monthly_reports_limit: monthlyReportsLimit === '' || monthlyReportsLimit === null ? null : monthlyReportsLimit,
        monthly_alerts_limit: monthlyAlertsLimit === '' || monthlyAlertsLimit === null ? null : monthlyAlertsLimit,
        stripe_price_id: stripePriceId || null,
        is_free: !!isFree,
        active: active ?? true,
        display_order: displayOrder ?? 0,
        features: features ?? {},
      })
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
    const body = await request.json()
    const { id, name, priceBrl, clientLimit, monthlyReportsLimit, monthlyAlertsLimit, stripePriceId, isFree, active, displayOrder, features } = body
    if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) update.name = name
    if (priceBrl !== undefined) update.price_brl = priceBrl
    if (clientLimit !== undefined) update.client_limit = clientLimit === '' ? null : clientLimit
    if (monthlyReportsLimit !== undefined) update.monthly_reports_limit = monthlyReportsLimit === '' ? null : monthlyReportsLimit
    if (monthlyAlertsLimit !== undefined) update.monthly_alerts_limit = monthlyAlertsLimit === '' ? null : monthlyAlertsLimit
    if (stripePriceId !== undefined) update.stripe_price_id = stripePriceId || null
    if (isFree !== undefined) update.is_free = !!isFree
    if (active !== undefined) update.active = !!active
    if (displayOrder !== undefined) update.display_order = displayOrder
    if (features !== undefined) update.features = features

    const { data, error } = await supabaseAdmin.from('plans').update(update).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE — só permite excluir um plano se nenhuma empresa estiver usando ele
// (senão orienta desativar em vez de excluir).
export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

  const { count } = await supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }).eq('plan', id)
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: `${count} empresa(s) ainda usam esse plano. Desative em vez de excluir.` }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('plans').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
