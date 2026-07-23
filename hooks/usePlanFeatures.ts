'use client'

import { useEffect, useState } from 'react'
import { isFeatureLocked } from '@/lib/features'

let cachedFeatures: Record<string, boolean> | null = null
let cachedPlanName: string | null = null

// Busca uma vez (cache simples de módulo, mesmo padrão de cachedProfile em
// useAuth) o JSONB de features do plano da empresa logada.
export function usePlanFeatures() {
  const [features, setFeatures] = useState<Record<string, boolean> | null>(cachedFeatures)
  const [planName, setPlanName] = useState<string | null>(cachedPlanName)
  const [loading, setLoading] = useState(cachedFeatures === null)

  useEffect(() => {
    if (cachedFeatures !== null) return
    fetch('/api/plan-features')
      .then((res) => res.ok ? res.json() : { features: {}, planName: null })
      .then((data) => {
        cachedFeatures = data.features ?? {}
        cachedPlanName = data.planName ?? null
        setFeatures(cachedFeatures)
        setPlanName(cachedPlanName)
      })
      .finally(() => setLoading(false))
  }, [])

  const isLocked = (key: string) => isFeatureLocked(features, key)

  return { features: features ?? {}, planName, isLocked, loading }
}
