'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ConversationProvider, useConversationControls, useConversationStatus, useConversationClientTool } from '@elevenlabs/react'
import { Mic, MicOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const AGENT_ID = 'agent_0101kwhjn4ymf3warnf5k6ktfb4y'

function AlphaButton({ userName }: { userName: string }) {
  const { startSession, endSession } = useConversationControls()
  const { status } = useConversationStatus()
  const [loading, setLoading] = useState(false)
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

  const handleClick = useCallback(async () => {
    if (active) {
      await endSession()
      return
    }
    
    if (loading) return
    
    setLoading(true)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      await startSession({
        agentId: AGENT_ID,
      })
    } catch (error) {
      console.error('Erro ao iniciar sessão Alpha:', error)
      setLoading(false)
    }
  }, [active, loading, startSession, endSession])

  useEffect(() => {
    if (status === 'connected' || status === 'disconnected') {
      setLoading(false)
    }
  }, [status])

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-none">
      {active && (
        <div className="bg-[#0f1a14] border border-[#00ff88]/30 rounded-2xl p-4 shadow-2xl w-48 pointer-events-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[#00ff88] text-sm font-semibold">Alpha ativa</span>
          </div>
          <p className="text-gray-400 text-xs">Pode falar!</p>
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-50 pointer-events-auto hover:scale-110 active:scale-95"
        style={{
          backgroundColor: active ? '#0f1a14' : '#00ff88',
          border: '2px solid #00ff88',
          boxShadow: active ? '0 0 20px rgba(0,255,136,0.4)' : '0 0 10px rgba(0,255,136,0.2)',
        }}
      >
        {loading
          ? <div className="w-5 h-5 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          : active
            ? <MicOff size={22} color="#00ff88" />
            : <Mic size={22} color="#0a0f0c" />
        }
      </button>
    </div>
  )
}

export function AlphaWidget() {
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { 
        setUserName('')
        setUserId(null)
        return 
      }
      setUserId(data.user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', data.user.id)
        .single()
      setUserName(profile?.name ?? data.user.email ?? '')
    })
  }, [supabase])

  const handleDisconnect = useCallback(async (conversation: any) => {
    console.log('Alpha desconectada')
    if (!userId || !conversation?.transcript || conversation.transcript.length === 0) return

    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          transcript: conversation.transcript
        })
      
      if (error) throw error
      console.log('Conversa salva com sucesso na memória da Alpha')
    } catch (err) {
      console.error('Erro ao salvar conversa no Supabase:', err)
    }
  }, [userId, supabase])

  if (userName === null) return null

  return (
    <ConversationProvider
      agentId={AGENT_ID}
      onConnect={() => console.log('Alpha conectada')}
      onDisconnect={handleDisconnect}
      onError={(error) => console.error('Erro Alpha:', error)}
    >
      <AlphaButton userName={userName} />
    </ConversationProvider>
  )
}
