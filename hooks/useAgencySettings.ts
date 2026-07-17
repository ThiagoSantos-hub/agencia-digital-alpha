'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export interface AgencySetting {
  id: string
  key: string
  value: string
  updated_at: string
}

export type AgencySettingsMap = Record<string, string>

const DEFAULT_SETTINGS: AgencySettingsMap = {
  color_primary: '#1A56DB',
  color_cta: '#16A34A',
  color_background: '#F8FAFC',
  color_sidebar: '#FFFFFF',
  color_header: '#FFFFFF',
  color_text_main: '#1E293B',
  color_text_muted: '#64748B',
  button_radius: 'rounded-lg',
  button_size: 'md',
  button_style: 'solid',
  font_family: 'Inter',
  font_size_base: '14px',
  font_weight_title: '600',
}

export function useAgencySettings() {
  const [settings, setSettings] = useState<AgencySettingsMap>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const lastFetchTime = useRef<number>(0)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
  const supabase = useMemo(() => createClient(), [])

  const fetchSettings = useCallback(async (forceRefetch = false) => {
    if (!forceRefetch && Date.now() - lastFetchTime.current < CACHE_DURATION && Object.keys(settings).length > 0) {
      return
    }

    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('agency_settings')
        .select('key, value')

      if (fetchError) throw fetchError

      if (data) {
        const settingsMap: AgencySettingsMap = {}
        data.forEach((item) => {
          settingsMap[item.key] = item.value
        })
        
        // Merge with defaults to ensure all keys exist
        setSettings({ ...DEFAULT_SETTINGS, ...settingsMap })
      }
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      lastFetchTime.current = Date.now()
    }
  }, [supabase, settings])

  useEffect(() => {
    fetchSettings(true)

    const channel = supabase
      .channel('agency_settings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agency_settings' },
        () => fetchSettings(true)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchSettings])

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error: updateError } = await supabase
        .from('agency_settings')
        .upsert({ key, value }, { onConflict: 'key' })

      if (updateError) throw updateError

      setSettings((prev) => ({ ...prev, [key]: value }))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const saveAllSettings = async (newSettings: AgencySettingsMap) => {
    setLoading(true)
    try {
      const upsertData = Object.entries(newSettings).map(([key, value]) => ({
        key,
        value,
      }))

      const { error: updateError } = await supabase
        .from('agency_settings')
        .upsert(upsertData, { onConflict: 'key' })

      if (updateError) throw updateError

      setSettings(newSettings)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const resetToDefaults = async () => {
    return saveAllSettings(DEFAULT_SETTINGS)
  }

  return {
    settings,
    loading,
    error,
    updateSetting,
    saveAllSettings,
    resetToDefaults,
    refetch: () => fetchSettings(true),
  }
}
