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

  useEffect(() => {
    setMuted(isPopupMutedToday())
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    (item: ToastItem) => {
      if (seenIds.current.has(item.id)) return
      seenIds.current.add(item.id)

      // Som + notificação do navegador sempre (se permitido), mesmo com popup mutado
      playNotificationChime()
      showBrowserNotification(item.titulo, item.mensagem)

      if (isPopupMutedToday()) {
        setMuted(true)
        return
      }

      setToasts((prev) => [item, ...prev].slice(0, 4))

      // Auto-fecha em 9s
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id))
      }, 9000)
    },
    []
  )

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    const channel = supabase
      .channel(`toast_notifications_${user.id}`)
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

          // Compatível com schema PT (titulo/mensagem/lida) e EN (title/message/read)
          const titulo = String(row.titulo ?? row.title ?? 'Nova notificação')
          const mensagem = String(row.mensagem ?? row.message ?? '')
          const tipo = String(row.tipo ?? row.type ?? 'geral')

          pushToast({ id, titulo, mensagem, tipo })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-elevated-sm">
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
