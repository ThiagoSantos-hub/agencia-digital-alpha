import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { resolveWhatsAppInstance, sendWhatsAppText } from '@/lib/whatsappSend'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short' })
}

// Reenvia o aviso da reunião pro grupo/número escolhido na criação, 30
// minutos antes do início. Chamado por um workflow n8n agendado a cada 5-10
// minutos (mesmo padrão de autenticação de app/api/cron/check-pix-expiry) —
// a janela de 20-40 min cobre qualquer atraso entre execuções do cron.
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/check-meeting-reminders] CRON_SECRET não configurado')
    return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const agora = Date.now()
  const janelaInicio = new Date(agora + 20 * 60 * 1000).toISOString()
  const janelaFim = new Date(agora + 40 * 60 * 1000).toISOString()

  const { data: pendentes, error } = await supabaseAdmin
    .from('agenda_whatsapp_reminders')
    .select('*')
    .is('lembrete_enviado_em', null)
    .gte('start_at', janelaInicio)
    .lte('start_at', janelaFim)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let enviados = 0
  for (const reminder of pendentes ?? []) {
    const instanceName = await resolveWhatsAppInstance(supabaseAdmin, reminder.user_id, reminder.whatsapp_fonte)
    if (!instanceName) continue

    const linhas = [
      `⏰ Sua reunião começa em 30 minutos: *${reminder.title}*`,
      `🗓 ${formatarDataHora(reminder.start_at)}`,
    ]
    if (reminder.meet_link) linhas.push(`🔗 Videochamada: ${reminder.meet_link}`)

    await sendWhatsAppText(instanceName, reminder.whatsapp_destino, linhas.join('\n'))

    await supabaseAdmin
      .from('agenda_whatsapp_reminders')
      .update({ lembrete_enviado_em: new Date().toISOString() })
      .eq('id', reminder.id)

    enviados++
  }

  return NextResponse.json({ enviados })
}
