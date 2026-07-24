import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveWhatsAppInstance, sendWhatsAppText } from '@/lib/whatsappSend'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Chamado pelo trigger on_task_urgent (Postgres, via pg_net) quando uma tarefa
// entra na prioridade "urgente", manda mais um aviso pelo mesmo grupo/número
// já escolhido pra ela em "Avisar por WhatsApp" na criação. Best effort: erro
// aqui não desfaz nem bloqueia nada, a tarefa já foi salva antes do trigger disparar.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.TASK_URGENT_CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { task_id } = await request.json()
  if (!task_id) return NextResponse.json({ error: 'task_id é obrigatório' }, { status: 400 })

  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('title, due_date, whatsapp_destino, whatsapp_fonte, created_by, assignee:profiles!tasks_assigned_to_fkey(name, email)')
    .eq('id', task_id)
    .maybeSingle()

  if (!task?.whatsapp_destino) return NextResponse.json({ success: true, skipped: 'sem destino configurado' })

  const instanceName = await resolveWhatsAppInstance(supabaseAdmin, task.created_by, task.whatsapp_fonte === 'agency' ? 'agency' : 'own')
  if (!instanceName) return NextResponse.json({ success: true, skipped: 'whatsapp não conectado' })

  const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee
  const texto = [
    `🚨 TAREFA URGENTE`,
    `*${task.title}*`,
    assignee ? `👤 Responsável: ${assignee.name || assignee.email}` : null,
    `📅 Prazo: ${task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}`,
  ].filter(Boolean).join('\n')

  await sendWhatsAppText(instanceName, task.whatsapp_destino, texto)

  await supabaseAdmin.from('tasks').update({ urgente_notificado_at: new Date().toISOString() }).eq('id', task_id)

  return NextResponse.json({ success: true })
}
