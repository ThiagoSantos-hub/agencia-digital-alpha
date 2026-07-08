'use client'

import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationSound() {
  const { unreadCount, notifications } = useNotifications()
  const [hasInteracted, setHasInteracted] = useState(false)
  const lastUnreadCount = useRef(unreadCount)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isFirstLoad = useRef(true)

  useEffect(() => {
    // Detectar interação do usuário para liberar o áudio no navegador
    const handleInteraction = () => {
      setHasInteracted(true)
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
    }
    document.addEventListener('click', handleInteraction)
    document.addEventListener('keydown', handleInteraction)
    
    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  const playPersistentSound = () => {
    if (!hasInteracted) return

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/notification.mp3')
        audioRef.current.loop = true
      }
      
      audioRef.current.play().catch(e => console.warn('Bloqueio de áudio:', e))
      
      // Tocar por 3 segundos e parar
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
      }, 3000)
    } catch (e) {
      console.error('Erro ao tocar som:', e)
    }
  }

  // Efeito para o carregamento inicial
  useEffect(() => {
    if (isFirstLoad.current && unreadCount > 0 && hasInteracted) {
      playPersistentSound()
      isFirstLoad.current = false
    }
  }, [unreadCount, hasInteracted])

  // Efeito para novas notificações
  useEffect(() => {
    if (!isFirstLoad.current && unreadCount > lastUnreadCount.current && hasInteracted) {
      playPersistentSound()
    }
    lastUnreadCount.current = unreadCount
  }, [unreadCount, hasInteracted])

  return null // Componente invisível apenas para gerenciar som
}
