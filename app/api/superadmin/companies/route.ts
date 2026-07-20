import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { provisionCompany } from '@/lib/companyProvisioning'
import { sendWelcomeEmail } from '@/lib/email'

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

  const { data: companies, error } = await supabaseAdmin
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [{ data: clientRows }, { data: profileRows }] = await Promise.all([
    supabaseAdmin.from('clients').select('company_id'),
    supabaseAdmin.from('profiles').select('company_id, email, name, role'),
  ])

  const countBy = (rows: { company_id: string | null }[] | null, id: string) =>
    (rows ?? []).filter((r) => r.company_id === id).length

  const withCounts = (companies ?? []).map((c) => ({
    ...c,
    client_count: countBy(clientRows, c.id),
    user_count: countBy(profileRows, c.id),
    admin_emails: (profileRows ?? [])
      .filter((p) => p.company_id === c.id && p.role === 'admin')
      .map((p) => p.email),
  }))

  return NextResponse.json(withCounts)
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { companyId, metaTesterAdded, metaTesterProfile, name, slug, active, plan } = await request.json()
  if (!companyId) {
    return NextResponse.json({ error: 'companyId é obrigatório.' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (metaTesterAdded !== undefined) update.meta_tester_added = !!metaTesterAdded
  if (metaTesterProfile !== undefined) update.meta_tester_profile = metaTesterProfile || null
  if (name !== undefined) update.name = name
  if (slug !== undefined) update.slug = slug
  if (active !== undefined) update.active = !!active
  if (plan !== undefined) update.plan = plan || null

  const { error } = await supabaseAdmin
    .from('companies')
    .update(update)
    .eq('id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  try {
    const { companyName, companySlug, adminName, adminEmail, adminPassword, metaTesterProfile, plan } = await request.json()

    if (!companyName || !companySlug || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }

    const result = await provisionCompany({ companyName, companySlug, adminName, adminEmail, adminPassword, metaTesterProfile, plan: plan || null })
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    await sendWelcomeEmail({ companyName, adminName, adminEmail, tempPassword: adminPassword })

    return NextResponse.json({ success: true, company: result.company })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
