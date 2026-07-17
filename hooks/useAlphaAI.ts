// hooks/useAlphaAI.ts
'use client'
import { useState, useCallback, useRef } from 'react'
import { loadNotes, stripAndApplySaves } from '@/lib/ai/secondBrain'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  audio?: string | null
  createdAt: Date
}

export interface UseAlphaAIReturn {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  sendMessage: (texto: string) => Promise<void>
  sendVoice: (texto: string) => Promise<void>
  sendAudio: (blob: Blob, mimeType: string) => Promise<void>
  clearHistory: () => void
}

function gerarId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function useAlphaAI(): UseAlphaAIReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const chamarAPI = useCallback(async (texto: string, incluirVoz: boolean): Promise<void> => {
    setLoading(true)
    setError(null)

    const msgUsuario: ChatMessage = {
      id: gerarId(),
      role: 'user',
      content: texto,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, msgUsuario])

    try {
      const notes = loadNotes()
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: texto, incluirVoz, notes }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Erro ${res.status}`)
      }
      const data = await res.json()
      const { clean } = stripAndApplySaves(data.resposta ?? '')

      const msgAlpha: ChatMessage = {
        id: gerarId(),
        role: 'assistant',
        content: clean,
        audio: data.audio ?? null,
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, msgAlpha])

      if (data.audio) {
        try {
          const blob = base64ToBlob(data.audio, 'audio/mpeg')
          const url = URL.createObjectURL(blob)
          if (audioRef.current) {
            audioRef.current.pause()
            URL.revokeObjectURL(audioRef.current.src)
          }
          audioRef.current = new Audio(url)
          audioRef.current.play().catch(() => {})
        } catch {
          /* ignore */
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro ao falar com a Alpha.')
    } finally {
      setLoading(false)
    }
  }, [])

  const sendMessage = useCallback(
    (texto: string) => {
      if (!texto.trim() || loading) return Promise.resolve()
      return chamarAPI(texto.trim(), false)
    },
    [chamarAPI, loading]
  )

  const sendVoice = useCallback(
    (texto: string) => {
      if (!texto.trim() || loading) return Promise.resolve()
      return chamarAPI(texto.trim(), true)
    },
    [chamarAPI, loading]
  )

  const sendAudio = useCallback(
    async (blob: Blob, mimeType: string): Promise<void> => {
      if (loading) return
      setLoading(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append('audio', blob, `gravacao.${mimeType.includes('webm') ? 'webm' : 'mp4'}`)
        formData.append('mimeType', mimeType)

        const transRes = await fetch('/api/ai/transcribe', { method: 'POST', body: formData })
        if (!transRes.ok) throw new Error('Erro na transcrição do áudio')
        const { texto } = await transRes.json()
        if (!texto?.trim()) throw new Error('Não consegui entender o áudio. Tente novamente.')

        setLoading(false)
        await chamarAPI(texto.trim(), true)
      } catch (err: any) {
        setError(err.message ?? 'Erro ao processar áudio.')
        setLoading(false)
      }
    },
    [chamarAPI, loading]
  )

  const clearHistory = useCallback(() => {
    setMessages([])
    setError(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }, [])

  return { messages, loading, error, sendMessage, sendVoice, sendAudio, clearHistory }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  return new Blob([buffer], { type: mimeType })
}
