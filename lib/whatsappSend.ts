import { SupabaseClient } from '@supabase/supabase-js'

const EVO_URL = process.env.EVOLUTION_API_URL || ''
const EVO_KEY = process.env.EVOLUTION_API_KEY || ''

// Resolve qual whatsapp_instances usar pra mandar uma mensagem: 'own' é a do
// próprio usuário, 'agency' é a do admin da mesma empresa (mesmo padrão já
// usado em app/api/whatsapp/groups/route.ts). Recebe um client de SERVICE
// ROLE, já que ler a instância de outro usuário (fonte 'agency') é bloqueado
// pela RLS de sessão normal.
export async function resolveWhatsAppInstance(
  supabaseAdmin: SupabaseClient,
  callerId: string,
  fonte: 'own' | 'agency'
): Promise<string | null> {
  let instanceUserId = callerId
  if (fonte === 'agency') {
    const { data: callerProfile } = await supabaseAdmin.from('profiles').select('company_id').eq('id', callerId).single()
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles').select('id').eq('role', 'admin').eq('company_id', callerProfile?.company_id ?? '').maybeSingle()
    if (!adminProfile) return null
    instanceUserId = adminProfile.id
  }

  const { data: instance } = await supabaseAdmin
    .from('whatsapp_instances').select('instance_name, status').eq('user_id', instanceUserId).maybeSingle()
  if (!instance || instance.status !== 'connected' || !instance.instance_name) return null

  return instance.instance_name
}

// Best effort — quem chama decide se um erro aqui deve ou não bloquear o
// fluxo principal (em geral não deve).
export async function sendWhatsAppText(instanceName: string, destino: string, texto: string): Promise<void> {
  if (!EVO_URL || !EVO_KEY) return
  try {
    await fetch(`${EVO_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVO_KEY },
      body: JSON.stringify({ number: destino, text: texto }),
    })
  } catch (err) {
    console.error('Falha ao enviar mensagem pelo WhatsApp:', err)
  }
}
