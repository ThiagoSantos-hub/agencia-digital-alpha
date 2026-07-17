'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Lock } from 'lucide-react'
import { WhatsAppConnect } from '@/components/whatsapp/WhatsAppConnect'

const INTEGRATION_ICONS: Record<string, string> = {
  meta_ads: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/200px-Meta_Platforms_Inc._logo.svg.png',
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
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const [emailConnected, setEmailConnected] = useState(false)
  const [openaiKey, setOpenaiKey] = useState('')
  const [elevenlabsKey, setElevenlabsKey] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'meta_connected') setSuccessMsg('Meta Ads conectado com sucesso!')
    if (params.get('error')) setErrorMsg('Erro ao conectar. Tente novamente.')
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
            if (int.type === 'google_calendar') setGoogleCalendarConnected(!!int.api_key)
            if (int.type === 'email') setEmailConnected(!!int.api_key)
            if (int.type === 'openai') setOpenaiKey(int.api_key || '')
            if (int.type === 'elevenlabs') setElevenlabsKey(int.api_key || '')
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
    if (type === 'google_calendar') setGoogleCalendarConnected(false)
    if (type === 'email') setEmailConnected(false)
    setSuccessMsg(`${type.replace('_', ' ')} desconectado.`)
  }

  const handleSaveApiKey = async (type: string, apiKey: string) => {
    if (!collaboratorId) return
    setSaving(type)
    try {
      if (!apiKey) {
        await supabase.from('collaborator_integrations').delete().eq('collaborator_id', collaboratorId).eq('type', type)
        setSuccessMsg(`${type} desconectado.`)
      } else {
        await supabase.from('collaborator_integrations').upsert({
          collaborator_id: collaboratorId, type, api_key: apiKey, updated_at: new Date().toISOString()
        }, { onConflict: 'collaborator_id,type' })
        setSuccessMsg(`${type} salvo com sucesso!`)
      }
    } catch {
      setErrorMsg(`Erro ao salvar ${type}.`)
    } finally {
      setSaving(null)
    }
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
      <div>
        <h1 className="text-text-main text-2xl font-bold">Integrações</h1>
        <p className="text-sm mt-1 text-text-muted">Conecte suas ferramentas e visualize as integrações da agência.</p>
      </div>

      {successMsg && <div className="p-3 rounded-lg text-sm font-medium bg-cta/10 text-cta border border-cta/30">✅ {successMsg}</div>}
      {errorMsg && <div className="p-3 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200">❌ {errorMsg}</div>}

      <section>
        <h2 className="text-text-main text-lg font-semibold mb-1">Meu WhatsApp</h2>
        <p className="text-xs mb-4 text-text-muted">Conecte seu WhatsApp pessoal para enviar relatórios automáticos para seus contatos e grupos.</p>
        <WhatsAppConnect />
      </section>

      <section>
        <h2 className="text-text-main text-lg font-semibold mb-4">Minhas Conexões</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { type: 'openai', label: 'OpenAI', key: openaiKey, setKey: setOpenaiKey },
            { type: 'elevenlabs', label: 'ElevenLabs', key: elevenlabsKey, setKey: setElevenlabsKey },
          ].map(item => (
            <div key={item.type} className={`${cardCls} flex flex-col justify-between gap-4`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background"><IntegrationIcon type={item.type} /></div>
                <div>
                  <p className="text-text-main text-sm font-medium">{item.label}</p>
                  <p className={`text-xs mt-0.5 ${item.key ? 'text-cta' : 'text-text-disabled'}`}>{item.key ? 'Conectado' : 'Desconectado'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="password" placeholder="API Key..." value={item.key} onChange={(e) => item.setKey(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-primary/50" />
                <button onClick={() => handleSaveApiKey(item.type, item.key)} disabled={saving === item.type} className={btnPrimary}>
                  {saving === item.type ? '...' : item.key ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </div>
          ))}

          <OauthCard type="google_ads" label="Google Ads Pessoal" connected={googleAdsConnected} href="/api/integrations/connect/google?type=google_ads" />
          <OauthCard type="google_drive" label="Google Drive" connected={googleDriveConnected} href="/api/integrations/connect/google?type=google_drive" />
          <OauthCard type="google_calendar" label="Google Agenda" connected={googleCalendarConnected} href="/api/integrations/connect/google?type=google_calendar" />
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
