import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getInstagramMetrics } from '@/lib/metaInsights'

// Mesma lista de variáveis colada em Relatórios (app/(app)/relatorios/criar),
// filtrada pra só o que faz sentido como métrica de UMA campanha específica,
// sem <DATA>/<CA>/<ORC> (metadado do relatório) nem <CAMP_1..10> (numeração
// de campanhas dentro do relatório, não se aplica aqui).
const ALL_META_METRICS = [
  { key: 'inv',              label: 'Investido'              },
  { key: 'impressions',      label: 'Impressões'             },
  { key: 'reach',            label: 'Alcance'                },
  { key: 'clicks',           label: 'Cliques'                },
  { key: 'frequency',        label: 'Frequência'             },
  { key: 'cpm',              label: 'CPM'                    },
  { key: 'cpc',              label: 'CPC'                    },
  { key: 'ctr',              label: 'CTR'                    },
  { key: 'ctr_link',         label: 'CTR do Link'            },
  { key: 'cpc_link',         label: 'CPC do Link'            },
  { key: 'result',           label: 'Resultados'             },
  { key: 'cost_per_result',  label: 'Custo por Resultado'    },
  { key: 'add_to_cart',      label: 'Adic. Carrinho'         },
  { key: 'cost_add_to_cart', label: 'Custo por Carrinho'     },
  { key: 'view_dest_site',   label: 'View Destino Site'      },
  { key: 'view_dest',        label: 'View Destino'           },
  { key: 'cost_view_dest',   label: 'Custo por View Destino' },
  { key: 'inic_compra',      label: 'Início de Compra'       },
  { key: 'cost_inic_compra', label: 'Custo por Início de Compra' },
  { key: 'compras',          label: 'Compras'                },
  { key: 'cost_compra',      label: 'Custo por Compra'       },
  { key: 'conv_compra',      label: 'Valor de Conversão'     },
  { key: 'roas',             label: 'ROAS'                   },
  { key: 'lucro',            label: 'Lucro'                  },
  { key: 'gancho',           label: 'Taxa de Gancho'         },
  { key: 'conv_whats',       label: 'Conversas WhatsApp'     },
  { key: 'conv_form',        label: 'Conversão Formulário'   },
  { key: 'conv_total',       label: 'Conversões Totais'      },
  { key: 'taxa_conv',        label: 'Taxa de Conversão'      },
  { key: 'ticket_medio',     label: 'Ticket Médio'           },
  { key: 'ig_seguidores',    label: 'Seguidores Instagram'   },
  { key: 'ig_visitas',       label: 'Visitas ao Perfil (IG)' },
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
    if (!profile?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 403 })

    // Sem o filtro de company_id, com 2+ agências conectadas isso pegava a
    // integração Meta Ads de QUALQUER empresa (a primeira que o Postgres
    // retornasse), vazando token de uma empresa pro fetch de métricas de outra,
    // ou quebrando de vez (maybeSingle falha se mais de 1 linha bater).
    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('company_id', profile.company_id)
      .eq('type', 'meta_ads')
      .eq('status', 'connected')
      .maybeSingle()

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Meta Ads não conectado' }, { status: 400 })
    }

    const hoje = new Date()
    const trintaDiasAtras = new Date(hoje)
    trintaDiasAtras.setDate(hoje.getDate() - 30)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const inicio = dateStart || fmt(trintaDiasAtras)
    const fim    = dateEnd   || fmt(hoje)

    const fields = 'impressions,reach,clicks,ctr,spend,cpm,cpc,frequency,actions,cost_per_action_type,purchase_roas,conversion_values,video_30_sec_watched_actions,outbound_clicks_ctr,cost_per_outbound_click'
    const metaUrl = new URL(`https://graph.facebook.com/v19.0/${metaCampaignId}/insights`)
    metaUrl.searchParams.set('fields', fields)
    metaUrl.searchParams.set('time_range', JSON.stringify({ since: inicio, until: fim }))
    metaUrl.searchParams.set('access_token', integration.access_token)

    const metaRes = await fetch(metaUrl.toString())
    const metaData = await metaRes.json()

    if (metaData.error) {
      return NextResponse.json({ error: metaData.error.message }, { status: 400 })
    }

    const insight = metaData.data?.[0]
    if (!insight) return NextResponse.json({ metrics: [] })

    const getAction = (key: string) =>
      insight.actions?.find((a: any) => a.action_type === key)?.value ?? null
    const getCost = (key: string) =>
      insight.cost_per_action_type?.find((a: any) => a.action_type === key)?.value ?? null

    const fmtBRL = (v: string | number | null) =>
      v ? parseFloat(String(v)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null
    const fmtNum = (v: string | number | null) =>
      v ? Math.round(parseFloat(String(v))).toLocaleString('pt-BR') : null
    const fmtDec = (v: string | number | null) =>
      v ? parseFloat(String(v)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : null
    const fmtPct = (v: string | number | null) =>
      v ? `${parseFloat(String(v)).toFixed(2)}%` : null

    const convValues = parseFloat(insight.conversion_values ?? '0')
    const lucro = convValues - parseFloat(insight.spend ?? '0')
    const video3s = parseFloat(insight.video_30_sec_watched_actions?.[0]?.value ?? '0')
    const taxaGancho = insight.impressions > 0 ? (video3s / parseFloat(insight.impressions)) * 100 : 0

    const resultValue =
      getAction('onsite_conversion.messaging_conversation_started_7d') ||
      getAction('lead') ||
      getAction('purchase')
    const resultCost =
      getCost('onsite_conversion.messaging_conversation_started_7d') ||
      getCost('lead') ||
      getCost('purchase')

    const convWhats = Number(getAction('onsite_conversion.messaging_conversation_started_7d') ?? 0)
    const convForm = Number(getAction('lead') ?? 0)
    const convPurchase = Number(getAction('purchase') ?? 0)
    const convTotal = convWhats + convForm + convPurchase
    const cliques = parseFloat(insight.clicks ?? '0')
    const taxaConv = cliques > 0 ? (convTotal / cliques) * 100 : 0
    const ticketMedio = convPurchase > 0 ? convValues / convPurchase : 0

    // Seguidores/visitas do Instagram são da conta de anúncios do cliente, não
    // da campanha em si, mesmo valor pra qualquer campanha desse cliente.
    let igSeguidores: string | null = null
    let igVisitas: string | null = null
    const { data: campaignRow } = await supabase.from('campaigns').select('client_id').eq('id', campaignId).maybeSingle()
    if (campaignRow?.client_id) {
      const { data: clientRow } = await supabase.from('clients').select('meta_ad_account_id').eq('id', campaignRow.client_id).maybeSingle()
      if (clientRow?.meta_ad_account_id) {
        const ig = await getInstagramMetrics(clientRow.meta_ad_account_id, integration.access_token, inicio, fim)
        igSeguidores = ig.seguidores
        igVisitas = ig.visitas
      }
    }

    const allValues: Record<string, string | null> = {
      inv:              fmtBRL(insight.spend),
      impressions:      fmtNum(insight.impressions),
      reach:            fmtNum(insight.reach),
      clicks:           fmtNum(insight.clicks),
      frequency:        fmtDec(insight.frequency),
      cpm:              fmtBRL(insight.cpm),
      cpc:              fmtBRL(insight.cpc),
      ctr:              fmtPct(insight.ctr),
      ctr_link:         fmtPct(insight.outbound_clicks_ctr?.[0]?.value ?? null),
      cpc_link:         fmtBRL(insight.cost_per_outbound_click?.[0]?.value ?? null),
      result:           fmtNum(resultValue),
      cost_per_result:  fmtBRL(resultCost),
      add_to_cart:      fmtNum(getAction('add_to_cart')),
      cost_add_to_cart: fmtBRL(getCost('add_to_cart')),
      view_dest_site:   fmtNum(getAction('landing_page_view')),
      view_dest:        fmtNum(getAction('view_content')),
      cost_view_dest:   fmtBRL(getCost('view_content')),
      inic_compra:      fmtNum(getAction('initiate_checkout')),
      cost_inic_compra: fmtBRL(getCost('initiate_checkout')),
      compras:          fmtNum(getAction('purchase')),
      cost_compra:      fmtBRL(getCost('purchase')),
      conv_compra:      fmtBRL(convValues > 0 ? convValues : null),
      roas:             insight.purchase_roas?.[0]?.value ? `${parseFloat(insight.purchase_roas[0].value).toFixed(2)}x` : null,
      lucro:            fmtBRL(lucro > 0 ? lucro : null),
      gancho:           fmtPct(taxaGancho > 0 ? taxaGancho : null),
      conv_whats:       fmtNum(getAction('onsite_conversion.messaging_conversation_started_7d')),
      conv_form:        fmtNum(getAction('lead')),
      conv_total:       fmtNum(convTotal > 0 ? convTotal : null),
      taxa_conv:        fmtPct(taxaConv > 0 ? taxaConv : null),
      ticket_medio:     fmtBRL(ticketMedio > 0 ? ticketMedio : null),
      ig_seguidores:    igSeguidores,
      ig_visitas:       igVisitas,
    }

    const keys: string[] = selectedMetrics?.length
      ? selectedMetrics
      : ['impressions', 'reach', 'clicks', 'ctr', 'inv', 'cpm', 'cpc']

    const agora = new Date().toISOString()

    const result = keys
      .map((key: string) => {
        const meta = ALL_META_METRICS.find(m => m.key === key)
        return {
          id:           `${campaignId}-${key}`,
          campaign_id:  campaignId,
          metric_key:   key,
          metric_label: meta?.label ?? key,
          metric_value: allValues[key] ?? null,
          updated_at:   agora,
        }
      })
      .filter((m: any) => m.metric_value !== null)

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
