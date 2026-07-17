'use client'

import { useEffect, useRef } from 'react'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { playNotificationChime } from '@/lib/notificationPrefs'

/**
 * Mantém compatibilidade com o layout admin.
 * O toque principal de novas notificações agora é disparado em NotificationToasts.
 * Aqui só tocamos se o contador de não lidas subir (fallback).
 */
export function NotificationSound() {
  const { naoLidas } = useNotificacoes()
  const last = useRef(naoLidas)
  const ready = useRef(false)

  useEffect(() => {
    const unlock = () => {
      ready.current = true
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
    }
    document.addEventListener('click', unlock)
    document.addEventListener('keydown', unlock)
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!ready.current) {
      last.current = naoLidas
      return
    }
    if (naoLidas > last.current) {
      playNotificationChime()
    }
    last.current = naoLidas
  }, [naoLidas])

  return null
}
