// hooks/useNotificacoes.ts
// Projeto: Agência Digital Alpha
// Módulo Notificações — busca, marcar lida, limpar todas
// Supabase client: sempre import { createClient } from '@/lib/supabase'

import { useState, useEffect, useCallback } from 'react'
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

// ============================================================
// HOOK
// ============================================================

export function useNotificacoes() {
  const supabase = createClient()

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidas,     setNaoLidas]     = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // ── FETCH ──────────────────────────────────────────────────
  const fetchNotificacoes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (err) throw err

      const lista = (data ?? []) as Notificacao[]
      setNotificacoes(lista)
      setNaoLidas(lista.filter(n => !n.lida).length)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao buscar notificações')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotificacoes()

    // Realtime: atualiza o sino automaticamente quando chega notificação nova
    const channel = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => { fetchNotificacoes() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchNotificacoes])

  // ── MARCAR UMA COMO LIDA ───────────────────────────────────
  async function marcarComoLida(id: string): Promise<boolean> {
    const { error: err } = await supabase
      .from('notifications')
      .update({ lida: true })
      .eq('id', id)

    if (err) { setError(err.message); return false }
    await fetchNotificacoes()
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
    await fetchNotificacoes()
    return true
  }

  // ── DELETAR UMA ────────────────────────────────────────────
  async function deletarNotificacao(id: string): Promise<boolean> {
    const { error: err } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (err) { setError(err.message); return false }
    await fetchNotificacoes()
    return true
  }

  // ── LIMPAR TODAS ───────────────────────────────────────────
  async function limparTodas(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error: err } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)

    if (err) { setError(err.message); return false }
    await fetchNotificacoes()
    return true
  }

  return {
    notificacoes,
    naoLidas,
    loading,
    error,
    refetch:              fetchNotificacoes,
    marcarComoLida,
    marcarTodasComoLidas,
    deletarNotificacao,
    limparTodas,
  }
}
