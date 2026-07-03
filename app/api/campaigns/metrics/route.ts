import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { campaignId, metaCampaignId } = await req.json()

    if (!campaignId || !metaCampaignId) {
      return NextResponse.json({ error: 'campaignId e metaCampaignId são obrigatórios' }, { status: 400 })
    }

    const supabase = createServerClient()

    // 1. Buscar token do Meta Ads
    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('type', 'meta_ads')
      .eq('status', 'connected')
      .maybeSingle()

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Meta Ads não conectado' }, { status: 400 })
    }

    // 2. Buscar insights reais da campanha no Meta Ads
    // Campos: impressões, cliques, gasto, alcance, CPM, CPC, CTR, resultado
    const fields = 'impressions,clicks,spend,reach,cpm,cpc,ctr,actions'
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${metaCampaignId}/insights?fields=${fields}&date_preset=last_30d&access_token=${integration.access_token}`
    )

    const metaData = await metaRes.json()

    if (metaData.error) {
      console.error('Erro na API do Meta (insights):', metaData.error)
      return NextResponse.json({ error: metaData.error.message }, { status: 400 })
    }

    const insight = metaData.data?.[0]

    if (!insight) {
      return NextResponse.json({ metrics: [] })
    }

    // 3. Montar métricas no formato CampaignMetric
    const fmtBRL = (v: string) =>
      parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const fmtNum = (v: string) =>
      parseInt(v).toLocaleString('pt-BR')

    const fmtPct = (v: string) =>
      `${parseFloat(v).toFixed(2)}%`

    // Resultado principal (ex: leads, compras, mensagens)
    const resultadoAction = insight.actions?.find(
      (a: any) => ['lead', 'purchase', 'onsite_conversion.messaging_conversation_started_7d', 'offsite_conversion.fb_pixel_lead'].includes(a.action_type)
    )

    const metrics = [
      { key: 'impressions',  label: 'Impressões',    value: insight.impressions ? fmtNum(insight.impressions) : null },
      { key: 'reach',        label: 'Alcance',        value: insight.reach ? fmtNum(insight.reach) : null },
      { key: 'clicks',       label: 'Cliques',        value: insight.clicks ? fmtNum(insight.clicks) : null },
      { key: 'ctr',          label: 'CTR',            value: insight.ctr ? fmtPct(insight.ctr) : null },
      { key: 'spend',        label: 'Gasto Total',    value: insight.spend ? fmtBRL(insight.spend) : null },
      { key: 'cpm',          label: 'CPM',            value: insight.cpm ? fmtBRL(insight.cpm) : null },
      { key: 'cpc',          label: 'CPC',            value: insight.cpc ? fmtBRL(insight.cpc) : null },
      { key: 'resultado',    label: 'Resultados',     value: resultadoAction ? fmtNum(resultadoAction.value) : null },
    ].filter(m => m.value !== null)

    // 4. Salvar no banco para cache (upsert por campaign_id + metric_key)
    const agora = new Date().toISOString()
    for (const m of metrics) {
      await supabase.from('campaign_metrics').upsert({
        campaign_id:   campaignId,
        metric_key:    m.key,
        metric_label:  m.label,
        metric_value:  m.value,
        updated_at:    agora,
      }, { onConflict: 'campaign_id,metric_key' })
    }

    // 5. Retornar no formato CampaignMetric
    const result = metrics.map((m, i) => ({
      id:            `${campaignId}-${m.key}`,
      campaign_id:   campaignId,
      metric_key:    m.key,
      metric_label:  m.label,
      metric_value:  m.value,
      updated_at:    agora,
    }))

    return NextResponse.json({ metrics: result })
  } catch (error: any) {
    console.error('Erro ao buscar métricas Meta Ads:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
