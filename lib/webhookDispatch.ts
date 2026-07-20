// Motor de disparo dos webhooks configurados em /integracoes (tabela `webhooks`,
// até 10 slots por empresa). Até esta implementação, a tela de configuração
// existia e salvava normalmente, mas nada no sistema realmente chamava as URLs
// cadastradas — os eventos do dropdown (cliente.criado, campanha.criada etc.)
// nunca disparavam nada. Esta função é o "motor" que faltava.
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type WebhookEvent =
  | 'cliente.criado'
  | 'cliente.atualizado'
  | 'campanha.criada'
  | 'campanha.atualizada'
  | 'relatorio.gerado'

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  'cliente.criado',
  'cliente.atualizado',
  'campanha.criada',
  'campanha.atualizada',
  'relatorio.gerado',
]

/**
 * Dispara, em paralelo, todos os webhooks ativos da empresa cadastrados pro
 * evento informado. Nunca lança erro pro chamador — falha de entrega num
 * slot não pode derrubar a ação real (criar cliente, sincronizar campanha
 * etc.), só fica registrada no log do servidor.
 */
export async function dispatchWebhook(
  companyId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  if (!companyId) return

  const { data: hooks, error } = await supabaseAdmin
    .from('webhooks')
    .select('id, url, name')
    .eq('company_id', companyId)
    .eq('event', event)
    .eq('active', true)
    .not('url', 'is', null)

  if (error) {
    console.error(`[webhookDispatch] erro ao buscar webhooks pra ${event}:`, error.message)
    return
  }
  if (!hooks || hooks.length === 0) return

  const payload = {
    event,
    company_id: companyId,
    timestamp: new Date().toISOString(),
    data,
  }

  await Promise.allSettled(
    hooks.map(async (hook) => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        const res = await fetch(hook.url as string, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!res.ok) {
          console.error(`[webhookDispatch] slot "${hook.name || hook.id}" respondeu ${res.status} pra ${event}`)
        }
      } catch (err: any) {
        console.error(`[webhookDispatch] falha ao chamar slot "${hook.name || hook.id}" (${event}):`, err.message)
      }
    })
  )
}
