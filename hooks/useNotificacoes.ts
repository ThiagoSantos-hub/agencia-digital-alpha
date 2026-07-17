// hooks/useNotificacoes.ts — v2.2.0
// Canal Realtime com nome único por instância (evita erro "callbacks after subscribe")

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export type TipoNotificacao =
  | 'vencimento_5dias'
  | 'vencimento_hoje'
  | 'pagamento_recebido'
  | 'geral'

export interface Notificacao {
  id: string
  user_id: string
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  finance_id: string | null
  lida: boolean
  created_at: string
}

let cachedNotificacoes: Notificacao[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 30000

export function useNotificacoes() {
  const supabase = useMemo(() => createClient(), [])
  const channelId = useRef(`notifications_${Math.random().toString(36).slice(2, 10)}`)

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(cachedNotificacoes ?? [])
  const [naoLidas, setNaoLidas] = useState(0)
  const [loading, setLoading] = useState(!cachedNotificacoes)
  const [error, setError] = useState<string | null>(null)

  const fetchNotificacoes = useCallback(async () => {
    const now = Date.now()

    if (cachedNotificacoes && now - cacheTimestamp < CACHE_DURATION) {
      setNotificacoes(cachedNotificacoes)
      setNaoLidas(cachedNotificacoes.filter((n) => !n.lida).length)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .eq('lida', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (err) throw err

      const lista = (data ?? []) as Notificacao[]
      cachedNotificacoes = lista
      cacheTimestamp = now

      setNotificacoes(lista)
      setNaoLidas(lista.filter((n) => !n.lida).length)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao buscar notificações')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchNotificacoes()

    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      channel = supabase
        .channel(channelId.current)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            const novaNotif = payload.new as Notificacao
            setNotificacoes((prev) => {
              if (prev.some((n) => n.id === novaNotif.id)) return prev
              return [novaNotif, ...prev]
            })
            setNaoLidas((prev) => prev + 1)
            cachedNotificacoes = null
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications' },
          () => {
            cachedNotificacoes = null
            fetchNotificacoes()
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications' },
          () => {
            cachedNotificacoes = null
            fetchNotificacoes()
          }
        )
        .subscribe((status) => {
          console.log('Status canal notificações:', status)
        })
    } catch (e) {
      console.warn('Falha ao assinar canal de notificações:', e)
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel)
        } catch {
          /* ignore */
        }
      }
    }
  }, [fetchNotificacoes, supabase])

  async function marcarComoLida(id: string): Promise<boolean> {
    const { error: err } = await supabase.from('notifications').delete().eq('id', id)

    if (err) {
      setError(err.message)
      return false
    }

    setNotificacoes((prev) => prev.filter((n) => n.id !== id))
    setNaoLidas((prev) => Math.max(0, prev - 1))
    cachedNotificacoes = null
    return true
  }

  async function marcarTodasComoLidas(): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const { error: err } = await supabase
      .from('notifications')
      .update({ lida: true })
      .eq('user_id', user.id)
      .eq('lida', false)

    if (err) {
      setError(err.message)
      return false
    }

    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    setNaoLidas(0)
    cachedNotificacoes = null
    return true
  }

  async function limparTodas(): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const { error: err } = await supabase.from('notifications').delete().eq('user_id', user.id)

    if (err) {
      setError(err.message)
      return false
    }

    setNotificacoes([])
    setNaoLidas(0)
    cachedNotificacoes = null
    return true
  }

  return {
    notificacoes,
    naoLidas,
    loading,
    error,
    refetch: fetchNotificacoes,
    marcarComoLida,
    marcarTodasComoLidas,
    limparTodas,
  }
}
