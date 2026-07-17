'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, X } from 'lucide-react'
import {
  hasAskedNotificationPermission,
  markNotificationPermissionAsked,
  playNotificationChime,
} from '@/lib/notificationPrefs'

export function NotificationPermissionPrompt() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (hasAskedNotificationPermission()) return
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      markNotificationPermissionAsked()
      return
    }

    // Pequeno atraso para não competir com o loading do painel
    const t = window.setTimeout(() => setOpen(true), 1200)
    return () => window.clearTimeout(t)
  }, [])

  const close = () => {
    markNotificationPermissionAsked()
    setOpen(false)
  }

  const accept = async () => {
    try {
      const result = await Notification.requestPermission()
      if (result === 'granted') {
        playNotificationChime()
      }
    } catch {
      /* ignore */
    }
    close()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-elevated-lg overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-elevated-sm">
                  <BellRing size={20} className="text-primary" />
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-hover-bg"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              <h3 className="mt-4 text-base font-bold text-text-main">Receber notificações?</h3>
              <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
                Ative para ouvir um toque e ver alertas mesmo quando estiver em outra aba.
                Você pode mudar isso depois nas configurações do navegador.
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-text-muted border border-border bg-surface hover:bg-hover-bg shadow-elevated-sm"
                >
                  Agora não
                </button>
                <button
                  type="button"
                  onClick={accept}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover border border-primary shadow-elevated-md"
                >
                  Sim, notificar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
