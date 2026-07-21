import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { refreshGoogleAccessToken } from '@/lib/googleToken'
import { OpenAIProvider } from '@/lib/ai/providers/openai.provider'

export const dynamic = 'force-dynamic'

interface AgendaEvent {
  id: string
  title: string
  start: string | null
  end: string | null
  location: string | null
  meetLink: string | null
  allDay: boolean
}

interface AgendaEmail {
  id: string
  subject: string
  from: string
  date: string | null
  snippet: string
  link: string
}

async function getValidAccessToken(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  type: 'gmail' | 'google_calendar',
  row: { access_token: string | null; refresh_token: string | null; token_expiry: string | null }
): Promise<string | null> {
  if (!row.access_token) return null
  const expired = !row.token_expiry || new Date(row.token_expiry).getTime() < Date.now() + 60_000
  if (!expired) return row.access_token

  if (!row.refresh_token) return null
  const refreshed = await refreshGoogleAccessToken(row.refresh_token)
  if (!refreshed) return null

  await supabase
    .from('personal_integrations')
    .update({
      access_token: refreshed.accessToken,
      token_expiry: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('type', type)

  return refreshed.accessToken
}

async function fetchCalendarEvents(accessToken: string): Promise<AgendaEvent[]> {
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '20')

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return []
  const data = await res.json()

  return (data.items ?? []).map((item: any) => ({
    id: item.id,
    title: item.summary || '(sem título)',
    start: item.start?.dateTime || item.start?.date || null,
    end: item.end?.dateTime || item.end?.date || null,
    location: item.location || null,
    meetLink: item.hangoutLink || null,
    allDay: !item.start?.dateTime,
  }))
}

async function fetchImportantEmails(accessToken: string): Promise<AgendaEmail[]> {
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  listUrl.searchParams.set('q', 'is:important')
  listUrl.searchParams.set('maxResults', '10')

  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!listRes.ok) return []
  const listData = await listRes.json()
  const ids: string[] = (listData.messages ?? []).map((m: any) => m.id)
  if (ids.length === 0) return []

  const emails = await Promise.all(
    ids.map(async (id) => {
      const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`)
      url.searchParams.set('format', 'metadata')
      url.searchParams.append('metadataHeaders', 'Subject')
      url.searchParams.append('metadataHeaders', 'From')
      url.searchParams.append('metadataHeaders', 'Date')

      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) return null
      const msg = await res.json()
      const headers: { name: string; value: string }[] = msg.payload?.headers ?? []
      const getHeader = (name: string) => headers.find((h) => h.name === name)?.value ?? ''

      return {
        id,
        subject: getHeader('Subject') || '(sem assunto)',
        from: getHeader('From'),
        date: getHeader('Date') || null,
        snippet: msg.snippet || '',
        link: `https://mail.google.com/mail/u/0/#inbox/${id}`,
      } as AgendaEmail
    })
  )

  return emails.filter((e): e is AgendaEmail => e !== null)
}

async function gerarResumoIA(events: AgendaEvent[], emails: AgendaEmail[]): Promise<string | null> {
  if (events.length === 0 && emails.length === 0) return null
  if (!process.env.OPENAI_API_KEY) return null

  try {
    const provider = new OpenAIProvider('gpt-4o-mini')
    const contexto = [
      events.length > 0
        ? `Reuniões e eventos dos próximos 14 dias:\n${events.map((e) => `- ${e.title}${e.start ? ` em ${e.start}` : ''}${e.location ? ` (${e.location})` : ''}`).join('\n')}`
        : 'Sem reuniões ou eventos nos próximos 14 dias.',
      emails.length > 0
        ? `E-mails importantes recentes:\n${emails.map((e) => `- De ${e.from}: "${e.subject}"`).join('\n')}`
        : 'Sem e-mails importantes recentes.',
    ].join('\n\n')

    const response = await provider.chat({
      messages: [
        {
          role: 'system',
          content: 'Você resume a agenda e os e-mails importantes de um usuário de um sistema de gestão de agências de marketing. Escreva um resumo curto, direto e natural em português, de 2 a 4 frases, sem travessão, destacando o que mais precisa de atenção primeiro.',
        },
        { role: 'user', content: contexto },
      ],
      maxTokens: 220,
      temperature: 0.5,
    })
    return response.text || null
  } catch {
    return null
  }
}

export async function GET() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

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

  const { data: rows } = await supabase
    .from('personal_integrations')
    .select('type, status, access_token, refresh_token, token_expiry, connected_email')
    .eq('user_id', user.id)

  const calendarRow = rows?.find((r) => r.type === 'google_calendar')
  const gmailRow = rows?.find((r) => r.type === 'gmail')

  const calendarConnected = calendarRow?.status === 'connected'
  const gmailConnected = gmailRow?.status === 'connected'

  let events: AgendaEvent[] = []
  let emails: AgendaEmail[] = []

  if (calendarConnected && calendarRow) {
    const token = await getValidAccessToken(supabase, user.id, 'google_calendar', calendarRow)
    if (token) events = await fetchCalendarEvents(token)
  }

  if (gmailConnected && gmailRow) {
    const token = await getValidAccessToken(supabase, user.id, 'gmail', gmailRow)
    if (token) emails = await fetchImportantEmails(token)
  }

  const { data: dismissed } = await supabase
    .from('agenda_dismissed_items')
    .select('item_type, item_id')
    .eq('user_id', user.id)

  const dismissedEvents = new Set((dismissed ?? []).filter((d) => d.item_type === 'event').map((d) => d.item_id))
  const dismissedEmails = new Set((dismissed ?? []).filter((d) => d.item_type === 'email').map((d) => d.item_id))
  events = events.filter((e) => !dismissedEvents.has(e.id))
  emails = emails.filter((e) => !dismissedEmails.has(e.id))

  const resumoIA = await gerarResumoIA(events, emails)

  return NextResponse.json({
    calendarConnected,
    gmailConnected,
    connectedEmailCalendar: calendarRow?.connected_email ?? null,
    connectedEmailGmail: gmailRow?.connected_email ?? null,
    events,
    emails,
    resumoIA,
  })
}
