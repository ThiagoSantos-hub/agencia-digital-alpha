import { refreshGoogleAccessToken } from '@/lib/googleToken'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AgendaEvent {
  id: string
  title: string
  description: string | null
  start: string | null
  end: string | null
  location: string | null
  meetLink: string | null
  allDay: boolean
  createdBySystem: boolean
}

// Marca, no próprio evento do Google Agenda, que ele foi criado pelo nosso
// sistema (via extendedProperties.private, um campo livre que o Google
// reserva pra esse tipo de metadado). Usado pra decidir se o botão de
// excluir deve apagar o evento de verdade no Google ou só esconder da tela
// (eventos que a pessoa já tinha antes, ou convites de terceiros, nunca são
// apagados de verdade por aqui).
export const CRIADO_PELO_SISTEMA_KEY = 'criado_pelo_sistema'

// Garante um access_token válido pra uma conexão pessoal (Gmail ou Google
// Agenda), renovando via refresh_token quando estiver perto de expirar.
// Compartilhado entre a rota de leitura da Agenda e as rotas de criar
// reunião / enviar e-mail, pra não duplicar essa lógica em cada uma.
export async function getValidAccessToken(
  supabase: SupabaseClient,
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

// Busca eventos do Google Agenda num período arbitrário. Usado tanto pelo
// resumo/dashboard da Agenda (últimos 14 dias) quanto pelo calendário visual
// (mês exibido, que pode ser qualquer período).
export async function fetchCalendarEvents(accessToken: string, timeMin: string, timeMax: string): Promise<AgendaEvent[]> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '100')

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return []
  const data = await res.json()

  return (data.items ?? []).map((item: any) => ({
    id: item.id,
    title: item.summary || '(sem título)',
    description: item.description || null,
    start: item.start?.dateTime || item.start?.date || null,
    end: item.end?.dateTime || item.end?.date || null,
    location: item.location || null,
    meetLink: item.hangoutLink || null,
    allDay: !item.start?.dateTime,
    createdBySystem: item.extendedProperties?.private?.[CRIADO_PELO_SISTEMA_KEY] === 'true',
  }))
}

export async function createCalendarEvent(
  accessToken: string,
  input: {
    title: string
    description?: string
    location?: string
    start: string
    end: string
    attendees?: string[]
    createMeetLink?: boolean
  }
): Promise<{ id: string; meetLink: string | null } | null> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('conferenceDataVersion', '1')
  // sendUpdates=all -> os participantes recebem o convite por e-mail direto do Google
  url.searchParams.set('sendUpdates', 'all')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: input.title,
      description: input.description || undefined,
      location: input.location || undefined,
      start: { dateTime: input.start },
      end: { dateTime: input.end },
      attendees: input.attendees && input.attendees.length > 0 ? input.attendees.map((email) => ({ email })) : undefined,
      conferenceData: input.createMeetLink
        ? { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }
        : undefined,
      extendedProperties: { private: { [CRIADO_PELO_SISTEMA_KEY]: 'true' } },
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return { id: data.id, meetLink: data.hangoutLink ?? null }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.ok || res.status === 410 // 410 = já tinha sido apagado, trata como sucesso
}

export interface AgendaEmail {
  id: string
  subject: string
  from: string
  date: string | null
  snippet: string
  link: string
}

// Usado tanto pelo dashboard da Agenda quanto pelas ferramentas de IA que
// consultam e-mail importante — reaproveita o mesmo critério (marcação
// "Importante" do próprio Gmail, sem gastar IA nisso).
export async function fetchImportantEmails(accessToken: string): Promise<AgendaEmail[]> {
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
