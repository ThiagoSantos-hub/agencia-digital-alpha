import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireSuperAdmin() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  const { data: profile } = await session.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return {}
}

// Lista de módulos é fixa (semeada por migration). Essa rota só lê e edita
// o video_url de cada um, sem criar/excluir linhas.
export async function GET() {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin
    .from('onboarding_modules')
    .select('*')
    .order('surface')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  try {
    const { key, video_url } = await request.json()
    if (!key) return NextResponse.json({ error: 'key é obrigatório.' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('onboarding_modules')
      .update({ video_url: video_url || null, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
