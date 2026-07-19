import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET — lista os modelos da galeria (exemplos prontos pra duplicar), visível
// pra qualquer usuário autenticado, independente da empresa.
export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: templates, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('is_gallery_template', true)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const templateIds = (templates ?? []).map((t) => t.id)
  const { data: clauseCounts } = await supabase
    .from('contract_template_clauses')
    .select('template_id')
    .in('template_id', templateIds.length ? templateIds : ['00000000-0000-0000-0000-000000000000'])

  const counts: Record<string, number> = {}
  for (const row of clauseCounts ?? []) {
    counts[row.template_id] = (counts[row.template_id] ?? 0) + 1
  }

  return NextResponse.json((templates ?? []).map((t) => ({ ...t, clause_count: counts[t.id] ?? 0 })))
}
