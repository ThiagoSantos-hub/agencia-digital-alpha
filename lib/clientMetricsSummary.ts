import type { SupabaseClient } from '@supabase/supabase-js'

// Extraído de app/api/clients/[id]/ai-analysis/route.ts pra ser reaproveitado
// também pelo Squad de Tráfego (app/api/clients/[id]/squad/route.ts), mesmo
// resumo de dados reais do cliente alimentando as duas features de IA.
export async function buildClientMetricsSummary(
  supabase: SupabaseClient,
  clientId: string
): Promise<string> {
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, status')
    .eq('id', clientId)
    .single()

  if (!client) return 'Cliente não encontrado.'

  const hoje = new Date()
  const trintaDiasAtras = new Date(hoje)
  trintaDiasAtras.setDate(hoje.getDate() - 30)
  const sessentaDiasAtras = new Date(hoje)
  sessentaDiasAtras.setDate(hoje.getDate() - 60)
  const corteAtual = trintaDiasAtras.toISOString().slice(0, 10)

  const { data: rows } = await supabase
    .from('client_metrics_daily')
    .select('metric_date, source, impressions, clicks, spend, leads, purchases, followers_count')
    .eq('client_id', clientId)
    .gte('metric_date', sessentaDiasAtras.toISOString().slice(0, 10))

  const somarMeta = (lista: typeof rows) =>
    (lista ?? [])
      .filter((r) => r.source === 'meta_ads')
      .reduce(
        (acc, r) => ({
          impressions: acc.impressions + (r.impressions ?? 0),
          clicks: acc.clicks + (r.clicks ?? 0),
          spend: acc.spend + Number(r.spend ?? 0),
          leads: acc.leads + (r.leads ?? 0),
          purchases: acc.purchases + (r.purchases ?? 0),
        }),
        { impressions: 0, clicks: 0, spend: 0, leads: 0, purchases: 0 }
      )

  const atual = somarMeta((rows ?? []).filter((r) => r.metric_date >= corteAtual))
  const anterior = somarMeta((rows ?? []).filter((r) => r.metric_date < corteAtual))

  const ultimoSeguidores = [...(rows ?? [])]
    .reverse()
    .find((r) => r.source === 'instagram' && r.followers_count != null)?.followers_count ?? null

  const variacao = (a: number, b: number) => (b > 0 ? `${(((a - b) / b) * 100).toFixed(0)}%` : 'sem base de comparação')

  return [
    `Cliente: ${client.name} (status: ${client.status}).`,
    `Últimos 30 dias de Meta Ads: ${atual.impressions} impressões, ${atual.clicks} cliques, R$ ${atual.spend.toFixed(2)} investidos, ${atual.leads} leads, ${atual.purchases} compras.`,
    `30 dias anteriores: ${anterior.impressions} impressões, ${anterior.clicks} cliques, R$ ${anterior.spend.toFixed(2)} investidos, ${anterior.leads} leads, ${anterior.purchases} compras.`,
    `Variação de leads: ${variacao(atual.leads, anterior.leads)}.`,
    ultimoSeguidores != null ? `Seguidores atuais no Instagram: ${ultimoSeguidores}.` : 'Sem dado de seguidores do Instagram no momento.',
  ].join(' ')
}
