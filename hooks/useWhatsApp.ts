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

// source 'own' = WhatsApp do próprio usuário logado (padrão).
// source 'agency' = grupos compartilhados pelo admin (precisa do toggle "grupos_visiveis_colaboradores"
// ativado por ele) — não depende do usuário logado ter o próprio WhatsApp conectado.
export function useWhatsApp(source: 'own' | 'agency' = 'own') {
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
      const res = await fetch(`/api/whatsapp/groups${source === 'agency' ? '?source=agency' : ''}`)
      if (res.ok) {
        const data = await res.json()
        setGroups(Array.isArray(data) ? data : [])
        if (source === 'agency') {
          setInstance({ status: Array.isArray(data) && data.length > 0 ? 'connected' : 'disconnected' })
        }
      }
    } finally {
      setLoadingGroups(false)
    }
  }, [source])

  useEffect(() => {
    if (source === 'agency') {
      fetchGroups()
      return
    }
    fetchInstance().then((status) => {
      if (status === 'connected') {
        fetchGroups()
      }
    })
  }, [source])

  return { instance, groups, loadingGroups, fetchInstance, fetchGroups }
}
