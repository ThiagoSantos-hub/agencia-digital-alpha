import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

async function requireManager() {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }

  const { data: profile } = await session.from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || profile.role === 'collaborator') {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return { session, userId: user.id, companyId: profile.company_id as string }
}

// GET — lista os modelos da própria empresa
export async function GET() {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const { data, error } = await auth.session!
    .from('contract_templates')
    .select('*')
    .eq('company_id', auth.companyId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — cria um modelo novo (vazio, "Começar do zero")
export async function POST(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  try {
    const { name, slug, currency } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

    const { data, error } = await auth.session!
      .from('contract_templates')
      .insert({
        company_id: auth.companyId,
        name: name.trim(),
        slug: slug?.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        currency: currency || 'BRL',
        updated_by: auth.userId,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
