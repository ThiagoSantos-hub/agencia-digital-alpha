import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Marca que o usuário atual já viu a introdução de um módulo. Upsert
// idempotente: chamar de novo pro mesmo módulo não quebra nada.
export async function POST(request: Request) {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { moduleKey } = await request.json()
  if (!moduleKey) return NextResponse.json({ error: 'moduleKey é obrigatório' }, { status: 400 })

  await session
    .from('onboarding_seen')
    .upsert({ user_id: user.id, module_key: moduleKey }, { onConflict: 'user_id,module_key', ignoreDuplicates: true })

  return NextResponse.json({ success: true })
}
