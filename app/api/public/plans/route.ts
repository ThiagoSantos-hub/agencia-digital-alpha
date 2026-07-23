import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rota pública (sem sessão) pra /assinar montar a lista de planos — só campos
// seguros pro navegador, sem stripe_price_id.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('plans')
    .select('id, name, price_brl, client_limit, monthly_reports_limit, monthly_alerts_limit, is_free, display_order')
    .eq('active', true)
    .order('display_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
