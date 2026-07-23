'use client'

import { useEffect, useState } from 'react'
import { isFeatureLocked } from '@/lib/features'

interface PlanFeaturesResponse {
  features: Record<string, boolean>
  planName: string | null
}

// Só deduplica chamadas simultâneas (várias <FeatureLock>/Sidebar montando na
// mesma tela) — não guarda em cache entre navegações, senão um bloqueio novo
// feito pelo superadmin em /superadmin/planos não aparecia sem dar refresh
// na página (era o mesmo bug de cache que afetava /assinar).
let inFlight: Promise<PlanFeaturesResponse> | null = null

function fetchPlanFeatures(): Promise<PlanFeaturesResponse> {
  if (!inFlight) {
    inFlight = fetch('/api/plan-features', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { features: {}, planName: null }))
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}

export function usePlanFeatures() {
  const [features, setFeatures] = useState<Record<string, boolean>>({})
  const [planName, setPlanName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchPlanFeatures().then((data) => {
      if (!active) return
      setFeatures(data.features ?? {})
      setPlanName(data.planName ?? null)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const isLocked = (key: string) => isFeatureLocked(features, key)

  return { features, planName, isLocked, loading }
}
