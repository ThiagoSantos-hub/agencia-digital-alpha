
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle2, AlertCircle, Lock } from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agencia-digital-alpha.vercel.app'

const INTEGRATION_ICONS: Record<string, string> = {
  meta_ads: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/200px-Meta_Platforms_Inc._logo.svg.png',
}

const INTEGRATION_EMOJI: Record<string, string> = {
  meta_ads: '📣',
  whatsapp: '💬',
  openai: '🤖',
  elevenlabs: '🎙️',
  google_drive: '📁',
  google_ads: '🎯',
}

function IntegrationIcon({ type }: { type: string }) {
  const [error, setError] = useState(false)
  const src = INTEGRATION_ICONS[type]
  if (!src || error) {
    return <span className="text-2xl">{INTEGRATION_EMOJI[type] ?? '🔌'}</span>
  }
  return (
    <img src={src} alt={type} width={32} height={32}
      className="w-8 h-8 object-contain"
      onError={() => setError(true)} />
  )
}

export default function IntegracoesColaboradorPage() {
  const { user } = useAuth()
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null)
  const [metaConnected, setMetaConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'meta_connected') {
      setSuccessMsg('Meta Ads conectado com sucesso!')
    }
    if (params.get('error')) {
      setErrorMsg('Erro ao conectar. Tente novamente.')
    }
  }, [])

  useEffect(() => {
    async function fetchData() {
      if (!user) return
      try {
        const { data: collaborator } = await supabase
          .from('collaborators')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!collaborator) return
        setCollaboratorId(collaborator.id)

        const { data: integration } = await supabase
          .from('collaborator_integrations')
          .select('api_key')
          .eq('collaborator_id', collaborator.id)
          .eq('type', 'meta_ads')
          .maybeSingle()

        setMetaConnected(!!integration?.api_key)
      } catch (error) {
        console.error('Erro ao buscar integrações:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user, supabase])

  const handleDisconnectMeta = async () => {
    if (!collaboratorId) return
    await supabase
      .from('collaborator_integrations')
      .delete()
      .eq('collaborator_id', collaboratorId)
      .eq('type', 'meta_ads')
    setMetaConnected(false)
    setSuccessMsg('Meta Ads desconectado.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: '#00ff88', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-white text-2xl font-bold">Integrações</h1>
        <p className="text-sm mt-1" style={{ color: '#4a7a5a' }}>
          Conecte suas ferramentas e visualize as integrações da agência.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#0a2a1a', color: '#00ff88', border: '1px solid #1a3a24' }}>
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#2a0a0a', color: '#ff4444', border: '1px solid #3a1a1a' }}>
          ❌ {errorMsg}
        </div>
      )}

      <section>
        <h2 className="text-white text-lg font-semibold mb-4">Minhas Conexões</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Meta Ads Pessoal — OAuth */}
          <div className="rounded-xl p-4 flex items-center justify-between"
            style={{ backgroundColor: '#0f1f14', border: '1px solid #1a3a24' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg"
                style={{ backgroundColor: '#0a0f0c' }}>
                <IntegrationIcon type="meta_ads" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Meta Ads Pessoal</p>
                <p className="text-xs mt-0.5" style={{ color: metaConnected ? '#00ff88' : '#4a7a5a' }}>
                  {metaConnected ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
            </div>
            {metaConnected ? (
              <button onClick={handleDisconnectMeta}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: '#1a0a0a', color: '#ff4444', border: '1px solid #3a1a1a' }}>
                Desconectar
              </button>
            ) : (
              <a href="/api/integrations/connect/meta-collaborator"
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: '#00ff88', color: '#0a0f0c' }}>
                Conectar
              </a>
            )}
          </div>

        </div>
      </section>

      <section>
        <h2 className="text-white text-lg font-semibold mb-2">Integrações da Agência</h2>
        <p className="text-xs mb-4" style={{ color: '#4a7a5a' }}>
          Gerenciadas pelo administrador. Você utiliza automaticamente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Meta Ads Agência — somente leitura */}
          <div className="rounded-xl p-4 flex items-center justify-between"
            style={{ backgroundColor: '#0f1f14', border: '1px solid #1a3a24', opacity: 0.7 }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg"
                style={{ backgroundColor: '#0a0f0c' }}>
                <IntegrationIcon type="meta_ads" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Meta Ads (Agência)</p>
                <p className="text-xs mt-0.5" style={{ color: '#00ff88' }}>
                  Ativo pela agência
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: '#0a1a2a', color: '#4a8aaa', border: '1px solid #1a3a4a' }}>
              <Lock size={10} /> Admin
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
