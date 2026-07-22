import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { getValidAccessToken, createCalendarEvent } from '@/lib/agendaCalendar'

export const dynamic = 'force-dynamic'

const EVO_URL = process.env.EVOLUTION_API_URL || ''
const EVO_KEY = process.env.EVOLUTION_API_KEY || ''

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
  title: string
  start: string
  location?: string
  meetLink?: string
}) {
  if (!EVO_URL || !EVO_KEY) return

  let instanceUserId = params.callerId
  if (params.fonte === 'agency') {
    const { data: callerProfile } = await supabaseAdmin.from('profiles').select('company_id').eq('id', params.callerId).single()
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles').select('id').eq('role', 'admin').eq('company_id', callerProfile?.company_id ?? '').maybeSingle()
    if (!adminProfile) return
    instanceUserId = adminProfile.id
  }

  const { data: instance } = await supabaseAdmin
    .from('whatsapp_instances').select('instance_name, status').eq('user_id', instanceUserId).maybeSingle()
  if (!instance || instance.status !== 'connected' || !instance.instance_name) return

  const linhas = [
    `📅 Nova reunião agendada: *${params.title}*`,
    `🗓 ${formatarDataHora(params.start)}`,
  ]
  if (params.meetLink) linhas.push(`🔗 Videochamada: ${params.meetLink}`)
  if (params.location) linhas.push(`📍 ${params.location}`)

  try {
    await fetch(`${EVO_URL}/message/sendText/${instance.instance_name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVO_KEY },
      body: JSON.stringify({ number: params.destino, text: linhas.join('\n') }),
    })
  } catch (err) {
    console.error('Falha ao enviar aviso de reunião pelo WhatsApp:', err)
  }
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
    await avisarWhatsApp({
      callerId: user.id,
      fonte: whatsappFonte === 'agency' ? 'agency' : 'own',
      destino: whatsappDestino,
      title,
      start,
      location: location || undefined,
      meetLink: created.meetLink || undefined,
    })
  }

  return NextResponse.json({ success: true, id: created.id, meetLink: created.meetLink })
}
