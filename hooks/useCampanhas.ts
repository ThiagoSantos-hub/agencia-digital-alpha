'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface Campaign {
  id: string
  client_id: string
  name: string
  status: 'ativa' | 'pausada' | 'finalizada' | 'rascunho'
  channel: 'meta_ads' | 'google_ads' | 'organico' | 'outro'
  created_at: string
}

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

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    createCampanha,
    updateCampanha,
    deleteCampanha,
  }
}
