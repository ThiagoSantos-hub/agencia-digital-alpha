// hooks/useAlphaAI.ts
// Hook React que consome POST /api/ai
// Gerencia estado de mensagens, loading, erro e áudio
// Projeto: Agência Digital Alpha

import { useState, useCallback, useRef } from 'react'

// ── Tipos locais ──────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id:        string
  role:      ChatRole
  content:   string
  audio?:    string | null   // base64 — só nas respostas da Alpha com voz
  createdAt: Date
}

export interface UseAlphaAIReturn {
  messages:     ChatMessage[]
  loading:      boolean
  error:        string | null
  sendMessage:  (texto: string) => Promise<void>
  sendVoice:    (texto: string) => Promise<void>
  clearHistory: () => void
}

// ── Helpers ───────────────────────────────────────────────────

function gerarId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Hook principal ────────────────────────────────────────────

export function useAlphaAI(): UseAlphaAIReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Ref para reproduzir áudio sem re-render
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ── Chamada à API ─────────────────────────────────────────

  const chamarAPI = useCallback(async (
    texto:      string,
    incluirVoz: boolean
  ): Promise<void> => {
    setLoading(true)
    setError(null)

    // Adiciona mensagem do usuário imediatamente (UX responsiva)
    const msgUsuario: ChatMessage = {
      id:        gerarId(),
      role:      'user',
      content:   texto,
      createdAt: new Date(),
    }
    setMessages(prev => [...prev, msgUsuario])

    try {
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mensagem: texto, incluirVoz }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Erro ${res.status}`)
      }

      const data = await res.json()

      // Adiciona resposta da Alpha
      const msgAlpha: ChatMessage = {
        id:        gerarId(),
        role:      'assistant',
        content:   data.resposta ?? '',
        audio:     data.audio    ?? null,
        createdAt: new Date(),
      }
      setMessages(prev => [...prev, msgAlpha])

      // Reproduz áudio se vier na resposta
      if (data.audio) {
        try {
          const audioBlob = base64ToBlob(data.audio, 'audio/mpeg')
          const audioUrl  = URL.createObjectURL(audioBlob)
          if (audioRef.current) {
            audioRef.current.pause()
            URL.revokeObjectURL(audioRef.current.src)
          }
          audioRef.current = new Audio(audioUrl)
          audioRef.current.play().catch(() => {})
        } catch {
          // Falha no áudio não interrompe o chat
        }
      }

    } catch (err: any) {
      setError(err.message ?? 'Erro ao falar com a Alpha.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Métodos públicos ──────────────────────────────────────

  // Envia mensagem de texto — sem síntese de voz na resposta
  const sendMessage = useCallback((texto: string) => {
    if (!texto.trim() || loading) return Promise.resolve()
    return chamarAPI(texto.trim(), false)
  }, [chamarAPI, loading])

  // Envia mensagem de texto — com síntese de voz (ElevenLabs TTS) na resposta
  const sendVoice = useCallback((texto: string) => {
    if (!texto.trim() || loading) return Promise.resolve()
    return chamarAPI(texto.trim(), true)
  }, [chamarAPI, loading])

  // Limpa o histórico local (não apaga o Supabase — use MemoryService.limpar() se necessário)
  const clearHistory = useCallback(() => {
    setMessages([])
    setError(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }, [])

  return { messages, loading, error, sendMessage, sendVoice, clearHistory }
}

// ── Utilitário ────────────────────────────────────────────────

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes    = atob(base64)
  const buffer   = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    buffer[i] = bytes.charCodeAt(i)
  }
  return new Blob([buffer], { type: mimeType })
}
