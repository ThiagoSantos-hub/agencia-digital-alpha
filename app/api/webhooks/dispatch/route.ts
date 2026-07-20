import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { dispatchWebhook, WEBHOOK_EVENTS, type WebhookEvent } from '@/lib/webhookDispatch'

// Ponte pra hooks do navegador (useClientes, useCampanhas) dispararem um evento
// depois de uma ação bem-sucedida — eles escrevem direto no Supabase (sem API
// route própria), então precisam desse endpoint pra acionar o motor de webhooks
// (que usa a service-role key, nunca exposta ao client). A empresa é sempre
// resolvida pela sessão, nunca aceita do corpo da requisição.
export async function POST(request: Request) {
  const session = createServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await session.from('profiles').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 403 })

  const { event, data } = await request.json()
  if (!WEBHOOK_EVENTS.includes(event as WebhookEvent)) {
    return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })
  }

  await dispatchWebhook(profile.company_id, event as WebhookEvent, data ?? {})
  return NextResponse.json({ success: true })
}
