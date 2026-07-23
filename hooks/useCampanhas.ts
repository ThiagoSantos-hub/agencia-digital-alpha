'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
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
  selected_metrics?: string[] | null
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

export interface MetaMetricOption {
  key: string
  label: string
}

export function useCampanhas() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const lastFetchTime = useRef<number>(0)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchCampaigns = useCallback(async (clientId?: string, forceRefetch = false) => {
    if (!forceRefetch && Date.now() - lastFetchTime.current < CACHE_DURATION && campaigns.length > 0) {
      return // Usar cache se recente
    }
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
      lastFetchTime.current = Date.now()
    }
  }, [supabase])

  useEffect(() => { fetchCampaigns(undefined, false) }, [fetchCampaigns])

  // Busca lista de todas as métricas disponíveis no Meta
  const fetchAllMetricOptions = useCallback(async (): Promise<MetaMetricOption[]> => {
    try {
      const res = await fetch('/api/campaigns/metrics')
      const json = await res.json()
      return json.metrics ?? []
    } catch {
      return []
    }
  }, [])

  // Busca métricas reais com período e seleção personalizados
  const fetchMetrics = useCallback(async (
    campaignId: string,
    metaCampaignId: string,
    selectedMetrics?: string[],
    dateStart?: string,
    dateEnd?: string
  ): Promise<CampaignMetric[]> => {
    if (!metaCampaignId) {
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
        body: JSON.stringify({ campaignId, metaCampaignId, selectedMetrics, dateStart, dateEnd }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.metrics ?? []
    } catch (err) {
      console.error('Erro ao buscar métricas:', err)
      const { data } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
      return data ?? []
    }
  }, [supabase])

  // Salva as métricas selecionadas pelo gestor para uma campanha
  const saveSelectedMetrics = useCallback(async (campaignId: string, metrics: string[]): Promise<boolean> => {
    const { error } = await supabase
      .from('campaigns')
      .update({ selected_metrics: metrics })
      .eq('id', campaignId)
    if (!error) {
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId ? { ...c, selected_metrics: metrics } : c
      ))
    }
    return !error
  }, [supabase])

  const syncAllMetaCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      // clients_directory, não a tabela clients direto: esse hook é usado
      // tanto pelo admin quanto pelo colaborador, e sincronizar precisa
      // alcançar todos os clientes da agência com conta de anúncio
      // vinculada, não só os que o colaborador que clicou gerencia (RLS de
      // clients agora restringe o registro completo por manager_id, ver
      // migration 20260731_clients_rls_hardening.sql).
      const { data: clients } = await supabase
        .from('clients_directory')
        .select('id, meta_ad_account_id')
        .not('meta_ad_account_id', 'is', null)
      if (!clients || clients.length === 0) return
      for (const client of clients) {
        await fetch('/api/campaigns/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: client.id, adAccountId: client.meta_ad_account_id }),
        })
      }
      await fetchCampaigns(undefined, true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      lastFetchTime.current = Date.now()
    }
  }, [supabase, fetchCampaigns])

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    fetchMetrics,
    fetchAllMetricOptions,
    saveSelectedMetrics,
    syncAllMetaCampaigns,
  }
}
