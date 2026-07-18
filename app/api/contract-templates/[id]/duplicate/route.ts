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

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// POST — duplica um modelo (próprio ou da galeria) pra dentro da empresa do usuário.
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireManager()
  if (auth.error) return auth.error
  const supabase = auth.session!

  try {
    const { data: source, error: sourceError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (sourceError || !source) return NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 })
    // RLS já garante que só é possível ler modelos próprios ou da galeria — se chegou
    // aqui, o acesso de leitura é válido; a duplicação sempre cria dentro da própria empresa.

    const [{ data: fields }, { data: clauses }, { data: pricingItems }] = await Promise.all([
      supabase.from('contract_template_fields').select('*').eq('template_id', params.id).order('display_order'),
      supabase.from('contract_template_clauses').select('*').eq('template_id', params.id).order('display_order'),
      supabase.from('contract_template_pricing_items').select('*').eq('template_id', params.id).order('display_order'),
    ])

    const baseSlug = slugify(`${source.name}-copia`)
    let newSlug = baseSlug
    let attempt = 1
    while (true) {
      const { data: clash } = await supabase.from('contract_templates').select('id').eq('company_id', auth.companyId).eq('slug', newSlug).maybeSingle()
      if (!clash) break
      attempt += 1
      newSlug = `${baseSlug}-${attempt}`
    }

    const { data: newTemplate, error: insertError } = await supabase
      .from('contract_templates')
      .insert({
        company_id: auth.companyId,
        name: `${source.name} (cópia)`,
        slug: newSlug,
        currency: source.currency,
        is_gallery_template: false,
        updated_by: auth.userId,
      })
      .select()
      .single()

    if (insertError || !newTemplate) return NextResponse.json({ error: insertError?.message || 'Erro ao duplicar' }, { status: 500 })

    if (fields?.length) {
      await supabase.from('contract_template_fields').insert(
        fields.map((f) => ({
          template_id: newTemplate.id, field_key: f.field_key, label: f.label,
          field_type: f.field_type, required: f.required, options: f.options, display_order: f.display_order,
        }))
      )
    }
    if (clauses?.length) {
      await supabase.from('contract_template_clauses').insert(
        clauses.map((c) => ({ template_id: newTemplate.id, title: c.title, body: c.body, display_order: c.display_order }))
      )
    }
    if (pricingItems?.length) {
      await supabase.from('contract_template_pricing_items').insert(
        pricingItems.map((p) => ({ template_id: newTemplate.id, label: p.label, amount: p.amount, frequency: p.frequency, display_order: p.display_order }))
      )
    }

    return NextResponse.json(newTemplate)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
