'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  isPopupMutedToday,
  mutePopupsForToday,
  playNotificationChime,
  showBrowserNotification,
} from '@/lib/notificationPrefs'

interface ToastItem {
  id: string
  titulo: string
  mensagem: string
  tipo?: string
}

function iconeTipo(tipo?: string) {
  switch (tipo) {
    case 'vencimento_5dias':
      return '⚠️'
    case 'vencimento_hoje':
      return '🔴'
    case 'pagamento_recebido':
      return '✅'
    default:
      return '🔔'
  }
}

export function NotificationToasts() {
  const { user } = useAuth()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [muted, setMuted] = useState(false)
  const seenIds = useRef<Set<string>>(new Set())
  const channelRef = useRef<string>(`toast_${Math.random().toString(36).slice(2, 10)}`)

  useEffect(() => {
    setMuted(isPopupMutedToday())
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback((item: ToastItem) => {
    if (seenIds.current.has(item.id)) return
    seenIds.current.add(item.id)

    playNotificationChime()
    showBrowserNotification(item.titulo, item.mensagem)

    if (isPopupMutedToday()) {
      setMuted(true)
      return
    }

    setToasts((prev) => [item, ...prev].slice(0, 4))

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== item.id))
    }, 9000)
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      channel = supabase
        .channel(`${channelRef.current}_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>
            const id = String(row.id ?? '')
            if (!id) return

            const titulo = String(row.titulo ?? row.title ?? 'Nova notificação')
            const mensagem = String(row.mensagem ?? row.message ?? '')
            const tipo = String(row.tipo ?? row.type ?? 'geral')

            pushToast({ id, titulo, mensagem, tipo })
          }
        )
        .subscribe()
    } catch (e) {
      console.warn('Falha ao assinar toasts de notificação:', e)
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
  }, [user?.id, pushToast])

  const handleMuteToday = () => {
    mutePopupsForToday()
    setMuted(true)
    setToasts([])
  }

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col gap-3 w-[min(100vw-2rem,22rem)] pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="pointer-events-auto bg-surface border border-border rounded-2xl shadow-elevated-lg overflow-hidden"
          >
            <div className="flex gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-elevated-md">
                <span className="text-lg leading-none">{iconeTipo(t.tipo)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-text-main leading-snug">{t.titulo}</p>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-hover-bg shrink-0"
                    aria-label="Fechar"
                  >
                    <X size={14} />
                  </button>
                </div>
                {t.mensagem && (
                  <p className="text-xs text-text-muted mt-1 leading-snug line-clamp-3">{t.mensagem}</p>
                )}
              </div>
            </div>
            <div className="px-4 py-2.5 border-t border-border bg-background/80 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-disabled flex items-center gap-1">
                <Bell size={11} /> Agora
              </span>
              {!muted && (
                <button
                  type="button"
                  onClick={handleMuteToday}
                  className="text-[11px] font-semibold text-text-muted hover:text-primary transition-colors"
                >
                  Não receber pop-ups hoje
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
