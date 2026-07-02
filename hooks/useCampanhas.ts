'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface Campaign {
  id: string
  client_id: string
  name: string
  status: 'ativa' | 'pausada' | 'finalizada' | 'rascunho'
  channel: 'meta_ads' | 'google_ads' | 'organico' | 'outro'
  start_date: string | null
  end_date: string | null
  budget: number | null
  created_at: string
}

export interface CampaignMetric {
  id: string
  campaign_id: string
  metric_key: string
  metric_label: string
  metric_value: string | null
  updated_at: string
}

export const METRICS_DISPONIVEIS = [
  { key: 'alcance',      label: 'Alcance'       },
  { key: 'impressoes',   label: 'Impressões'    },
  { key: 'cliques',      label: 'Cliques'       },
  { key: 'ctr',          label: 'CTR (%)'       },
  { key: 'cpm',          label: 'CPM (R$)'      },
  { key: 'cpc',          label: 'CPC (R$)'      },
  { key: 'conversoes',   label: 'Conversões'    },
  { key: 'roas',         label: 'ROAS'          },
  { key: 'valor_gasto',  label: 'Valor Gasto (R$)' },
  { key: 'resultado',    label: 'Resultado'     },
  { key: 'frequencia',   label: 'Frequência'    },
  { key: 'leads',        label: 'Leads'         },
]

type CampaignInput = Omit<Campaign, 'id' | 'created_at'>

export function useCampanhas(clientId?: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      setCampaigns(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [supabase, clientId])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const createCampanha = async (input: CampaignInput) => {
    const { data, error } = await supabase
      .from('campaigns')
      .insert(input)
      .select()
      .single()
    if (!error) await fetchCampaigns()
    return { data, error }
  }

  const updateCampanha = async (id: string, input: Partial<CampaignInput>) => {
    const { data, error } = await supabase
      .from('campaigns')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (!error) await fetchCampaigns()
    return { data, error }
  }

  const deleteCampanha = async (id: string) => {
    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (!error) await fetchCampaigns()
    return { error }
  }

  // Métricas
  const fetchMetrics = async (campaignId: string): Promise<CampaignMetric[]> => {
    const { data } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
    return data ?? []
  }

  const saveMetrics = async (campaignId: string, metrics: { metric_key: string; metric_label: string; metric_value: string | null }[]) => {
    // Deleta as métricas antigas e insere as novas
    await supabase.from('campaign_metrics').delete().eq('campaign_id', campaignId)
    if (metrics.length === 0) return { error: null }
    const { error } = await supabase.from('campaign_metrics').insert(
      metrics.map((m) => ({ ...m, campaign_id: campaignId }))
    )
    return { error }
  }

  const updateMetricValue = async (metricId: string, value: string) => {
    const { error } = await supabase
      .from('campaign_metrics')
      .update({ metric_value: value, updated_at: new Date().toISOString() })
      .eq('id', metricId)
    return { error }
  }

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    createCampanha,
    updateCampanha,
    deleteCampanha,
    fetchMetrics,
    saveMetrics,
    updateMetricValue,
  }
}
