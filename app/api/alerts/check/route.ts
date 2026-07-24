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
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[alerts/check] CRON_SECRET não configurado')
    return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

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
      if (alert.tipo === 'fundo_cliente') {
        if (!alert.client_id || !alert.proximo_vencimento) {
          results.push({ id: alert.id, nome: alert.nome, status: 'skip', detail: 'Fundo sem cliente ou data configurada' })
          continue
        }

        const hojeStr = new Date().toISOString().split('T')[0]
        const vencido = alert.proximo_vencimento <= hojeStr
        if (!vencido) {
          results.push({ id: alert.id, nome: alert.nome, status: 'ok' })
          continue
        }

        // Só dispara a partir do horário escolhido pro lembrete (o cron roda
        // de hora em hora, sem isso o primeiro aviso do dia saía a qualquer
        // hora em que o cron passasse por aqui, mesmo de madrugada).
        const agoraBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
        const horaAtual = `${String(agoraBR.getHours()).padStart(2, '0')}:${String(agoraBR.getMinutes()).padStart(2, '0')}`
        const horarioConfigurado = alert.horario_envio || '00:00'
        if (horaAtual < horarioConfigurado) {
          results.push({ id: alert.id, nome: alert.nome, status: 'aguardando_horario' })
          continue
        }

        // Sem data de vencimento por dia: repete o aviso a cada 24h enquanto
        // continuar vencido, até o admin marcar "fundo colocado" (que reseta
        // last_triggered_at). Sem esse controle o cron reenviaria a cada
        // execução, e com ele sozinho (sem o "!vencido" acima) nunca pararia
        // de mandar mensagem mesmo depois de resolvido.
        const passou24h = !alert.last_triggered_at ||
          (Date.now() - new Date(alert.last_triggered_at).getTime()) >= 24 * 60 * 60 * 1000
        if (!passou24h) {
          results.push({ id: alert.id, nome: alert.nome, status: 'aguardando_proximo_lembrete' })
          continue
        }

        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', alert.user_id).single()
        const { data: client } = await supabase.from('clients').select('name').eq('id', alert.client_id).maybeSingle()

        // Mesmo limite mensal de disparos do plano usado pelos alertas de saldo/erro.
        let dentroDoLimite = true
        if (profile?.company_id) {
          const { data: company } = await supabase.from('companies').select('plan').eq('id', profile.company_id).maybeSingle()
          const { data: planRow } = company?.plan
            ? await supabase.from('plans').select('monthly_alerts_limit').eq('id', company.plan).maybeSingle()
            : { data: null }
          const limite = planRow?.monthly_alerts_limit ?? null

          if (limite !== null) {
            const inicioMes = new Date()
            inicioMes.setDate(1)
            inicioMes.setHours(0, 0, 0, 0)
            const { count } = await supabase
              .from('alert_triggers')
              .select('id', { count: 'exact', head: true })
              .eq('company_id', profile.company_id)
              .gte('triggered_at', inicioMes.toISOString())
            dentroDoLimite = (count ?? 0) < limite
          }
        }

        await supabase.from('alerts').update({
          last_status: 'triggered',
          last_triggered_at: new Date().toISOString(),
        }).eq('id', alert.id)

        if (!dentroDoLimite) {
          results.push({ id: alert.id, nome: alert.nome, status: 'limite_plano_atingido' })
          continue
        }

        const tokenValues: Record<string, string> = {
          '<CLIENTE>': client?.name ?? 'Cliente',
          '<VALOR>': Number(alert.valor_fundo ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          '<VENCIMENTO>': new Date(`${alert.proximo_vencimento}T00:00:00`).toLocaleDateString('pt-BR'),
          '<PAGAMENTO>': alert.forma_pagamento === 'boleto' ? 'Boleto' : alert.forma_pagamento === 'pix' ? 'Pix' : '—',
        }
        let mensagem = alert.mensagem_template
        for (const [token, valor] of Object.entries(tokenValues)) mensagem = mensagem.replaceAll(token, valor)

        // No dia exato do vencimento manda o lembrete normal; a partir do dia
        // seguinte (ainda não marcado como colocado) cada reenvio de 24h em
        // 24h deixa claro que já passou do prazo.
        const atrasado = alert.proximo_vencimento < hojeStr
        if (atrasado) mensagem = `⚠️ VENCIDO\n\n${mensagem}`

        const sendResult = await sendWhatsApp(alert.user_id, alert.recebedor_numero, mensagem)

        if (profile?.company_id) {
          await supabase.from('alert_triggers').insert({ alert_id: alert.id, company_id: profile.company_id })
        }

        triggeredCount++
        results.push({ id: alert.id, nome: alert.nome, status: sendResult.sent ? 'disparado' : 'disparo_falhou', detail: sendResult.reason })
        continue
      }

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
        // Limite mensal de alertas do plano: conta quantos alert_triggers essa
        // empresa já teve esse mês antes de decidir se dispara mais um.
        let dentroDoLimite = true
        if (profile?.company_id) {
          const { data: company } = await supabase.from('companies').select('plan').eq('id', profile.company_id).maybeSingle()
          const { data: planRow } = company?.plan
            ? await supabase.from('plans').select('monthly_alerts_limit').eq('id', company.plan).maybeSingle()
            : { data: null }
          const limite = planRow?.monthly_alerts_limit ?? null

          if (limite !== null) {
            const inicioMes = new Date()
            inicioMes.setDate(1)
            inicioMes.setHours(0, 0, 0, 0)
            const { count } = await supabase
              .from('alert_triggers')
              .select('id', { count: 'exact', head: true })
              .eq('company_id', profile.company_id)
              .gte('triggered_at', inicioMes.toISOString())
            dentroDoLimite = (count ?? 0) < limite
          }
        }

        // Sempre marca last_status='triggered', mesmo acima do limite — senão
        // o cron acha que é transição nova a cada execução e tenta nesse
        // incidente antigo de novo assim que o mês virar.
        await supabase.from('alerts').update({
          last_status: 'triggered',
          last_triggered_at: new Date().toISOString(),
        }).eq('id', alert.id)

        if (!dentroDoLimite) {
          results.push({ id: alert.id, nome: alert.nome, status: 'limite_plano_atingido' })
          continue
        }

        let mensagem = alert.mensagem_template
        for (const [token, valor] of Object.entries(tokenValues)) mensagem = mensagem.replaceAll(token, valor)

        const sendResult = await sendWhatsApp(alert.user_id, alert.recebedor_numero, mensagem)

        if (profile?.company_id) {
          await supabase.from('alert_triggers').insert({ alert_id: alert.id, company_id: profile.company_id })
        }

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
