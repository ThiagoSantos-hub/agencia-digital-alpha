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

  const fetchMetrics = useCallback(async (campaignId: string): Promise<CampaignMetric[]> => {
    const { data } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
    return data ?? []
  }, [supabase])

  const syncMetaCampaigns = async (clientId: string, adAccountId: string) => {
    if (!adAccountId) return false
    
    try {
      const res = await fetch('/api/campaigns/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, adAccountId })
      })
      
      if (res.ok) {
        await fetchCampaigns(clientId)
        return true
      }
      return false
    } catch (err) {
      console.error('Erro ao sincronizar:', err)
      return false
    }
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
