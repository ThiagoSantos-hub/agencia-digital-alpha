// hooks/useNotificacoes.ts — v2.1.0
// Projeto: Agência Digital Alpha
// Módulo Notificações — busca otimizada, marcar lida, limpar todas
// Supabase client: sempre import { createClient } from '@/lib/supabase'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'

// ============================================================
// TIPOS
// ============================================================

export type TipoNotificacao =
  | 'vencimento_5dias'
  | 'vencimento_hoje'
  | 'pagamento_recebido'
  | 'geral'

export interface Notificacao {
  id:         string
  user_id:    string
  tipo:       TipoNotificacao
  titulo:     string
  mensagem:   string
  finance_id: string | null
  lida:       boolean
  created_at: string
}

// Cache global para notificações
let cachedNotificacoes: Notificacao[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 30000 // 30 segundos

// ============================================================
// HOOK
// ============================================================

export function useNotificacoes() {
  const supabase = useMemo(() => createClient(), [])

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(cachedNotificacoes ?? [])
  const [naoLidas,     setNaoLidas]     = useState(0)
  const [loading,      setLoading]      = useState(!cachedNotificacoes)
  const [error,        setError]        = useState<string | null>(null)

  // ── FETCH ──────────────────────────────────────────────────
  const fetchNotificacoes = useCallback(async () => {
    const now = Date.now()
    
    // Usar cache se ainda for válido
    if (cachedNotificacoes && (now - cacheTimestamp) < CACHE_DURATION) {
      setNotificacoes(cachedNotificacoes)
      setNaoLidas(cachedNotificacoes.filter(n => !n.lida).length)
      setLoading(false)
      return
    }

    if (notificacoes.length === 0) setLoading(true)
    setError(null)

    try {
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .eq('lida', false) // Buscar apenas as não lidas
        .order('created_at', { ascending: false })
        .limit(50)

      if (err) throw err

      const lista = (data ?? []) as Notificacao[]
      cachedNotificacoes = lista
      cacheTimestamp = now
      
      setNotificacoes(lista)
      setNaoLidas(lista.filter(n => !n.lida).length)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao buscar notificações')
    } finally {
      setLoading(false)
    }
  }, [supabase, notificacoes.length])

  useEffect(() => {
    fetchNotificacoes()

    // Pedir permissão para notificações push ao carregar
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }

    // Realtime: atualiza o sino automaticamente quando chega notificação nova
    const channel = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications'
        },
        (payload) => { 
          console.log('Nova notificação recebida em tempo real:', payload.new)
          const novaNotif = payload.new as Notificacao
          
          // Disparar Notificação Push Nativa
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(novaNotif.titulo, {
              body: novaNotif.mensagem,
              icon: '/logo.png', // Certifique-se que o logo existe em public/
            })
          }

          setNotificacoes(prev => [novaNotif, ...prev])
          setNaoLidas(prev => prev + 1)
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
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchNotificacoes, supabase])

  // ── MARCAR UMA COMO LIDA (E EXCLUIR PARA LIMPAR) ────────────
  async function marcarComoLida(id: string): Promise<boolean> {
    // Em vez de apenas atualizar para lida, vamos excluir para manter o banco limpo
    // ou apenas remover da UI se você preferir manter o histórico no banco.
    // O usuário pediu para "sumir", então vamos excluir do banco.
    const { error: err } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (err) { setError(err.message); return false }
    
    // Remover da UI instantaneamente
    setNotificacoes(prev => prev.filter(n => n.id !== id))
    setNaoLidas(prev => Math.max(0, prev - 1))
    cachedNotificacoes = null
    
    return true
  }

  // ── MARCAR TODAS COMO LIDAS ────────────────────────────────
  async function marcarTodasComoLidas(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error: err } = await supabase
      .from('notifications')
      .update({ lida: true })
      .eq('user_id', user.id)
      .eq('lida', false)

    if (err) { setError(err.message); return false }
    
    // Atualizar UI instantaneamente
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
    setNaoLidas(0)
    cachedNotificacoes = null // Invalidar cache
    
    return true
  }

  // ── LIMPAR TODAS ────────────────────────────────────────────
  async function limparTodas(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error: err } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)

    if (err) { setError(err.message); return false }
    
    // Atualizar UI instantaneamente
    setNotificacoes([])
    setNaoLidas(0)
    cachedNotificacoes = null // Invalidar cache
    
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
