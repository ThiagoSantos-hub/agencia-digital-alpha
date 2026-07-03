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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchCampaigns = useCallback(async (clientId?: string) => {
    setLoading(true)
    try {
      let query = supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      if (clientId) query = query.eq('client_id', clientId)
      const { data, error: localError } = await query
      if (localError) throw localError
      setCampaigns(data ?? [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Busca métricas reais do Meta Ads via API route
  const fetchMetrics = useCallback(async (campaignId: string, metaCampaignId: string): Promise<CampaignMetric[]> => {
    if (!metaCampaignId) {
      // Sem ID Meta, retorna métricas salvas no banco
      const { data } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
      return data ?? []
    }

    try {
      const res = await fetch('/api/campaigns/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, metaCampaignId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.metrics ?? []
    } catch (err) {
      console.error('Erro ao buscar métricas:', err)
      // Fallback: retorna métricas salvas no banco
      const { data } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
      return data ?? []
    }
  }, [supabase])

  const syncMetaCampaigns = useCallback(async (clientId: string, adAccountId: string) => {
    if (!adAccountId) return false
    try {
      const res = await fetch('/api/campaigns/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, adAccountId }),
      })
      if (res.ok) {
        await fetchCampaigns()
        return true
      }
      return false
    } catch (err) {
      console.error('Erro ao sincronizar:', err)
      return false
    }
  }, [fetchCampaigns])

  const syncAllMetaCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, meta_ad_account_id')
        .not('meta_ad_account_id', 'is', null)

      if (!clients || clients.length === 0) {
        console.log('Nenhum cliente com Meta Ad Account ID encontrado')
        return
      }

      for (const client of clients) {
        await fetch('/api/campaigns/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: client.id, adAccountId: client.meta_ad_account_id }),
        })
      }
      await fetchCampaigns()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, fetchCampaigns])

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    fetchMetrics,
    syncMetaCampaigns,
    syncAllMetaCampaigns,
  }
}
