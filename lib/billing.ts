import { createClient } from '@supabase/supabase-js'
import { normalizeFacebookProfile } from './facebookProfile'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BAD_DEBT_STATUSES = ['past_due', 'canceled', 'pix_expirado']

// Bloqueia o cadastro inteiro (mesmo com e-mail novo e pagando de novo) quando
// o perfil do Facebook informado já pertence a uma empresa em débito
// (desativada, atrasada ou com Pix vencido) — evita que alguém cancele pra não
// pagar e volte com outro e-mail pra burlar o sistema.
export async function isFacebookProfileInBadStanding(facebookProfile: string): Promise<boolean> {
  const normalized = normalizeFacebookProfile(facebookProfile)
  const { data } = await supabaseAdmin
    .from('companies')
    .select('meta_tester_profile, active, subscription_status')
    .not('meta_tester_profile', 'is', null)

  return (data ?? []).some((c) => {
    if (!c.meta_tester_profile || normalizeFacebookProfile(c.meta_tester_profile) !== normalized) return false
    return c.active === false || BAD_DEBT_STATUSES.includes(c.subscription_status ?? '')
  })
}

// Bloqueia um SEGUNDO cadastro no plano Gratuito com o mesmo perfil do
// Facebook (mesmo com e-mail novo) — é justamente o plano grátis que atrai
// gente trocando de e-mail pra tentar renovar os 20 relatórios/20 alertas do
// mês. Só olha empresas que JÁ estiveram no plano Gratuito (qualquer status),
// não afeta quem quer migrar do Gratuito pra um plano pago.
export async function hasFacebookProfileUsedFreePlan(facebookProfile: string): Promise<boolean> {
  const normalized = normalizeFacebookProfile(facebookProfile)

  const { data: freePlans } = await supabaseAdmin.from('plans').select('id').eq('is_free', true)
  const freePlanIds = (freePlans ?? []).map((p) => p.id)
  if (freePlanIds.length === 0) return false

  const { data } = await supabaseAdmin
    .from('companies')
    .select('meta_tester_profile')
    .in('plan', freePlanIds)
    .not('meta_tester_profile', 'is', null)

  return (data ?? []).some((c) => c.meta_tester_profile && normalizeFacebookProfile(c.meta_tester_profile) === normalized)
}
