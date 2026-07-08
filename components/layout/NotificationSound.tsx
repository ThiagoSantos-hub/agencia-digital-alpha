'use client'

import { useEffect, useRef, useState } from 'react'
import { useNotificacoes } from '@/hooks/useNotificacoes'

export function NotificationSound() {
  const { naoLidas: unreadCount, notificacoes: notifications } = useNotificacoes()
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
    // Tentativa mais agressiva de tocar o som
    try {
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 1.0
      audio.loop = true // Ativar loop para garantir que o som continue
      
      const playPromise = audio.play()
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Parar após exatamente 3 segundos
          setTimeout(() => {
            audio.pause()
            audio.currentTime = 0
          }, 3000)
        }).catch(e => {
          console.warn('Navegador bloqueou o som. Aguardando interação.', e)
        })
      }
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
