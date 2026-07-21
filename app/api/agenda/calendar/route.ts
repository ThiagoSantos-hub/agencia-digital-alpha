import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getValidAccessToken, fetchCalendarEvents } from '@/lib/agendaCalendar'

export const dynamic = 'force-dynamic'

// Usado pelo calendário visual (mês exibido) — diferente da rota principal
// da Agenda, que sempre olha só os próximos 14 dias pro resumo/dashboard.
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) return NextResponse.json({ error: 'Período obrigatório' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'collaborator') {
    const { data: collaborator } = await supabase
      .from('collaborators')
      .select('agenda_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
    if (collaborator && collaborator.agenda_enabled === false) {
      return NextResponse.json({ error: 'Seu administrador desativou o acesso à Agenda pra você.' }, { status: 403 })
    }
  }

  const { data: row } = await supabase
    .from('personal_integrations')
    .select('access_token, refresh_token, token_expiry, status')
    .eq('user_id', user.id)
    .eq('type', 'google_calendar')
    .maybeSingle()

  if (!row || row.status !== 'connected') {
    return NextResponse.json({ events: [] })
  }

  const token = await getValidAccessToken(supabase, user.id, 'google_calendar', row)
  if (!token) return NextResponse.json({ events: [] })

  let events = await fetchCalendarEvents(token, from, to)

  const { data: dismissed } = await supabase
    .from('agenda_dismissed_items')
    .select('item_id')
    .eq('user_id', user.id)
    .eq('item_type', 'event')

  const dismissedIds = new Set((dismissed ?? []).map((d) => d.item_id))
  events = events.filter((e) => !dismissedIds.has(e.id))

  return NextResponse.json({ events })
}
