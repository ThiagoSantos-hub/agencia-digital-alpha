import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Rota leve pro mascote de onboarding: devolve a lista inteira de módulos
// (pequena, ~26 linhas, RLS já libera leitura pra qualquer autenticado) e as
// chaves que o usuário atual já viu, numa única chamada por sessão.
export async function GET() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: modules } = await session
    .from('onboarding_modules')
    .select('key, label, path_prefix, surface, video_url')
    .order('sort_order')

  const { data: seen } = await session
    .from('onboarding_seen')
    .select('module_key')
    .eq('user_id', user.id)

  return NextResponse.json(
    {
      modules: modules ?? [],
      seenKeys: (seen ?? []).map((s) => s.module_key),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
