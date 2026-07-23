import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Rota pública (sem sessão) pra /assinar montar a lista de planos — só campos
// seguros pro navegador, sem stripe_price_id. Client criado a cada chamada (não
// reaproveitado no escopo do módulo): uma instância de função aquecida
// reaproveitando a mesma conexão HTTP ficou presa numa foto antiga da tabela
// plans, servindo dado desatualizado mesmo depois de edições confirmadas no
// banco — recriar o client força uma conexão nova a cada request.
export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }
  )

  const { data, error } = await supabaseAdmin
    .from('plans')
    .select('id, name, price_brl, client_limit, monthly_reports_limit, monthly_alerts_limit, is_free, display_order, features, description')
    .eq('active', true)
    .order('display_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sem isso, o navegador/CDN podia continuar servindo a lista de planos de
  // antes de uma edição em /superadmin/planos — era por isso que mudar um
  // plano ali não refletia na hora de contratar em /assinar.
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
