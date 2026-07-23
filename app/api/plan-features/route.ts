import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rota leve pro usePlanFeatures: devolve só o JSONB de features do plano da
// empresa logada, pra decidir o que mostrar com cadeado.
export async function GET() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await session.from('profiles').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) return NextResponse.json({ features: {} })

  const { data: company } = await supabaseAdmin.from('companies').select('plan').eq('id', profile.company_id).maybeSingle()
  if (!company?.plan) return NextResponse.json({ features: {} })

  const { data: plan } = await supabaseAdmin.from('plans').select('features, name').eq('id', company.plan).maybeSingle()
  return NextResponse.json({ features: plan?.features ?? {}, planName: plan?.name ?? null })
}
