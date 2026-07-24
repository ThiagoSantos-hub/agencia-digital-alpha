'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Lock } from 'lucide-react'
import { WhatsAppConnect } from '@/components/whatsapp/WhatsAppConnect'
import { PersonalAIKeysCard } from '@/components/ai/PersonalAIKeysCard'
import { getIntegrationErrorMessage } from '@/lib/integrationErrorMessages'

const INTEGRATION_ICONS: Record<string, string> = {
  meta_ads: 'https://cdn.simpleicons.org/meta',
  google_ads: 'https://www.gstatic.com/images/branding/product/2x/google_ads_48dp.png',
  google_drive: 'https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
  openai: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/200px-OpenAI_Logo.svg.png',
  elevenlabs: 'https://cdn.simpleicons.org/elevenlabs',
  whatsapp: 'https://cdn.simpleicons.org/whatsapp',
  email: 'https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png',
}

const INTEGRATION_EMOJI: Record<string, string> = {
  meta_ads: '📣', whatsapp: '💬', openai: '🤖', elevenlabs: '🎙️',
  google_drive: '📁', google_ads: '🎯', google_calendar: '📅', email: '📧',
}

function IntegrationIcon({ type }: { type: string }) {
  const [error, setError] = useState(false)
  const src = INTEGRATION_ICONS[type]
  if (!src || error) return <span className="text-2xl">{INTEGRATION_EMOJI[type] ?? '🔌'}</span>
  return <img src={src} alt={type} width={32} height={32} className="w-8 h-8 object-contain" onError={() => setError(true)} />
}

export default function IntegracoesColaboradorPage() {
  const { user } = useAuth()
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const supabase = createClient()

  const [metaConnected, setMetaConnected] = useState(false)
  const [googleAdsConnected, setGoogleAdsConnected] = useState(false)
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false)
  const [emailConnected, setEmailConnected] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'meta_connected') setSuccessMsg('Meta Ads conectado com sucesso!')
    const errorCode = params.get('error')
    if (errorCode) setErrorMsg(getIntegrationErrorMessage(errorCode))
    if (params.get('success') || errorCode) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    async function fetchData() {
      if (!user) return
      try {
        const { data: collaborator } = await supabase.from('collaborators').select('id').eq('user_id', user.id).single()
        if (!collaborator) return
        setCollaboratorId(collaborator.id)
        const { data: integrations } = await supabase.from('collaborator_integrations').select('type, api_key').eq('collaborator_id', collaborator.id)
        if (integrations) {
          integrations.forEach(int => {
            if (int.type === 'meta_ads') setMetaConnected(!!int.api_key)
            if (int.type === 'google_ads') setGoogleAdsConnected(!!int.api_key)
            if (int.type === 'google_drive') setGoogleDriveConnected(!!int.api_key)
            if (int.type === 'email') setEmailConnected(!!int.api_key)
          })
        }
      } catch (error) {
        console.error('Erro ao buscar integrações:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user, supabase])

  const handleDisconnectOAuth = async (type: string) => {
    if (!collaboratorId) return
    await supabase.from('collaborator_integrations').delete().eq('collaborator_id', collaboratorId).eq('type', type)
    if (type === 'meta_ads') setMetaConnected(false)
    if (type === 'google_ads') setGoogleAdsConnected(false)
    if (type === 'google_drive') setGoogleDriveConnected(false)
    if (type === 'email') setEmailConnected(false)
    setSuccessMsg(`${type.replace('_', ' ')} desconectado.`)
  }

  const cardCls = 'rounded-xl p-4 bg-surface border border-border shadow-sm'
  const btnPrimary = 'text-xs px-3 py-1.5 rounded-lg font-medium bg-primary text-white hover:bg-primary-hover transition-colors'
  const btnDanger = 'text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin border-primary border-t-transparent" />
      </div>
    )
  }

  const OauthCard = ({ type, label, connected, href }: { type: string; label: string; connected: boolean; href: string }) => (
    <div className={`${cardCls} flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background"><IntegrationIcon type={type} /></div>
        <div>
          <p className="text-text-main text-sm font-medium">{label}</p>
          <p className={`text-xs mt-0.5 ${connected ? 'text-cta' : 'text-text-disabled'}`}>{connected ? 'Conectado' : 'Desconectado'}</p>
        </div>
      </div>
      {connected ? (
        <button onClick={() => handleDisconnectOAuth(type)} className={btnDanger}>Desconectar</button>
      ) : (
        <a href={href} className={btnPrimary}>Conectar</a>
      )}
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-text-main text-2xl font-bold">Integrações</h1>
          <p className="text-sm mt-1 text-text-muted">Conecte suas ferramentas e visualize as integrações da agência.</p>
        </div>
        <a
          href="https://wa.me/5585992307273"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-cta hover:text-cta-hover flex items-center gap-1.5 shrink-0"
        >
          💬 Suporte via WhatsApp
        </a>
      </div>

      {successMsg && <div className="p-3 rounded-lg text-sm font-medium bg-cta/10 text-cta border border-cta/30">✅ {successMsg}</div>}
      {errorMsg && <div className="p-3 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200">❌ {errorMsg}</div>}

      <section>
        <h2 className="text-text-main text-lg font-semibold mb-1">Meu WhatsApp</h2>
        <p className="text-xs mb-4 text-text-muted">Conecte seu WhatsApp pessoal para enviar relatórios automáticos para seus contatos e grupos.</p>
        <WhatsAppConnect showGroupsButton={true} />
      </section>

      <section>
        <h2 className="text-text-main text-lg font-semibold mb-1">Minha IA</h2>
        <p className="text-xs mb-4 text-text-muted">
          Conecte sua própria chave pra usar o Alpha AI. Cada pessoa usa a própria IA, ninguém usa a chave de outro.
        </p>
        <PersonalAIKeysCard />
      </section>

      <section>
        <h2 className="text-text-main text-lg font-semibold mb-4">Minhas Conexões</h2>
        <p className="text-xs mb-4 text-text-muted">
          Gmail e Google Agenda agora são conectados na tela de <a href="/colaborador/agenda" className="text-primary underline">Agenda</a>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OauthCard type="google_ads" label="Google Ads Pessoal" connected={googleAdsConnected} href="/api/integrations/connect/google?type=google_ads" />
          <OauthCard type="google_drive" label="Google Drive" connected={googleDriveConnected} href="/api/integrations/connect/google?type=google_drive" />
          <OauthCard type="email" label="Google E-mail" connected={emailConnected} href="/api/integrations/connect/google?type=email" />
          <OauthCard type="meta_ads" label="Meta Ads Pessoal" connected={metaConnected} href="/api/integrations/connect/meta-collaborator" />
        </div>
      </section>

      <section>
        <h2 className="text-text-main text-lg font-semibold mb-2">Integrações da Agência</h2>
        <p className="text-xs mb-4 text-text-muted">Gerenciadas pelo administrador. Você utiliza automaticamente.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { type: 'whatsapp', label: 'WhatsApp (Agência)' },
            { type: 'meta_ads', label: 'Meta Ads (Agência)' },
          ].map(item => (
            <div key={item.type} className={`${cardCls} flex items-center justify-between opacity-80`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background"><IntegrationIcon type={item.type} /></div>
                <div>
                  <p className="text-text-main text-sm font-medium">{item.label}</p>
                  <p className="text-xs mt-0.5 text-cta">Ativo pela agência</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Lock size={10} /> Admin
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
