import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { provisionCompany } from '@/lib/companyProvisioning'
import { sendWelcomeEmail } from '@/lib/email'
import { getAllPlans } from '@/lib/plans'

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

  const plans = await getAllPlans()

  const withCounts = (companies ?? []).map((c) => ({
    ...c,
    client_count: countBy(clientRows, c.id),
    user_count: countBy(profileRows, c.id),
    admin_emails: (profileRows ?? [])
      .filter((p) => p.company_id === c.id && p.role === 'admin')
      .map((p) => p.email),
    plan_name: plans.find((p) => p.id === c.plan)?.name ?? null,
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

// DELETE — apaga a empresa e TODOS os dados relacionados a ela, permanentemente.
// Ordem importa por causa de chaves estrangeiras sem CASCADE (ex: contracts
// bloqueia a exclusão de contract_templates se não for apagado antes).
export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('companyId')
  if (!companyId) {
    return NextResponse.json({ error: 'companyId é obrigatório.' }, { status: 400 })
  }

  const { data: company } = await supabaseAdmin.from('companies').select('is_platform_owner').eq('id', companyId).single()
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
  if (company.is_platform_owner) return NextResponse.json({ error: 'Não é possível excluir a empresa da plataforma.' }, { status: 400 })

  try {
    // Tabelas com company_id direto, na ordem que respeita as chaves
    // estrangeiras sem ON DELETE CASCADE (contracts antes de contract_templates).
    const tablesInOrder = [
      'contracts',
      'contract_templates',
      'campaign_metrics',
      'campaigns',
      'clients',
      'collaborators',
      'finances',
      'webhooks',
      'reports',
      'alerts',
      'feedbacks',
      'conversations',
      'integrations',
    ]
    for (const table of tablesInOrder) {
      const { error } = await supabaseAdmin.from(table).delete().eq('company_id', companyId)
      if (error) throw new Error(`Falha ao apagar ${table}: ${error.message}`)
    }

    // Usuários: apagar via Admin API (não só a linha de profiles) pra
    // cascatear tudo que referencia auth.users (checklists, notificações,
    // whatsapp_instances/groups, password_reset_tokens, etc.)
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('company_id', companyId)
    for (const p of profiles ?? []) {
      await supabaseAdmin.auth.admin.deleteUser(p.id)
    }

    const { error: companyError } = await supabaseAdmin.from('companies').delete().eq('id', companyId)
    if (companyError) throw new Error(`Falha ao apagar a empresa: ${companyError.message}`)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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
