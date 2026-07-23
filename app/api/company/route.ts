import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'
import { getPlanById } from '@/lib/plans'

export const dynamic = 'force-dynamic'

async function requireManager() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  const { data: profile } = await session.from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || profile.role === 'collaborator') {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return { session, companyId: profile.company_id as string }
}

// GET — dados da própria empresa (usados como identidade CONTRATADO nos contratos)
export async function GET() {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const { data, error } = await auth.session!.from('companies').select('*').eq('id', auth.companyId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Data de renovação vem direto do Stripe (não guardamos localmente pra não
  // precisar sincronizar toda vez que o ciclo de cobrança muda).
  let renewsAt: string | null = null
  if (data.payment_method === 'card' && data.stripe_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(data.stripe_subscription_id)
      const periodEnd = subscription.items.data[0]?.current_period_end
      if (periodEnd) renewsAt = new Date(periodEnd * 1000).toISOString()
    } catch {
      // se a assinatura não existir mais no Stripe, só não mostra a data
    }
  }

  const planDetails = await getPlanById(data.plan)

  return NextResponse.json({ ...data, renews_at: renewsAt, plan_details: planDetails })
}

// PATCH — atualiza os dados de identidade CONTRATADO da própria empresa
export async function PATCH(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { contract_signer_name, contract_signer_cpf, contract_signer_email, contract_signer_phone, contract_signer_address, esignature_provider } = body

    if (esignature_provider !== undefined && !['autentique', 'assinafy'].includes(esignature_provider)) {
      return NextResponse.json({ error: 'Provedor de assinatura inválido.' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      contract_signer_name, contract_signer_cpf, contract_signer_email,
      contract_signer_phone, contract_signer_address,
      updated_at: new Date().toISOString(),
    }
    if (esignature_provider !== undefined) updates.esignature_provider = esignature_provider

    const { data, error } = await auth.session!
      .from('companies')
      .update(updates)
      .eq('id', auth.companyId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
