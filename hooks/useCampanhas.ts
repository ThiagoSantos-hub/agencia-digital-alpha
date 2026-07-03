import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Todas as métricas disponíveis no Meta Ads
export const ALL_META_METRICS = [
  { key: 'impressions',                           label: 'Impressões'           },
  { key: 'reach',                                 label: 'Alcance'              },
  { key: 'clicks',                                label: 'Cliques'              },
  { key: 'ctr',                                   label: 'CTR'                  },
  { key: 'spend',                                 label: 'Gasto Total'          },
  { key: 'cpm',                                   label: 'CPM'                  },
  { key: 'cpc',                                   label: 'CPC'                  },
  { key: 'frequency',                             label: 'Frequência'           },
  { key: 'actions_lead',                          label: 'Leads'                },
  { key: 'actions_purchase',                      label: 'Compras'              },
  { key: 'actions_whatsapp',                      label: 'Mensagens WhatsApp'   },
  { key: 'actions_link_click',                    label: 'Cliques no Link'      },
  { key: 'actions_page_engagement',               label: 'Engajamento'          },
  { key: 'actions_post_engagement',               label: 'Engajamento no Post'  },
  { key: 'actions_video_view',                    label: 'Visualizações de Vídeo'},
  { key: 'actions_omni_purchase',                 label: 'Compras (Omni)'       },
  { key: 'cost_per_action_lead',                  label: 'Custo por Lead'       },
  { key: 'cost_per_action_purchase',              label: 'Custo por Compra'     },
  { key: 'cost_per_action_whatsapp',              label: 'Custo por WhatsApp'   },
]

export async function GET() {
  return NextResponse.json({ metrics: ALL_META_METRICS })
}

export async function POST(req: Request) {
  try {
    const { campaignId, metaCampaignId, selectedMetrics, dateStart, dateEnd } = await req.json()

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

    // 2. Montar período — padrão últimos 30 dias
    const hoje = new Date()
    const trintaDiasAtras = new Date(hoje)
    trintaDiasAtras.setDate(hoje.getDate() - 30)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const inicio = dateStart || fmt(trintaDiasAtras)
    const fim    = dateEnd   || fmt(hoje)

    // 3. Buscar insights da campanha no Meta Ads com período customizado
    const fields = 'impressions,reach,clicks,ctr,spend,cpm,cpc,frequency,actions,cost_per_action_type'
    const metaUrl = new URL(`https://graph.facebook.com/v19.0/${metaCampaignId}/insights`)
    metaUrl.searchParams.set('fields', fields)
    metaUrl.searchParams.set('time_range', JSON.stringify({ since: inicio, until: fim }))
    metaUrl.searchParams.set('access_token', integration.access_token)

    const metaRes = await fetch(metaUrl.toString())
    const metaData = await metaRes.json()

    if (metaData.error) {
      console.error('Erro Meta Ads insights:', metaData.error)
      return NextResponse.json({ error: metaData.error.message }, { status: 400 })
    }

    const insight = metaData.data?.[0]
    if (!insight) {
      return NextResponse.json({ metrics: [] })
    }

    // 4. Extrair valores de actions e cost_per_action_type
    const getAction = (key: string) =>
      insight.actions?.find((a: any) => a.action_type === key)?.value ?? null

    const getCost = (key: string) =>
      insight.cost_per_action_type?.find((a: any) => a.action_type === key)?.value ?? null

    const fmtBRL = (v: string | null) =>
      v ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null
    const fmtNum = (v: string | null) =>
      v ? parseInt(v).toLocaleString('pt-BR') : null
    const fmtDec = (v: string | null) =>
      v ? parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : null
    const fmtPct = (v: string | null) =>
      v ? `${parseFloat(v).toFixed(2)}%` : null

    // Mapa completo de todas as métricas disponíveis
    const allValues: Record<string, string | null> = {
      impressions:                 fmtNum(insight.impressions),
      reach:                       fmtNum(insight.reach),
      clicks:                      fmtNum(insight.clicks),
      ctr:                         fmtPct(insight.ctr),
      spend:                       fmtBRL(insight.spend),
      cpm:                         fmtBRL(insight.cpm),
      cpc:                         fmtBRL(insight.cpc),
      frequency:                   fmtDec(insight.frequency),
      actions_lead:                fmtNum(getAction('lead')),
      actions_purchase:            fmtNum(getAction('purchase')),
      actions_whatsapp:            fmtNum(getAction('onsite_conversion.messaging_conversation_started_7d')),
      actions_link_click:          fmtNum(getAction('link_click')),
      actions_page_engagement:     fmtNum(getAction('page_engagement')),
      actions_post_engagement:     fmtNum(getAction('post_engagement')),
      actions_video_view:          fmtNum(getAction('video_view')),
      actions_omni_purchase:       fmtNum(getAction('omni_purchase')),
      cost_per_action_lead:        fmtBRL(getCost('lead')),
      cost_per_action_purchase:    fmtBRL(getCost('purchase')),
      cost_per_action_whatsapp:    fmtBRL(getCost('onsite_conversion.messaging_conversation_started_7d')),
    }

    // 5. Filtrar apenas as métricas selecionadas (ou todas se não configurado)
    const keys = selectedMetrics?.length
      ? selectedMetrics
      : ['impressions', 'reach', 'clicks', 'ctr', 'spend', 'cpm', 'cpc', 'actions_lead']

    const agora = new Date().toISOString()

    const result = keys
      .map((key: string) => {
        const meta = ALL_META_METRICS.find(m => m.key === key)
        const value = allValues[key] ?? null
        return {
          id:           `${campaignId}-${key}`,
          campaign_id:  campaignId,
          metric_key:   key,
          metric_label: meta?.label ?? key,
          metric_value: value,
          updated_at:   agora,
        }
      })
      .filter((m: any) => m.metric_value !== null)

    // 6. Salvar no banco como cache
    for (const m of result) {
      await supabase.from('campaign_metrics').upsert({
        campaign_id:  m.campaign_id,
        metric_key:   m.metric_key,
        metric_label: m.metric_label,
        metric_value: m.metric_value,
        updated_at:   agora,
      }, { onConflict: 'campaign_id,metric_key' })
    }

    return NextResponse.json({ metrics: result })
  } catch (error: any) {
    console.error('Erro ao buscar métricas Meta Ads:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
