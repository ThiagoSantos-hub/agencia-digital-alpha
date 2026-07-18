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
  return { session, companyId: profile.company_id as string }
}

// GET — dados da própria empresa (usados como identidade CONTRATADO nos contratos)
export async function GET() {
  const auth = await requireManager()
  if (auth.error) return auth.error

  const { data, error } = await auth.session!.from('companies').select('*').eq('id', auth.companyId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — atualiza os dados de identidade CONTRATADO da própria empresa
export async function PATCH(request: NextRequest) {
  const auth = await requireManager()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { contract_signer_name, contract_signer_cpf, contract_signer_email, contract_signer_phone, contract_signer_address } = body

    const { data, error } = await auth.session!
      .from('companies')
      .update({
        contract_signer_name, contract_signer_cpf, contract_signer_email,
        contract_signer_phone, contract_signer_address,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.companyId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
