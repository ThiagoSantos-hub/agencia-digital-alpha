
import { useEffect, useState, useRef, useCallback } from 'react'

interface MetaAccountInfo {
  saldo: string | null
  temCartao: boolean
  contaBloqueada: boolean
}

// Cache global para evitar chamadas repetidas para o mesmo adAccountId
const metaAccountCache = new Map<string, { info: MetaAccountInfo | null; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export function useMetaAccount(adAccountId: string | null) {
  const [info, setInfo] = useState<MetaAccountInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const fetchingRef = useRef<string | null>(null) // Para evitar múltiplas chamadas simultâneas

  const fetchMetaAccountInfo = useCallback(async (id: string) => {
    // Verifica cache
    const cached = metaAccountCache.get(id)
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      setInfo(cached.info)
      return
    }

    if (fetchingRef.current === id) return // Já está buscando

    fetchingRef.current = id
    setLoading(true)
    try {
      const res = await fetch(`/api/meta/account?adAccountId=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (!data.error) {
        setInfo(data)
        metaAccountCache.set(id, { info: data, timestamp: Date.now() })
      } else {
        setInfo(null)
        console.error("Erro ao buscar info da conta Meta:", data.error)
      }
    } catch (err) {
      setInfo(null)
      console.error("Erro na requisição de info da conta Meta:", err)
    } finally {
      setLoading(false)
      fetchingRef.current = null
    }
  }, [])

  useEffect(() => {
    if (adAccountId) {
      fetchMetaAccountInfo(adAccountId)
    } else {
      setInfo(null)
    }
  }, [adAccountId, fetchMetaAccountInfo])

  return { info, loading }
}
