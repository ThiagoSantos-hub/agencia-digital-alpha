'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ConversationProvider, useConversationControls, useConversationStatus, useConversationClientTool } from '@elevenlabs/react'
import { Mic, MicOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { AlphaJarvisHUD } from '@/components/ai/AlphaJarvisHUD'

function AlphaButton({ userName, agentId }: { userName: string; agentId: string }) {
  const { startSession, endSession } = useConversationControls()
  const { status } = useConversationStatus()
  const [loading, setLoading] = useState(false)
  const [hudOpen, setHudOpen] = useState(false)
  const active = status === 'connected'

  const userNameRef = useRef(userName)
  useEffect(() => {
    userNameRef.current = userName
  }, [userName])

  const supabase = useMemo(() => createClient(), [])

  useConversationClientTool(
    'buscar_memoria',
    useCallback(async ({ dias }: { dias?: number }) => {
      try {
        const limite = dias ?? 7
        const desde = new Date()
        desde.setDate(desde.getDate() - limite)

        const { data, error } = await supabase
          .from('conversations')
          .select('created_at, transcript')
          .gte('created_at', desde.toISOString())
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        if (!data || data.length === 0) return 'Nenhuma conversa encontrada neste período.'

        return data.map((c) => {
          const dataConversa = c.created_at
            ? new Date(c.created_at).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })
            : 'data desconhecida'
          const transcricao = Array.isArray(c.transcript)
            ? c.transcript.map((t: { role: string; message: string }) =>
                `${t.role === 'agent' ? 'Alpha' : userNameRef.current}: ${t.message}`).join('\n')
            : 'sem transcrição'
          return `--- ${dataConversa} ---\n${transcricao}`
        }).join('\n\n')
      } catch (err) {
        console.error('Erro na ferramenta buscar_memoria:', err)
        return 'Erro ao buscar memórias.'
      }
    }, [supabase])
  )

  useEffect(() => {
    if (active) setHudOpen(true)
  }, [active])

  const handleClick = useCallback(async () => {
    if (active) {
      try { await endSession() } catch {}
      setHudOpen(false)
      return
    }

    if (loading) return

    setLoading(true)
    setHudOpen(true)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      await startSession({ agentId })
    } catch (error) {
      console.warn('[Alpha] Erro ao iniciar sessão:', error)
      setLoading(false)
    }
  }, [active, loading, startSession, endSession, agentId])

  const handleCloseHud = useCallback(async () => {
    try { await endSession() } catch {}
    setHudOpen(false)
  }, [endSession])

  useEffect(() => {
    if (status === 'connected' || status === 'disconnected') {
      setLoading(false)
    }
    if (status === 'disconnected') {
      // mantém HUD só se ainda quiser — fecha ao desconectar
    }
  }, [status])

  const statusLabel = loading
    ? 'CONECTANDO'
    : active
      ? 'CONECTADA · FALE AGORA'
      : 'PRONTA'

  return (
    <>
      <AlphaJarvisHUD
        open={hudOpen}
        onClose={handleCloseHud}
        mode="eleven"
        voiceState={active ? 'listening' : loading ? 'processing' : 'idle'}
        statusLabel={statusLabel}
        transcript={active ? 'Sessão de voz ElevenLabs ativa' : ''}
        lastResponse={active ? 'Alpha está ouvindo e respondendo em tempo real.' : ''}
      />

      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 border ${
          active
            ? 'bg-ai border-ai text-white'
            : 'bg-primary border-primary text-white'
        }`}
      >
        {loading
          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : active
            ? <MicOff size={16} />
            : <Mic size={16} />
        }
      </button>
    </>
  )
}

export function AlphaWidget() {
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [keysChecked, setKeysChecked] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setUserName('')
        setUserId(null)
        setKeysChecked(true)
        return
      }
      setUserId(data.user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', data.user.id)
        .single()
      setUserName(profile?.name ?? data.user.email ?? '')

      try {
        const res = await fetch('/api/ai/keys')
        const json = await res.json()
        setAgentId(json.elevenlabsAgentId ?? null)
      } finally {
        setKeysChecked(true)
      }
    })
  }, [supabase])

  const handleDisconnect = useCallback(async (conversation: any) => {
    if (!userId || !conversation?.transcript || conversation.transcript.length === 0) return
    try {
      await supabase.from('conversations').insert({
        user_id: userId,
        transcript: conversation.transcript
      })
    } catch (err) {
      console.error('[Alpha] Erro ao salvar conversa:', err)
    }
  }, [userId, supabase])

  const handleError = useCallback((error: any) => {
    const tipo = error?.error_type ?? error?.type ?? 'desconhecido'
    console.warn('[Alpha] Erro SDK:', tipo)
  }, [])

  if (userName === null || !keysChecked) return null

  if (!agentId) {
    return (
      <a
        href="/integracoes"
        title="Configure seu assistente de voz em Integrações"
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-hover-bg border border-border text-text-disabled hover:text-text-muted transition-colors"
      >
        <Mic size={16} />
      </a>
    )
  }

  return (
    <ConversationProvider
      agentId={agentId}
      onConnect={() => console.log('[Alpha] conectada')}
      onDisconnect={handleDisconnect}
      onError={handleError}
    >
      <AlphaButton userName={userName} agentId={agentId} />
    </ConversationProvider>
  )
}
