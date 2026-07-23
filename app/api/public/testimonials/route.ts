import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Rota pública (sem sessão) pra /assinar montar os depoimentos.
export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) } }
  )

  const { data, error } = await supabaseAdmin
    .from('testimonials')
    .select('id, name, role, quote')
    .eq('active', true)
    .order('display_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
