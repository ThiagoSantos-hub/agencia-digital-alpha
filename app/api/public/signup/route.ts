import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { isFacebookProfileInBadStanding, hasFacebookProfileUsedFreePlan } from '@/lib/billing'
import { getPlanById, priceIdForPlan } from '@/lib/plans'
import { provisionCompany, generateTempPassword } from '@/lib/companyProvisioning'
import { sendWelcomeEmail } from '@/lib/email'

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

    const planRow = await getPlanById(plan)
    if (!planRow || !planRow.active) {
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

    // Plano Gratuito: identifica pelo perfil do Facebook informado (mesmo
    // texto autodeclarado usado pros planos pagos) pra impedir que a mesma
    // pessoa volte a se cadastrar no Gratuito com outro e-mail só pra renovar
    // os 20 relatórios/20 alertas do mês.
    if (planRow.is_free) {
      if (await hasFacebookProfileUsedFreePlan(facebookProfile)) {
        return NextResponse.json({ error: 'Não foi possível completar o cadastro gratuito. Fale com o suporte.' }, { status: 400 })
      }

      const tempPassword = generateTempPassword()
      const result = await provisionCompany({
        companyName, adminName, adminEmail, phone, adminPassword: tempPassword,
        metaTesterProfile: facebookProfile,
        plan: planRow.id,
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status })
      }

      await sendWelcomeEmail({ companyName, adminName, adminEmail, tempPassword, plan: planRow.id })

      return NextResponse.json({ success: true, redirect: '/login' })
    }

    if (paymentMethod !== 'card' && paymentMethod !== 'pix') {
      return NextResponse.json({ error: 'Forma de pagamento inválida.' }, { status: 400 })
    }

    // Checagem antifraude: perfil do Facebook já usado por uma empresa em
    // débito (cancelada, atrasada, Pix vencido) não pode se cadastrar de novo
    // com outro e-mail. Mensagem genérica pra não entregar o motivo real.
    if (await isFacebookProfileInBadStanding(facebookProfile)) {
      return NextResponse.json({ error: 'Não foi possível completar o cadastro. Entre em contato com o suporte.' }, { status: 400 })
    }

    const successUrl = `${APP_URL}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${APP_URL}/assinar`
    const priceId = await priceIdForPlan(planRow.id)

    if (paymentMethod === 'card') {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: adminEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { companyName, adminName, adminEmail, phone, facebookProfile, paymentMethod, plan: planRow.id },
      })
      return NextResponse.json({ url: session.url })
    }

    // Pix: pagamento avulso (não é Pix Automático, sem mandato recorrente),
    // preço do plano escolhido + 10%, libera 30 dias.
    const basePrice = await stripe.prices.retrieve(priceId)
    const pixAmount = Math.round((basePrice.unit_amount ?? 0) * 1.1)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['pix'],
      customer_creation: 'always',
      line_items: [{
        price_data: {
          currency: basePrice.currency,
          product_data: { name: `Assinatura Digital Alpha, 1 mês (Pix, plano ${planRow.name})` },
          unit_amount: pixAmount,
        },
        quantity: 1,
      }],
      customer_email: adminEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { companyName, adminName, adminEmail, phone, facebookProfile, paymentMethod, plan: planRow.id },
    })
    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
