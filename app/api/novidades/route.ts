import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Publica uma novidade e notifica todo mundo da empresa — o pop-up + som já existem
// (NotificationToasts.tsx escuta INSERT em `notifications` filtrado por user_id), só
// nunca tinha nada gravando lá quando uma novidade era publicada.
export async function POST(request: NextRequest) {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await session.from('profiles').select('role, company_id').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const { titulo, descricao } = await request.json()
    if (!titulo?.trim() || !descricao?.trim()) {
      return NextResponse.json({ error: 'Título e descrição são obrigatórios.' }, { status: 400 })
    }

    const { data: novidade, error: insertError } = await supabaseAdmin
      .from('novidades')
      .insert({ titulo: titulo.trim(), descricao: descricao.trim() })
      .select()
      .single()

    if (insertError || !novidade) {
      return NextResponse.json({ error: insertError?.message || 'Erro ao publicar novidade.' }, { status: 500 })
    }

    const { data: teammates } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('company_id', profile.company_id)

    if (teammates && teammates.length > 0) {
      await supabaseAdmin.from('notifications').insert(
        teammates.map((t) => ({
          user_id: t.id,
          tipo: 'novidade',
          titulo: `📢 ${titulo.trim()}`,
          mensagem: descricao.trim(),
        }))
      )
    }

    return NextResponse.json(novidade)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
