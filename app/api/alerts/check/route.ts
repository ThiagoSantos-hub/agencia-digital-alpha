import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EVO_URL = process.env.EVOLUTION_API_URL || ''
const EVO_KEY = process.env.EVOLUTION_API_KEY || ''

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function instanceName(userId: string) {
  return `alpha_${userId.replace(/-/g, '').slice(0, 16)}`
}

// account_status da Meta Marketing API — 1 é a única situação "normal";
// https://developers.facebook.com/docs/marketing-api/reference/ad-account/#fields
const META_ACCOUNT_STATUS_LABELS: Record<number, string> = {
  1: 'Ativa',
  2: 'Desabilitada',
  3: 'Não liquidada (unsettled)',
  7: 'Em revisão de risco',
  8: 'Pendente de liquidação',
  9: 'Em período de carência',
  100: 'Pendente de fechamento',
  101: 'Fechada',
}

interface MetaAccountData {
  name?: string
  balance?: string
  account_status?: number
  disable_reason?: number
  currency?: string
  error?: { message?: string }
}

async function sendWhatsApp(userId: string, recebedorNumero: string, mensagem: string) {
  if (!EVO_URL || !EVO_KEY) return { sent: false, reason: 'Evolution API não configurada' }

  const { data: wpInstance } = await supabase
    .from('whatsapp_instances')
    .select('instance_name, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (!wpInstance || wpInstance.status !== 'connected' || !wpInstance.instance_name) {
    return { sent: false, reason: 'WhatsApp do usuário não conectado' }
  }

  const res = await fetch(`${EVO_URL}/message/sendText/${wpInstance.instance_name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EVO_KEY },
    body: JSON.stringify({ number: recebedorNumero, text: mensagem }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || data?.error) return { sent: false, reason: data?.message || 'Falha na Evolution API' }
  return { sent: true }
}

// Verifica todos os alertas ativos de Meta Ads (saldo mínimo / erro na conta) e dispara
// WhatsApp quando a condição bate — pensado pra ser chamado periodicamente por um
// Schedule Trigger no n8n (POST sem corpo), mesmo modelo do /api/reports/send.
//
// NOTA sobre o campo "balance": a Graph API não tem um único campo universal de "saldo
// disponível" — em contas pré-pagas ele costuma refletir o valor já gasto e ainda não
// cobrado, não o crédito restante. Confirmar contra o tipo de conta real do cliente antes
// de confiar cegamente no alerta de saldo mínimo (mesmo cuidado já sinalizado pra Autentique
// e Assinafy nesta sessão: comportamento de API de terceiro que não dá pra testar sem uma
// conta real).
export async function POST() {
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('ativo', true)
    .eq('canal', 'meta')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!alerts || alerts.length === 0) return NextResponse.json({ checked: 0, triggered: 0 })

  let triggeredCount = 0
  const results: Array<{ id: string; nome: string; status: string; detail?: string }> = []

  for (const alert of alerts) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', alert.user_id)
        .single()

      const { data: integration } = await supabase
        .from('integrations')
        .select('access_token')
        .eq('company_id', profile?.company_id ?? '')
        .eq('type', 'meta_ads')
        .eq('status', 'connected')
        .maybeSingle()

      if (!integration?.access_token) {
        results.push({ id: alert.id, nome: alert.nome, status: 'skip', detail: 'Meta Ads não conectado' })
        continue
      }

      const fields = 'name,balance,account_status,disable_reason,currency'
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${alert.conta_anuncio}?fields=${fields}&access_token=${integration.access_token}`
      )
      const metaData: MetaAccountData = await metaRes.json()

      if (!metaRes.ok || metaData.error) {
        results.push({ id: alert.id, nome: alert.nome, status: 'erro_api', detail: metaData.error?.message })
        continue
      }

      let isTriggered = false
      let tokenValues: Record<string, string> = {}

      if (alert.tipo === 'saldo_minimo') {
        const saldoAtual = Number(metaData.balance ?? 0) / 100
        isTriggered = saldoAtual <= Number(alert.saldo_minimo ?? 0)
        tokenValues = {
          '<CA>': metaData.name ?? alert.conta_anuncio,
          '<SALDO>': saldoAtual.toLocaleString('pt-BR', { style: 'currency', currency: metaData.currency || 'BRL' }),
          '<TARGET>': Number(alert.saldo_minimo ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: metaData.currency || 'BRL' }),
        }
      } else {
        const status = metaData.account_status ?? 1
        isTriggered = status !== 1
        tokenValues = {
          '<CA>': metaData.name ?? alert.conta_anuncio,
          '<ACT_STATUS>': String(status),
          '<STATUS_DESCRIPTION>': META_ACCOUNT_STATUS_LABELS[status] ?? `Status ${status}`,
        }
      }

      await supabase.from('alerts').update({ last_checked_at: new Date().toISOString() }).eq('id', alert.id)

      if (isTriggered && alert.last_status !== 'triggered') {
        let mensagem = alert.mensagem_template
        for (const [token, valor] of Object.entries(tokenValues)) mensagem = mensagem.replaceAll(token, valor)

        const sendResult = await sendWhatsApp(alert.user_id, alert.recebedor_numero, mensagem)

        await supabase.from('alerts').update({
          last_status: 'triggered',
          last_triggered_at: new Date().toISOString(),
        }).eq('id', alert.id)

        triggeredCount++
        results.push({ id: alert.id, nome: alert.nome, status: sendResult.sent ? 'disparado' : 'disparo_falhou', detail: sendResult.reason })
      } else if (!isTriggered && alert.last_status === 'triggered') {
        await supabase.from('alerts').update({ last_status: 'ok' }).eq('id', alert.id)
        results.push({ id: alert.id, nome: alert.nome, status: 'normalizado' })
      } else {
        results.push({ id: alert.id, nome: alert.nome, status: isTriggered ? 'ja_disparado' : 'ok' })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      results.push({ id: alert.id, nome: alert.nome, status: 'erro', detail: message })
    }
  }

  return NextResponse.json({ checked: alerts.length, triggered: triggeredCount, results })
}
