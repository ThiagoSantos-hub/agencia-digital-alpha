import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const EVO_URL = process.env.EVOLUTION_API_URL || ''
const EVO_KEY = process.env.EVOLUTION_API_KEY || ''

// Mesmo client de serviço usado em app/api/agenda/meetings/route.ts e
// app/api/whatsapp/groups/route.ts — resolver a instância do ADMIN (fonte
// 'agency') exige ler whatsapp_instances de outro usuário, bloqueado pela
// RLS de sessão do colaborador.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Aviso de tarefa nova por WhatsApp — chamado do front depois que a tarefa já
// foi criada (createTask em hooks/useTasks.ts insere direto via supabase-js,
// não passa por rota de API), best effort: se falhar, não desfaz a tarefa.
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { destino, fonte, taskTitle, assigneeName } = await request.json()
  if (!destino || !taskTitle) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  if (!EVO_URL || !EVO_KEY) return NextResponse.json({ success: true })

  let instanceUserId = user.id
  if (fonte === 'agency') {
    const { data: callerProfile } = await supabaseAdmin.from('profiles').select('company_id').eq('id', user.id).single()
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles').select('id').eq('role', 'admin').eq('company_id', callerProfile?.company_id ?? '').maybeSingle()
    if (adminProfile) instanceUserId = adminProfile.id
  }

  const { data: instance } = await supabaseAdmin
    .from('whatsapp_instances').select('instance_name, status').eq('user_id', instanceUserId).maybeSingle()

  if (!instance || instance.status !== 'connected' || !instance.instance_name) {
    return NextResponse.json({ success: true })
  }

  const texto = [
    `📋 Nova tarefa: *${taskTitle}*`,
    assigneeName ? `👤 Atribuída a: ${assigneeName}` : null,
  ].filter(Boolean).join('\n')

  try {
    await fetch(`${EVO_URL}/message/sendText/${instance.instance_name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVO_KEY },
      body: JSON.stringify({ number: destino, text: texto }),
    })
  } catch (err) {
    console.error('Falha ao enviar aviso de tarefa pelo WhatsApp:', err)
  }

  return NextResponse.json({ success: true })
}
