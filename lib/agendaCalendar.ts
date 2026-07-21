import { refreshGoogleAccessToken } from '@/lib/googleToken'
import type { createServerClient } from '@/lib/supabase-server'

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

export async function createCalendarEvent(
  accessToken: string,
  input: { title: string; description?: string; location?: string; start: string; end: string }
): Promise<{ id: string } | null> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
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
      extendedProperties: { private: { [CRIADO_PELO_SISTEMA_KEY]: 'true' } },
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return { id: data.id }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.ok || res.status === 410 // 410 = já tinha sido apagado, trata como sucesso
}
