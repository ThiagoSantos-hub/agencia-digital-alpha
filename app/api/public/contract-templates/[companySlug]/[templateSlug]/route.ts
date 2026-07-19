import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET público — dados necessários pra renderizar o formulário de proposta,
// sem exigir login. Não inclui o corpo das cláusulas (só título), pra reduzir
// exposição do texto jurídico completo antes do envio do formulário.
export async function GET(_request: NextRequest, { params }: { params: { companySlug: string; templateSlug: string } }) {
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, active')
    .eq('slug', params.companySlug)
    .single()

  if (companyError || !company || !company.active) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
  }

  const { data: template, error: templateError } = await supabase
    .from('contract_templates')
    .select('id, name, currency, active')
    .eq('company_id', company.id)
    .eq('slug', params.templateSlug)
    .eq('active', true)
    .single()

  if (templateError || !template) {
    return NextResponse.json({ error: 'Modelo de contrato não encontrado' }, { status: 404 })
  }

  const [{ data: fields }, { data: clauses }, { data: pricingItems }] = await Promise.all([
    supabase.from('contract_template_fields').select('field_key, label, field_type, required, options, display_order').eq('template_id', template.id).order('display_order'),
    supabase.from('contract_template_clauses').select('title, display_order').eq('template_id', template.id).order('display_order'),
    supabase.from('contract_template_pricing_items').select('label, amount, frequency, display_order').eq('template_id', template.id).order('display_order'),
  ])

  return NextResponse.json({
    companyName: company.name,
    template: { id: template.id, name: template.name, currency: template.currency },
    fields: fields ?? [],
    clauseTitles: (clauses ?? []).map((c) => c.title),
    pricingItems: pricingItems ?? [],
  })
}
