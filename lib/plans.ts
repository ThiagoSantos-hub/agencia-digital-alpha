import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Substitui lib/planLimits.ts: planos agora são linhas na tabela `plans`
// (editáveis em /superadmin/planos), não um enum fixo em código. O `id`
// (basico/pro/premium/gratuito) é a única chave estável — nome, preço e
// limites mudam livremente sem migration.
export type Plan = string

export interface PlanRow {
  id: string
  name: string
  price_brl: number
  client_limit: number | null
  monthly_reports_limit: number | null
  monthly_alerts_limit: number | null
  stripe_price_id: string | null
  is_free: boolean
  active: boolean
  display_order: number
  features: Record<string, boolean>
}

export async function getPlanById(id: string | null | undefined): Promise<PlanRow | null> {
  if (!id) return null
  const { data } = await supabaseAdmin.from('plans').select('*').eq('id', id).maybeSingle()
  return (data as PlanRow | null) ?? null
}

export async function getActivePlans(): Promise<PlanRow[]> {
  const { data } = await supabaseAdmin.from('plans').select('*').eq('active', true).order('display_order')
  return (data as PlanRow[] | null) ?? []
}

export async function getAllPlans(): Promise<PlanRow[]> {
  const { data } = await supabaseAdmin.from('plans').select('*').order('display_order')
  return (data as PlanRow[] | null) ?? []
}

// null = sem limite (plano sem limite configurado, ou empresa sem plano definido).
export async function getClientLimit(plan: string | null | undefined): Promise<number | null> {
  const row = await getPlanById(plan)
  return row?.client_limit ?? null
}

export async function priceIdForPlan(plan: string): Promise<string> {
  const row = await getPlanById(plan)
  if (!row?.stripe_price_id) throw new Error(`Plano "${plan}" não tem stripe_price_id configurado.`)
  return row.stripe_price_id
}
