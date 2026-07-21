import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'
import { PLAN_PRICE_BRL, type Plan } from '@/lib/planLimits'

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

interface CompanyRow {
  id: string
  name: string
  slug: string
  is_platform_owner: boolean
  active: boolean
  plan: Plan | null
  payment_method: 'card' | 'pix' | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  access_expires_at: string | null
  admin_emails: string[]
  renews_at: string | null
  created_at: string
}

// Empresa cadastrada manualmente (sem Stripe) não tem pagamento pra
// acompanhar — não entra na lista.
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  // MRR "até" uma data — não temos histórico de status de assinatura, então
  // isso é uma aproximação: empresas que já existiam até essa data, com o
  // plano e status ATUAIS delas (não um retrato exato do passado).
  const untilParam = request.nextUrl.searchParams.get('until')
  const until = untilParam ? new Date(`${untilParam}T23:59:59`) : new Date()

  const { data: companies, error } = await supabaseAdmin
    .from('companies')
    .select('id, name, slug, is_platform_owner, active, plan, payment_method, stripe_subscription_id, subscription_status, access_expires_at, created_at')
    .not('payment_method', 'is', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profileRows } = await supabaseAdmin
    .from('profiles')
    .select('company_id, email, role')

  const adminEmailsFor = (companyId: string) =>
    (profileRows ?? []).filter((p) => p.company_id === companyId && p.role === 'admin').map((p) => p.email)

  // Data de próxima cobrança do cartão vem direto do Stripe (não guardamos
  // localmente, mesmo padrão de app/api/company/route.ts) — busca em paralelo,
  // e se a assinatura já não existir mais no Stripe só deixa null.
  const rows: CompanyRow[] = await Promise.all(
    (companies ?? []).map(async (c) => {
      let renewsAt: string | null = null
      if (c.payment_method === 'card' && c.stripe_subscription_id) {
        try {
          const subscription = await stripe.subscriptions.retrieve(c.stripe_subscription_id)
          const periodEnd = subscription.items.data[0]?.current_period_end
          if (periodEnd) renewsAt = new Date(periodEnd * 1000).toISOString()
        } catch {
          // assinatura não existe mais no Stripe — só não mostra a data
        }
      }
      return { ...c, admin_emails: adminEmailsFor(c.id), renews_at: renewsAt }
    })
  )

  const priceOf = (plan: Plan | null) => (plan ? PLAN_PRICE_BRL[plan] : 0)

  const mrr = rows
    .filter((c) =>
      c.payment_method === 'card' &&
      ['active', 'trialing'].includes(c.subscription_status ?? '') &&
      new Date(c.created_at) <= until
    )
    .reduce((sum, c) => sum + priceOf(c.plan), 0)

  const emDia = rows.filter((c) =>
    (c.payment_method === 'card' && c.subscription_status === 'active') ||
    (c.payment_method === 'pix' && c.subscription_status === 'pix_ativo')
  ).length

  const emTrial = rows.filter((c) => c.subscription_status === 'trialing').length

  const atrasados = rows.filter((c) =>
    ['past_due', 'unpaid', 'canceled', 'incomplete_expired', 'pix_expirado'].includes(c.subscription_status ?? '') || c.active === false
  ).length

  const emFiveDays = Date.now() + 5 * 24 * 60 * 60 * 1000
  const pixVencendo = rows.filter((c) =>
    c.payment_method === 'pix' && c.subscription_status === 'pix_ativo' && c.access_expires_at && new Date(c.access_expires_at).getTime() <= emFiveDays
  ).length

  return NextResponse.json({
    companies: rows,
    summary: { mrr, total: rows.length, emDia, emTrial, atrasados, pixVencendo },
  })
}
