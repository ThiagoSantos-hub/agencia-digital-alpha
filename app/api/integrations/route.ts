import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

async function getCallerCompanyId(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
  return profile?.company_id ?? null
}

// GET — lista todas as integrações da empresa do usuário logado
export async function GET() {
  try {
    const supabase = createServerClient()
    const companyId = await getCallerCompanyId(supabase)
    if (!companyId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data, error } = await supabase
      .from('integrations')
      .select('id, type, label, status, connected_at, token_expiry, config')
      .eq('company_id', companyId)
      .order('type')
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
  }
}

// PATCH — atualiza uma integração da empresa do usuário logado (ex: salvar API key manual)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, config, access_token, status } = body
    if (!type) {
      return NextResponse.json({ error: 'type é obrigatório' }, { status: 400 })
    }
    const supabase = createServerClient()
    const companyId = await getCallerCompanyId(supabase)
    if (!companyId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (config !== undefined) updates.config = config
    if (access_token !== undefined) {
      updates.access_token = access_token
      updates.status = 'connected'
      updates.connected_at = new Date().toISOString()
    }
    if (status !== undefined) updates.status = status
    const { data, error } = await supabase
      .from('integrations')
      .update(updates)
      .eq('type', type)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
  }
}

// DELETE — desconecta uma integração da empresa do usuário logado
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    if (!type) {
      return NextResponse.json({ error: 'type é obrigatório' }, { status: 400 })
    }
    const supabase = createServerClient()
    const companyId = await getCallerCompanyId(supabase)
    if (!companyId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { error } = await supabase
      .from('integrations')
      .update({
        status: 'disconnected',
        access_token: null,
        refresh_token: null,
        token_expiry: null,
        connected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('type', type)
      .eq('company_id', companyId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado' }, { status: 500 })
  }
}
