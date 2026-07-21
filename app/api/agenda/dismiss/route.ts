import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { type, id } = await request.json()
  if (!id || (type !== 'event' && type !== 'email')) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { error } = await supabase
    .from('agenda_dismissed_items')
    .upsert({ user_id: user.id, item_type: type, item_id: id }, { onConflict: 'user_id,item_type,item_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
