'use client'
import { useState, useEffect, useCallback } from 'react'
import { ConversationProvider, useConversationControls, useConversationStatus, useConversationClientTool } from '@elevenlabs/react'
import { Mic, MicOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const AGENT_ID = 'agent_0101kwhjn4ymf3warnf5k6ktfb4y'

function AlphaButton({ userName }: { userName: string }) {
  const { startSession, endSession } = useConversationControls()
  const { status } = useConversationStatus()
  const [loading, setLoading] = useState(false)
  const active = status === 'connected'

  // Registro da ferramenta usando o hook dedicado com assinatura correta (nome, handler)
  useConversationClientTool(
    'buscar_memoria',
    useCallback(async ({ dias }: { dias?: number }) => {
      const supabase = createClient()
      const limite = dias ?? 7
      const desde = new Date()
      desde.setDate(desde.getDate() - limite)
      
      const { data } = await supabase
        .from('conversations')
        .select('start_time, transcript')
        .gte('start_time', desde.toISOString())
        .order('start_time', { ascending: false })
        .limit(10)

      if (!data || data.length === 0) return 'Nenhuma conversa encontrada neste período.'

      return data.map((c) => {
        const dataConversa = c.start_time
          ? new Date(c.start_time).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })
          : 'data desconhecida'
        const transcricao = Array.isArray(c.transcript)
          ? c.transcript.map((t: { role: string; message: string }) =>
              `${t.role === 'agent' ? 'Alpha' : userName}: ${t.message}`).join('\n')
          : 'sem transcrição'
        return `--- ${dataConversa} ---\n${transcricao}`
      }).join('\n\n')
    }, [userName])
  )

  const handleClick = useCallback(async () => {
    if (active) {
      await endSession()
      return
    }
    
    if (loading) return
    
    setLoading(true)
    try {
      // Solicita permissão de microfone explicitamente antes de iniciar
      await navigator.mediaDevices.getUserMedia({ audio: true })
      
      await startSession({
        agentId: AGENT_ID,
      })
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error)
      setLoading(false)
    }
  }, [active, loading, startSession, endSession])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {active && (
        <div className="bg-[#0f1a14] border border-[#00ff88]/30 rounded-2xl p-4 shadow-2xl w-48">
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
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-50"
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
  const [agora, setAgora] = useState('')

  useEffect(() => {
    // Atualiza a hora apenas no cliente para evitar erros de hidratação
    setAgora(new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Fortaleza',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }))

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setUserName(''); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', data.user.id)
        .single()
      setUserName(profile?.name ?? data.user.email ?? '')
    })
  }, [])

  if (userName === null) return null

  return (
    <ConversationProvider
      agentId={AGENT_ID}
      overrides={{
        agent: {
          prompt: {
            prompt: `Você é a Alpha, assistente de voz da Agência Digital Alpha. Você está conversando com ${userName}. Data e hora atual: ${agora}. Cumprimente o usuário de acordo com o horário (bom dia, boa tarde ou boa noite). Quando o usuário pedir para lembrar de conversas anteriores, use a ferramenta buscar_memoria.`,
          },
        },
      }}
    >
      <AlphaButton userName={userName} />
    </ConversationProvider>
  )
}
