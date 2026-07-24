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

// Lista de clientes de UMA empresa específica, só pro superadmin acompanhar
// (suporte/visão geral), igual ao painel do admin, mas navegando por fora
// do escopo de empresa normal (RLS de `clients` bloquearia isso pro superadmin).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, company, status, meta_ad_account_id')
    .eq('company_id', params.id)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data ?? [] })
}
