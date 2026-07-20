import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { provisionCompany, generateTempPassword } from '@/lib/companyProvisioning'
import { sendWelcomeEmail, sendInternalAlert } from '@/lib/email'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BAD_STATUSES = ['past_due', 'unpaid', 'canceled']

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {}

  // Renovação Pix de empresa já existente (metadata.company_id vem de
  // /api/billing/renew-pix) — não é um cadastro novo.
  if (metadata.company_id) {
    // Supabase JS não tem GREATEST direto no update — busca o valor atual e
    // calcula aqui (empresa já existe, poucas linhas, sem problema de corrida
    // relevante nesse volume).
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('access_expires_at')
      .eq('id', metadata.company_id)
      .single()

    const base = company?.access_expires_at && new Date(company.access_expires_at) > new Date()
      ? new Date(company.access_expires_at)
      : new Date()
    const novaExpiracao = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000)

    await supabaseAdmin
      .from('companies')
      .update({ access_expires_at: novaExpiracao.toISOString(), active: true, subscription_status: 'pix_ativo' })
      .eq('id', metadata.company_id)
    return
  }

  // Cadastro novo — idempotência: Stripe pode entregar o mesmo evento mais de
  // uma vez, então não recria a empresa se já existe pra esse customer.
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  if (stripeCustomerId) {
    const { data: existing } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle()
    if (existing) return
  }

  const { companyName, adminName, adminEmail, phone, facebookProfile, paymentMethod } = metadata as Record<string, string>
  const tempPassword = generateTempPassword()

  const provisionInput = paymentMethod === 'pix'
    ? {
        companyName, adminName, adminEmail, phone, adminPassword: tempPassword,
        metaTesterProfile: facebookProfile,
        paymentMethod: 'pix' as const,
        stripeCustomerId,
        subscriptionStatus: 'pix_ativo',
        accessExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }
    : {
        companyName, adminName, adminEmail, phone, adminPassword: tempPassword,
        metaTesterProfile: facebookProfile,
        paymentMethod: 'card' as const,
        stripeCustomerId,
        stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
        subscriptionStatus: 'trialing',
      }

  const result = await provisionCompany(provisionInput)

  if (!result.success) {
    console.error('[stripe/webhook] falha ao provisionar empresa pós-pagamento:', result.error, { adminEmail, companyName })
    await sendInternalAlert({
      subject: 'Pagamento confirmado, mas a conta não foi criada',
      message: `${adminName} (${adminEmail}) pagou pela empresa "${companyName}" mas o sistema falhou ao criar a conta: ${result.error}. Precisa resolver manualmente.`,
    })
    return
  }

  await sendWelcomeEmail({ companyName, adminName, adminEmail, tempPassword })
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()
  if (!company) return

  const isBad = BAD_STATUSES.includes(subscription.status) || subscription.status === 'incomplete_expired'
  await supabaseAdmin
    .from('companies')
    .update({
      subscription_status: subscription.status,
      active: !isBad,
    })
    .eq('id', company.id)
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe/webhook] assinatura inválida:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] erro processando evento', event.type, err)
  }

  return NextResponse.json({ received: true })
}
