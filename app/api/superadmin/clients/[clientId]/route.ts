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

// Um cliente específico de qualquer empresa, só pro superadmin, alimenta a
// tela app/(app)/superadmin/empresas/[id]/clientes/[clientId]/page.tsx.
export async function GET(_request: Request, { params }: { params: { clientId: string } }) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, name, company, status, meta_ad_account_id, company_id')
    .eq('id', params.clientId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  return NextResponse.json(data)
}
