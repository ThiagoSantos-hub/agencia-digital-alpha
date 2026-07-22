import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase-server'
import { resolveWhatsAppInstance, sendWhatsAppText } from '@/lib/whatsappSend'

export const dynamic = 'force-dynamic'

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

  const instanceName = await resolveWhatsAppInstance(supabaseAdmin, user.id, fonte === 'agency' ? 'agency' : 'own')
  if (!instanceName) return NextResponse.json({ success: true })

  const texto = [
    `📋 Nova tarefa: *${taskTitle}*`,
    assigneeName ? `👤 Atribuída a: ${assigneeName}` : null,
  ].filter(Boolean).join('\n')

  await sendWhatsAppText(instanceName, destino, texto)

  return NextResponse.json({ success: true })
}
