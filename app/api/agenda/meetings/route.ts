import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { getValidAccessToken, createCalendarEvent } from '@/lib/agendaCalendar'
import { resolveWhatsAppInstance, sendWhatsAppText } from '@/lib/whatsappSend'

export const dynamic = 'force-dynamic'

// Mesmo client de serviço usado em app/api/whatsapp/groups/route.ts — resolver a
// instância do ADMIN (fonte 'agency') exige ler whatsapp_instances de outro
// usuário, o que a RLS de sessão do colaborador bloqueia.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short' })
}

// Manda um aviso de texto sobre a reunião pro grupo/número escolhido — best
// effort, não impede a reunião de ser criada se o WhatsApp falhar.
async function avisarWhatsApp(params: {
  callerId: string
  fonte: 'own' | 'agency'
  destino: string
  eventId: string
  title: string
  description?: string
  start: string
  location?: string
  meetLink?: string
}) {
  const instanceName = await resolveWhatsAppInstance(supabaseAdmin, params.callerId, params.fonte)
  if (!instanceName) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sistema.digitalalpha.store'
  const linkSistema = `${appUrl}/agenda?evento=${encodeURIComponent(params.eventId)}&data=${encodeURIComponent(params.start)}`

  const linhas = [
    `📅 Nova reunião agendada: *${params.title}*`,
    `🗓 ${formatarDataHora(params.start)}`,
  ]
  if (params.location) linhas.push(`📍 ${params.location}`)
  // Pauta vira o resumo da mensagem em vez de só os dados soltos, assim dá
  // pra entender do que se trata a reunião sem abrir o sistema.
  if (params.description) linhas.push('', '📝 *Pauta:*', params.description)
  if (params.meetLink) linhas.push('', `🔗 Videochamada: ${params.meetLink}`)
  linhas.push('', `👉 Ver detalhes no sistema: ${linkSistema}`)

  await sendWhatsAppText(instanceName, params.destino, linhas.join('\n'))
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { title, description, location, start, end, attendees, createMeetLink, whatsappDestino, whatsappFonte } = await request.json()
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

  if (whatsappDestino) {
    const fonte = whatsappFonte === 'agency' ? 'agency' : 'own'

    await avisarWhatsApp({
      callerId: user.id,
      fonte,
      destino: whatsappDestino,
      eventId: created.id,
      title,
      description: description || undefined,
      start,
      location: location || undefined,
      meetLink: created.meetLink || undefined,
    })

    // Guarda pro cron reenviar o link 30 minutos antes do início.
    await supabaseAdmin.from('agenda_whatsapp_reminders').insert({
      user_id: user.id,
      event_id: created.id,
      title,
      start_at: start,
      meet_link: created.meetLink || null,
      whatsapp_destino: whatsappDestino,
      whatsapp_fonte: fonte,
    })
  }

  return NextResponse.json({ success: true, id: created.id, meetLink: created.meetLink })
}
