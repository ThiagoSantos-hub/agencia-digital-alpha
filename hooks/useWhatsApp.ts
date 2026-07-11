import { useState, useEffect, useCallback } from 'react'

export interface WhatsAppGroup {
  group_id: string
  name: string
  participant_count: number
}

export interface WhatsAppInstance {
  status: 'connected' | 'connecting' | 'disconnected' | 'loading' | 'error'
  instance_name?: string
  error?: string
}

export function useWhatsApp() {
  const [instance, setInstance] = useState<WhatsAppInstance>({ status: 'loading' })
  const [groups, setGroups] = useState<WhatsAppGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)

  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/instance')
      const data = await res.json()
      if (!res.ok) {
        setInstance({ status: 'error', error: data.error })
        return 'error'
      }
      setInstance({ status: data.status, instance_name: data.instance_name })
      return data.status as string
    } catch {
      setInstance({ status: 'error', error: 'Erro de rede' })
      return 'error'
    }
  }, [])

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true)
    try {
      const res = await fetch('/api/whatsapp/groups')
      if (res.ok) setGroups(await res.json())
    } finally {
      setLoadingGroups(false)
    }
  }, [])

  useEffect(() => {
    fetchInstance()
  }, [])

  return { instance, groups, loadingGroups, fetchInstance, fetchGroups }
}
