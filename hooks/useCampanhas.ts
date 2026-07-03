'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
  meta_campaign_id?: string | null
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

export function useCampanhas() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchCampaigns = useCallback(async (clientId?: string, dateRange?: { start: string, end: string }) => {
    setLoading(true)
    try {
      // 1. Buscar integração do Meta Ads para pegar o token
      const { data: integration } = await supabase
        .from('integrations')
        .select('access_token')
        .eq('type', 'meta_ads')
        .eq('status', 'connected')
        .maybeSingle()

      // 2. Buscar campanhas locais do banco
      let query = supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientId) query = query.eq('client_id', clientId)

      const { data: localCampaigns, error: localError } = await query
      if (localError) throw localError

      // 3. Se houver token e clientId com meta_ad_account_id, buscar dados REAIS do Meta Ads
      // Nota: Aqui estamos preparando a estrutura para a chamada de API real
      // Por enquanto, vamos retornar os dados locais, mas a lógica de sync será via API route
      
      setCampaigns(localCampaigns ?? [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchMetrics = useCallback(async (campaignId: string, dateRange?: { start: string, end: string }): Promise<CampaignMetric[]> => {
    const { data } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
    return data ?? []
  }, [supabase])

  const syncMetaCampaigns = async (clientId: string, adAccountId: string) => {
    // Chamada para a API route que fará o sync real com o Meta
    const res = await fetch('/api/campaigns/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, adAccountId })
    })
    if (res.ok) await fetchCampaigns(clientId)
    return res.ok
  }

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    fetchMetrics,
    syncMetaCampaigns
  }
}
