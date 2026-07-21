import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Publica pra qualquer usuario autenticado (admin ou colaborador, de
// qualquer empresa) -- o roadmap "Proximas Atualizacoes" e conteudo global
// da plataforma, nao dado de uma empresa especifica. RLS ja restringe a
// leitura a usuarios autenticados.
export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('roadmap_features')
    .select('id, category, name, description, benefits, how_to_use, problem_solved, status, display_order')
    .order('category', { ascending: true })
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
