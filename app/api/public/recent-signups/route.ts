import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Rota pública: cadastros recentes de verdade, pro popup de atividade em
// /assinar. Não expõe nome da empresa (privacidade + evita mostrar
// concorrente pra concorrente) — só o plano e há quanto tempo.
export async function GET(request: Request) {
  const ip = getClientIp(request)
  const dentroDoLimite = await checkRateLimit(`public-recent-signups:${ip}`, 30, 60)
  if (!dentroDoLimite) {
    return NextResponse.json({ error: 'Muitas requisições, tenta de novo em instantes.' }, { status: 429 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }
  )

  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('plan, created_at')
    .not('plan', 'is', null)
    .eq('is_platform_owner', false)
    .gte('created_at', trintaDiasAtras)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
