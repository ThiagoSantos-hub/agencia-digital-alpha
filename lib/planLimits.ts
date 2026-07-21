export type Plan = 'basico' | 'pro' | 'premium'

export const PLAN_LABELS: Record<Plan, string> = {
  basico: 'Básico (R$ 47)',
  pro: 'Pro (R$ 97)',
  premium: 'Premium (R$ 147)',
}

export const PLAN_PRICE_BRL: Record<Plan, number> = {
  basico: 47,
  pro: 97,
  premium: 147,
}

// null = sem limite. Colaboradores não têm limite em nenhum plano.
export const PLAN_CLIENT_LIMITS: Record<Plan, number | null> = {
  basico: 5,
  pro: 15,
  premium: null,
}

export function getClientLimit(plan: string | null | undefined): number | null {
  if (plan === 'basico' || plan === 'pro' || plan === 'premium') return PLAN_CLIENT_LIMITS[plan]
  return null // empresas sem plano definido (cadastro manual antigo) ficam sem limite
}

export function priceIdForPlan(plan: Plan): string {
  const map: Record<Plan, string | undefined> = {
    basico: process.env.STRIPE_PRICE_ID_BASICO,
    pro: process.env.STRIPE_PRICE_ID_PRO,
    premium: process.env.STRIPE_PRICE_ID_PREMIUM,
  }
  const priceId = map[plan]
  if (!priceId) throw new Error(`STRIPE_PRICE_ID_${plan.toUpperCase()} não configurado`)
  return priceId
}
