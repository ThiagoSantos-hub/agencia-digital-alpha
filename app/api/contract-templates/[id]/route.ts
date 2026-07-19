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

// GET — um modelo com campos, cláusulas e itens de preço (o próprio, ou um da galeria)
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const supabase = auth.session!

  const { data: template, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !template) return NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 })

  const [{ data: fields }, { data: clauses }, { data: pricingItems }] = await Promise.all([
    supabase.from('contract_template_fields').select('*').eq('template_id', params.id).order('display_order'),
    supabase.from('contract_template_clauses').select('*').eq('template_id', params.id).order('display_order'),
    supabase.from('contract_template_pricing_items').select('*').eq('template_id', params.id).order('display_order'),
  ])

  return NextResponse.json({ ...template, fields: fields ?? [], clauses: clauses ?? [], pricingItems: pricingItems ?? [] })
}

// PATCH — atualiza metadados e/ou substitui por completo as listas de campos/
// cláusulas/itens de preço (a UI mantém estado local e salva tudo de uma vez).
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const supabase = auth.session!

  try {
    const { data: existing } = await supabase.from('contract_templates').select('company_id').eq('id', params.id).single()
    if (!existing || existing.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { name, currency, active, fields, clauses, pricingItems } = body

    const templateUpdates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: auth.userId }
    if (name !== undefined) templateUpdates.name = name
    if (currency !== undefined) templateUpdates.currency = currency
    if (active !== undefined) templateUpdates.active = active

    const { error: updateError } = await supabase.from('contract_templates').update(templateUpdates).eq('id', params.id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    if (Array.isArray(fields)) {
      await supabase.from('contract_template_fields').delete().eq('template_id', params.id)
      if (fields.length > 0) {
        const { error: fieldsError } = await supabase.from('contract_template_fields').insert(
          fields.map((f: Record<string, unknown>, i: number) => ({
            template_id: params.id, field_key: f.field_key, label: f.label,
            field_type: f.field_type, required: f.required ?? true, options: f.options ?? null, display_order: i,
          }))
        )
        if (fieldsError) return NextResponse.json({ error: fieldsError.message }, { status: 500 })
      }
    }

    if (Array.isArray(clauses)) {
      await supabase.from('contract_template_clauses').delete().eq('template_id', params.id)
      if (clauses.length > 0) {
        const { error: clausesError } = await supabase.from('contract_template_clauses').insert(
          clauses.map((c: Record<string, unknown>, i: number) => ({
            template_id: params.id, title: c.title, body: c.body, display_order: i,
          }))
        )
        if (clausesError) return NextResponse.json({ error: clausesError.message }, { status: 500 })
      }
    }

    if (Array.isArray(pricingItems)) {
      await supabase.from('contract_template_pricing_items').delete().eq('template_id', params.id)
      if (pricingItems.length > 0) {
        const { error: pricingError } = await supabase.from('contract_template_pricing_items').insert(
          pricingItems.map((p: Record<string, unknown>, i: number) => ({
            template_id: params.id, label: p.label, amount: p.amount, frequency: p.frequency, display_order: i,
          }))
        )
        if (pricingError) return NextResponse.json({ error: pricingError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const supabase = auth.session!

  const { data: existing } = await supabase.from('contract_templates').select('company_id').eq('id', params.id).single()
  if (!existing || existing.company_id !== auth.companyId) {
    return NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 })
  }

  const { error } = await supabase.from('contract_templates').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
