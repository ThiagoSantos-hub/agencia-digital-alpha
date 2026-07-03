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

    // Realtime: atualiza o sino automaticamente quando chega notificação nova
    const channel = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => { 
          cachedNotificacoes = null // Invalidar cache
          fetchNotificacoes() 
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchNotificacoes, supabase])

  // ── MARCAR UMA COMO LIDA ───────────────────────────────────
  async function marcarComoLida(id: string): Promise<boolean> {
    const { error: err } = await supabase
      .from('notifications')
      .update({ lida: true })
      .eq('id', id)

    if (err) { setError(err.message); return false }
    
    // Atualizar UI instantaneamente
    setNotificacoes(prev => 
      prev.map(n => n.id === id ? { ...n, lida: true } : n)
    )
    setNaoLidas(prev => Math.max(0, prev - 1))
    cachedNotificacoes = null // Invalidar cache
    
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
