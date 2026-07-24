import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDailyAdAccountInsights, getInstagramRawMetrics } from '@/lib/metaInsights'

// Chamada só pelo cron do Postgres (20260801_client_growth_tracking.sql,
// disparar_snapshot_metricas_clientes), nunca pelo navegador, por isso o
// único caminho de autenticação é o segredo do Vault, sem sessão de usuário.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CLIENT_METRICS_CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const doisDiasAtras = new Date(hoje)
  doisDiasAtras.setDate(hoje.getDate() - 2)
  // Janela de 2 dias (não só "ontem"): margem de segurança contra uma
  // execução perdida do cron, sem duplicar linhas (upsert por dia).
  const dateStart = formatDate(doisDiasAtras)
  const dateEnd = formatDate(hoje)

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, company_id, meta_ad_account_id')
    .not('meta_ad_account_id', 'is', null)
    .neq('status', 'inativo')

  if (clientsError) {
    return NextResponse.json({ error: clientsError.message }, { status: 500 })
  }

  let clientesProcessados = 0
  let clientesComErro = 0

  for (const client of clients ?? []) {
    try {
      const { data: integration } = await supabase
        .from('integrations')
        .select('access_token')
        .eq('company_id', client.company_id)
        .eq('type', 'meta_ads')
        .eq('status', 'connected')
        .maybeSingle()

      if (!integration?.access_token || !client.meta_ad_account_id) continue

      const dias = await getDailyAdAccountInsights(client.meta_ad_account_id, integration.access_token, dateStart, dateEnd)
      for (const dia of dias) {
        await supabase.from('client_metrics_daily').upsert({
          client_id: client.id,
          metric_date: dia.date,
          source: 'meta_ads',
          impressions: dia.impressions,
          reach: dia.reach,
          clicks: dia.clicks,
          spend: dia.spend,
          leads: dia.leads,
          purchases: dia.purchases,
        }, { onConflict: 'client_id,metric_date,source' })
      }

      const ig = await getInstagramRawMetrics(client.meta_ad_account_id, integration.access_token, dateStart, dateEnd)
      if (ig.igAccountId) {
        await supabase.from('client_metrics_daily').upsert({
          client_id: client.id,
          metric_date: dateEnd,
          source: 'instagram',
          followers_count: ig.followersCount,
          profile_views: ig.profileViews,
        }, { onConflict: 'client_id,metric_date,source' })
      }

      clientesProcessados++
    } catch (err) {
      console.error(`[metrics-snapshot] falha no cliente ${client.id}:`, err)
      clientesComErro++
    }
  }

  return NextResponse.json({ clientesProcessados, clientesComErro, total: clients?.length ?? 0 })
}
