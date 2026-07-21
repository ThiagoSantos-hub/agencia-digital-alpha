import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getValidAccessToken, createCalendarEvent } from '@/lib/agendaCalendar'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { title, description, location, start, end, attendees, createMeetLink } = await request.json()
  if (!title || !start || !end) {
    return NextResponse.json({ error: 'Título, início e fim são obrigatórios.' }, { status: 400 })
  }
  const attendeeEmails: string[] = Array.isArray(attendees) ? attendees.filter((e: unknown) => typeof e === 'string' && e.includes('@')) : []

  const { data: row } = await supabase
    .from('personal_integrations')
    .select('access_token, refresh_token, token_expiry, status')
    .eq('user_id', user.id)
    .eq('type', 'google_calendar')
    .maybeSingle()

  if (!row || row.status !== 'connected') {
    return NextResponse.json({ error: 'Conecte o Google Agenda antes de criar uma reunião.' }, { status: 400 })
  }

  const token = await getValidAccessToken(supabase, user.id, 'google_calendar', row)
  if (!token) {
    return NextResponse.json({ error: 'Não foi possível renovar o acesso ao Google Agenda. Reconecte na tela de Agenda.' }, { status: 400 })
  }

  const created = await createCalendarEvent(token, {
    title,
    description,
    location,
    start,
    end,
    attendees: attendeeEmails,
    createMeetLink: !!createMeetLink,
  })
  if (!created) {
    return NextResponse.json({ error: 'Erro ao criar a reunião no Google Agenda.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: created.id, meetLink: created.meetLink })
}
