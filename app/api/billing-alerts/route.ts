import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'
import { getClientLimit, type Plan } from '@/lib/planLimits'

export const dynamic = 'force-dynamic'

async function getCallerCompanyId(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
  return profile?.company_id ?? null
}

const DIAS_AVISO = 5

// Avisos de cobrança pro dia-a-dia do usuário (não confundir com o painel de
// pagamentos do superadmin, que é uma visão gerencial de todas as empresas).
// Dois avisos possíveis, cada empresa vê o que se aplicar a ela:
// 1. Faltam <= 5 dias pro pagamento vencer (cartão ou Pix).
// 2. Falta só 1 cliente pra bater o limite do plano (parabéns + upgrade).
export async function GET() {
  const supabase = createServerClient()
  const companyId = await getCallerCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: company } = await supabase
    .from('companies')
    .select('plan, payment_method, stripe_subscription_id, subscription_status, access_expires_at')
    .eq('id', companyId)
    .single()

  let paymentDueSoon: { days: number; date: string; paymentMethod: 'card' | 'pix'; isTrial: boolean } | null = null

  if (company?.payment_method === 'card' && company.stripe_subscription_id && ['active', 'trialing'].includes(company.subscription_status ?? '')) {
    try {
      const subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id)
      const periodEnd = subscription.items.data[0]?.current_period_end
      if (periodEnd) {
        const dias = Math.ceil((periodEnd * 1000 - Date.now()) / (24 * 60 * 60 * 1000))
        if (dias >= 0 && dias <= DIAS_AVISO) {
          paymentDueSoon = { days: dias, date: new Date(periodEnd * 1000).toISOString(), paymentMethod: 'card', isTrial: company.subscription_status === 'trialing' }
        }
      }
    } catch {
      // assinatura não existe mais no Stripe — não avisa
    }
  } else if (company?.payment_method === 'pix' && company.subscription_status === 'pix_ativo' && company.access_expires_at) {
    const dias = Math.ceil((new Date(company.access_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    if (dias >= 0 && dias <= DIAS_AVISO) {
      paymentDueSoon = { days: dias, date: company.access_expires_at, paymentMethod: 'pix', isTrial: false }
    }
  }

  let clientLimitClose: { used: number; limit: number } | null = null
  const limite = getClientLimit(company?.plan as Plan | null)
  if (limite !== null) {
    const { count } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
    const used = count ?? 0
    if (limite - used === 1) {
      clientLimitClose = { used, limit: limite }
    }
  }

  return NextResponse.json({ paymentDueSoon, clientLimitClose })
}
