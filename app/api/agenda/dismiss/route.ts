import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getValidAccessToken, deleteCalendarEvent } from '@/lib/agendaCalendar'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { type, id, deleteFromGoogle } = await request.json()
  if (!id || (type !== 'event' && type !== 'email')) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Reunião criada pelo próprio sistema: apaga de verdade no Google Agenda,
  // já que fomos nós que a criamos lá. Qualquer outro item (evento existente
  // antes, convite de terceiro, e-mail) só "some" da nossa tela — não temos
  // (nem devemos ter) poder de apagar algo que não criamos.
  if (type === 'event' && deleteFromGoogle) {
    const { data: row } = await supabase
      .from('personal_integrations')
      .select('access_token, refresh_token, token_expiry, status')
      .eq('user_id', user.id)
      .eq('type', 'google_calendar')
      .maybeSingle()

    if (row?.status === 'connected') {
      const token = await getValidAccessToken(supabase, user.id, 'google_calendar', row)
      if (token) await deleteCalendarEvent(token, id)
    }
  }

  const { error } = await supabase
    .from('agenda_dismissed_items')
    .upsert({ user_id: user.id, item_type: type, item_id: id }, { onConflict: 'user_id,item_type,item_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
