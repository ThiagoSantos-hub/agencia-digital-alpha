import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getTrialDaysForSignup, isFacebookProfileInBadStanding } from '@/lib/billing'
import { priceIdForPlan, type Plan } from '@/lib/planLimits'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agencia-digital-alpha.vercel.app'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const { companyName, adminName, adminEmail, phone, facebookProfile, paymentMethod, plan } = await request.json()

    if (!companyName || !adminName || !adminEmail || !phone || !facebookProfile) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }
    if (!EMAIL_REGEX.test(adminEmail)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
    }
    if (paymentMethod !== 'card' && paymentMethod !== 'pix') {
      return NextResponse.json({ error: 'Forma de pagamento inválida.' }, { status: 400 })
    }
    if (plan !== 'basico' && plan !== 'pro' && plan !== 'premium') {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
    }

    // Evita cobrar o cliente e só depois falhar ao criar o usuário: se já
    // existe uma conta com esse e-mail, bloqueia antes de ir pro Stripe.
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', adminEmail)
      .maybeSingle()
    if (existingProfile) {
      return NextResponse.json({ error: 'Este e-mail já possui uma conta. Faça login ou use outro e-mail.' }, { status: 400 })
    }

    // Checagem antifraude: perfil do Facebook já usado por uma empresa em
    // débito (cancelada, atrasada, Pix vencido) não pode se cadastrar de novo
    // com outro e-mail. Mensagem genérica pra não entregar o motivo real.
    if (await isFacebookProfileInBadStanding(facebookProfile)) {
      return NextResponse.json({ error: 'Não foi possível completar o cadastro. Entre em contato com o suporte.' }, { status: 400 })
    }

    const metadata = { companyName, adminName, adminEmail, phone, facebookProfile, paymentMethod, plan }
    const successUrl = `${APP_URL}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${APP_URL}/assinar`
    const priceId = priceIdForPlan(plan as Plan)

    if (paymentMethod === 'card') {
      const trialDays = await getTrialDaysForSignup(facebookProfile)
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: trialDays > 0 ? { trial_period_days: trialDays } : undefined,
        customer_email: adminEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      })
      return NextResponse.json({ url: session.url })
    }

    // Pix: pagamento avulso (não é Pix Automático — sem mandato recorrente),
    // preço do plano escolhido + 10%, libera 30 dias, sem trial.
    const basePrice = await stripe.prices.retrieve(priceId)
    const pixAmount = Math.round((basePrice.unit_amount ?? 0) * 1.1)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['pix'],
      customer_creation: 'always',
      line_items: [{
        price_data: {
          currency: basePrice.currency,
          product_data: { name: `Assinatura Digital Alpha — 1 mês (Pix, plano ${plan})` },
          unit_amount: pixAmount,
        },
        quantity: 1,
      }],
      customer_email: adminEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    })
    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
