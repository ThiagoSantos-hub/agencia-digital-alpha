import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'
import { priceIdForPlan } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agencia-digital-alpha.vercel.app'

export async function POST() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
  if (profile?.role !== 'admin' || !profile.company_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, payment_method, plan')
    .eq('id', profile.company_id)
    .single()

  if (!company || company.payment_method !== 'pix') {
    return NextResponse.json({ error: 'Esta empresa não está no plano Pix.' }, { status: 400 })
  }

  const basePrice = await stripe.prices.retrieve(await priceIdForPlan(company.plan ?? 'basico'))
  const pixAmount = Math.round((basePrice.unit_amount ?? 0) * 1.1)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['pix'],
    customer_creation: 'always',
    line_items: [{
      price_data: {
        currency: basePrice.currency,
        product_data: { name: `Renovação Digital Alpha, 1 mês (Pix), ${company.name}` },
        unit_amount: pixAmount,
      },
      quantity: 1,
    }],
    success_url: `${APP_URL}/assinatura?renovado=1`,
    cancel_url: `${APP_URL}/assinatura`,
    metadata: { company_id: company.id },
  })

  return NextResponse.json({ url: session.url })
}
