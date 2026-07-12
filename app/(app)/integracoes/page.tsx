'use client'

import { useEffect, useState } from 'react'
import { WhatsAppConnect } from '@/components/whatsapp/WhatsAppConnect'

interface Integration {
  id: string
  type: string
  label: string
  status: string
  connected_at: string | null
  token_expiry: string | null
  config: Record<string, string>
}

interface Webhook {
  id: string
  slot: number
  name: string | null
  url: string | null
  event: string | null
  active: boolean
}

const OAUTH_INTEGRATIONS = [
  'google_ads', 'gmail', 'google_drive', 'google_calendar',
  'meta_ads', 'meta_ads_2', 'meta_ads_3', 'meta_ads_4',
]
const GOOGLE_INTEGRATIONS = ['google_ads', 'gmail', 'google_drive', 'google_calendar']
const META_INTEGRATIONS = ['meta_ads', 'meta_ads_2', 'meta_ads_3', 'meta_ads_4']

const INTEGRATION_ICONS: Record<string, string> = {
  google_ads: 'https://www.gstatic.com/images/branding/product/2x/google_ads_48dp.png',
  gmail: 'https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png',
  google_drive: 'https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
  google_calendar: 'https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png',
  meta_ads: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/200px-Meta_Platforms_Inc._logo.svg.png',
  meta_ads_2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/200px-Meta_Platforms_Inc._logo.svg.png',
  meta_ads_3: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/200px-Meta_Platforms_Inc._logo.svg.png',
  meta_ads_4: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/200px-Meta_Platforms_Inc._logo.svg.png',
  brevo: 'https://www.brevo.com/wp-content/uploads/2023/01/brevo-logo.svg',
  openai: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/200px-OpenAI_Logo.svg.png',
  evolution_api: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/200px-WhatsApp.svg.png',
  n8n: 'https://n8n.io/favicon.ico',
  elevenlabs: 'https://elevenlabs.io/favicon.ico',
}

const INTEGRATION_EMOJI: Record<string, string> = {
  google_ads: '🎯',
  gmail: '📧',
  google_drive: '📁',
  google_calendar: '📅',
  meta_ads: '📣',
  meta_ads_2: '📣',
  meta_ads_3: '📣',
  meta_ads_4: '📣',
  brevo: '💌',
  openai: '🤖',
  evolution_api: '💬',
  n8n: '⚡',
  elevenlabs: '🎙️',
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agencia-digital-alpha.vercel.app'

function ElevenLabsCard({
  integration,
  onSave,
  onDisconnect,
  saving,
}: {
  integration: Integration
  onSave: (apiKey: string, agentId: string) => void
  onDisconnect: () => void
  saving: boolean
}) {
  const [apiKey, setApiKey] = useState('')
  const [agentId, setAgentId] = useState(integration.config?.agent_id || '')
  const [copied, setCopied] = useState(false)
  const webhookUrl = `${APP_URL}/api/elevenlabs/webhook`

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#0f1f14', border: '1px solid #1a3a24' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ backgroundColor: '#0a0f0c' }}>
            <IntegrationIcon type="elevenlabs" />
          </div>
          <div>
            <p className="text-[#1E293B] text-sm font-medium">{integration.label}</p>
            <p className="text-xs" style={{ color: integration.status === 'connected' ? '#00ff88' : '#4a7a5a' }}>
              {integration.status === 'connected' ? 'Conectado' : 'Desconectado'}
            </p>
          </div>
        </div>
        {integration.status === 'connected' && (
          <button
            onClick={onDisconnect}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#1a0a0a', color: '#ff4444', border: '1px solid #3a1a1a' }}
          >
            Remover
          </button>
        )}
      </div>

      {integration.status !== 'connected' ? (
        <div className="space-y-2">
          <input
            type="password"
            placeholder="API Key do ElevenLabs (xi-api-key)"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg outline-none"
            style={{ backgroundColor: '#0a0f0c', color: 'white', border: '1px solid #1a3a24' }}
          />
          <input
            type="text"
            placeholder="Agent ID (criado no ElevenAgents)"
            value={agentId}
            onChange={e => setAgentId(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg outline-none"
            style={{ backgroundColor: '#0a0f0c', color: 'white', border: '1px solid #1a3a24' }}
          />
          <button
            onClick={() => onSave(apiKey, agentId)}
            disabled={saving || !apiKey || !agentId}
            className="w-full text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundColor: '#00ff88', color: '#0a0f0c' }}
          >
            {saving ? 'Salvando...' : 'Salvar e conectar'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: '#4a7a5a' }}>
            Agent ID: <span className="text-[#1E293B]">{integration.config?.agent_id}</span>
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={webhookUrl}
              className="flex-1 text-xs px-3 py-2 rounded-lg outline-none"
              style={{ backgroundColor: '#0a0f0c', color: '#4a7a5a', border: '1px solid #1a3a24' }}
            />
            <button
              onClick={copyWebhook}
              className="text-xs px-3 py-2 rounded-lg"
              style={{ backgroundColor: '#0a0f0c', color: '#00ff88', border: '1px solid #1a3a24' }}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: '#4a7a5a' }}>
            Cole essa URL no painel ElevenLabs em Agent → Webhooks → Post-call transcription.
          </p>
        </div>
      )}
    </div>
  )
}

const WEBHOOK_EVENTS = [
  'cliente.criado',
  'cliente.atualizado',
  'campanha.criada',
  'campanha.atualizada',
  'relatorio.gerado',
]

function IntegrationIcon({ type }: { type: string }) {
  const [error, setError] = useState(false)
  const src = INTEGRATION_ICONS[type]

  if (!src || error) {
    return <span className="text-2xl">{INTEGRATION_EMOJI[type] ?? '🔌'}</span>
  }

  return (
    <img
      src={src}
      alt={type}
      width={32}
      height={32}
      className="w-8 h-8 object-contain"
      onError={() => setError(true)}
    />
  )
}

export default function IntegracoesPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'google_connected') {
      const service = params.get('service')
      setSuccessMsg(
        service
          ? `Conta Google conectada com sucesso em ${service.replace('_', ' ')}!`
          : 'Google conectado com sucesso!'
      )
    }
    if (params.get('success') === 'meta_connected') {
      const slot = params.get('slot')
      setSuccessMsg(slot && slot !== 'meta_ads' ? `Meta Ads (${slot.replace('meta_ads_', '#')}) conectado com sucesso!` : 'Meta Ads conectado com sucesso!')
    }
    if (params.get('error')) setErrorMsg('Erro ao conectar. Tente novamente.')
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [intRes, whRes] = await Promise.all([
      fetch('/api/integrations'),
      fetch('/api/webhooks'),
    ])
    if (intRes.ok) setIntegrations(await intRes.json())
    if (whRes.ok) setWebhooks(await whRes.json())
    setLoading(false)
  }

  async function saveApiKey(type: string) {
    const key = apiKeys[type]
    if (!key) return
    setSavingKey(type)
    const res = await fetch('/api/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, access_token: key }),
    })
    if (res.ok) {
      setSuccessMsg(`${type} conectado com sucesso!`)
      setApiKeys(prev => ({ ...prev, [type]: '' }))
      fetchData()
    } else {
      setErrorMsg('Erro ao salvar chave.')
    }
    setSavingKey(null)
  }

  async function disconnect(type: string) {
    await fetch(`/api/integrations?type=${type}`, { method: 'DELETE' })
    fetchData()
  }

  async function saveElevenLabs(apiKey: string, agentId: string) {
    setSavingKey('elevenlabs')
    const res = await fetch('/api/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'elevenlabs', access_token: apiKey, config: { agent_id: agentId } }),
    })
    if (res.ok) {
      setSuccessMsg('ElevenLabs conectado com sucesso!')
      fetchData()
    } else {
      setErrorMsg('Erro ao salvar ElevenLabs.')
    }
    setSavingKey(null)
  }

  async function saveWebhook(slot: number, field: string, value: string | boolean) {
    await fetch('/api/webhooks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, [field]: value }),
    })
    fetchData()
  }

  async function clearWebhook(slot: number) {
    await fetch(`/api/webhooks?slot=${slot}`, { method: 'DELETE' })
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#00ff88', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-[#1E293B] text-2xl font-bold">Integrações</h1>
        <p className="text-sm mt-1" style={{ color: '#4a7a5a' }}>
          Conecte suas ferramentas e automatize sua agência
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg text-sm font-medium" style={{ backgroundColor: '#0a2a1a', color: '#00ff88', border: '1px solid #1a3a24' }}>
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg text-sm font-medium" style={{ backgroundColor: '#2a0a0a', color: '#ff4444', border: '1px solid #3a1a1a' }}>
          ❌ {errorMsg}
        </div>
      )}

      <section>
        <h2 className="text-[#1E293B] text-lg font-semibold mb-4">Conexões OAuth</h2>
        <p className="text-xs mb-4" style={{ color: '#4a7a5a' }}>
          Cada serviço do Google pode ser conectado com uma conta diferente. Ao clicar em "Conectar", o Google vai pedir para você escolher a conta.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations
            .filter(i => OAUTH_INTEGRATIONS.includes(i.type))
            .map(integration => (
              <div
                key={integration.type}
                className="rounded-xl p-4 flex items-center justify-between"
                style={{ backgroundColor: '#0f1f14', border: '1px solid #1a3a24' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ backgroundColor: '#0a0f0c' }}>
                    <IntegrationIcon type={integration.type} />
                  </div>
                  <div>
                    <p className="text-[#1E293B] text-sm font-medium">{integration.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: integration.status === 'connected' ? '#00ff88' : '#4a7a5a' }}>
                      {integration.status === 'connected'
                        ? `Conectado${integration.connected_at ? ' em ' + new Date(integration.connected_at).toLocaleDateString('pt-BR') : ''}`
                        : 'Desconectado'}
                    </p>
                    {integration.status === 'connected' && integration.config?.connected_email && (
                      <p className="text-xs mt-0.5" style={{ color: '#4a7a5a' }}>
                        {integration.config.connected_email}
                      </p>
                    )}
                  </div>
                </div>
                {integration.status === 'connected' ? (
                  <button
                    onClick={() => disconnect(integration.type)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: '#1a0a0a', color: '#ff4444', border: '1px solid #3a1a1a' }}
                  >
                    Desconectar
                  </button>
                ) : (
                  <a
                    href={
                      GOOGLE_INTEGRATIONS.includes(integration.type)
                        ? `/api/integrations/connect/google?type=${integration.type}`
                        : `/api/integrations/connect/meta?slot=${integration.type}`
                    }
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{ backgroundColor: '#00ff88', color: '#0a0f0c' }}
                  >
                    Conectar
                  </a>
                )}
              </div>
            ))}
        </div>
      </section>

      <section>
        <h2 className="text-[#1E293B] text-lg font-semibold mb-4">Chaves de API</h2>
        <div className="space-y-3">
          {integrations
            .filter(i => i.type === 'elevenlabs')
            .map(integration => (
              <ElevenLabsCard
                key={integration.type}
                integration={integration}
                onSave={saveElevenLabs}
                onDisconnect={() => disconnect('elevenlabs')}
                saving={savingKey === 'elevenlabs'}
              />
            ))}
          {integrations
            .filter(i => !OAUTH_INTEGRATIONS.includes(i.type) && i.type !== 'elevenlabs' && i.type !== 'whatsapp' && i.type !== 'evolution_api')
            .map(integration => (
              <div
                key={integration.type}
                className="rounded-xl p-4"
                style={{ backgroundColor: '#0f1f14', border: '1px solid #1a3a24' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ backgroundColor: '#0a0f0c' }}>
                      <IntegrationIcon type={integration.type} />
                    </div>
                    <div>
                      <p className="text-[#1E293B] text-sm font-medium">{integration.label}</p>
                      <p className="text-xs" style={{ color: integration.status === 'connected' ? '#00ff88' : '#4a7a5a' }}>
                        {integration.status === 'connected' ? 'Conectado' : 'Desconectado'}
                      </p>
                    </div>
                  </div>
                  {integration.status === 'connected' && (
                    <button
                      onClick={() => disconnect(integration.type)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: '#1a0a0a', color: '#ff4444', border: '1px solid #3a1a1a' }}
                    >
                      Remover
                    </button>
                  )}
                </div>
                {integration.status !== 'connected' && (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder={`Chave de API do ${integration.label}`}
                      value={apiKeys[integration.type] || ''}
                      onChange={e => setApiKeys(prev => ({ ...prev, [integration.type]: e.target.value }))}
                      className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
                      style={{ backgroundColor: '#0a0f0c', color: 'white', border: '1px solid #1a3a24' }}
                    />
                    <button
                      onClick={() => saveApiKey(integration.type)}
                      disabled={savingKey === integration.type || !apiKeys[integration.type]}
                      className="text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                      style={{ backgroundColor: '#00ff88', color: '#0a0f0c' }}
                    >
                      {savingKey === integration.type ? '...' : 'Salvar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      </section>

      <section>
  <h2 className="text-[#1E293B] text-lg font-semibold mb-1">WhatsApp</h2>
  <p className="text-xs mb-4" style={{ color: '#4a7a5a' }}>
    Conecte seu WhatsApp para enviar relatórios automáticos para contatos e grupos.
  </p>
  <WhatsAppConnect showGroupsButton={true} />
</section>

      <section>
        <h2 className="text-[#1E293B] text-lg font-semibold mb-4">Webhooks</h2>
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <div
              key={webhook.slot}
              className="rounded-xl p-4"
              style={{ backgroundColor: '#0f1f14', border: '1px solid #1a3a24' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#1E293B] text-sm font-medium">Slot {webhook.slot}</p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs" style={{ color: '#4a7a5a' }}>Ativo</span>
                    <div
                      onClick={() => saveWebhook(webhook.slot, 'active', !webhook.active)}
                      className="w-8 h-4 rounded-full relative cursor-pointer transition-colors"
                      style={{ backgroundColor: webhook.active ? '#00ff88' : '#1a3a24' }}
                    >
                      <div
                        className="w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all"
                        style={{ left: webhook.active ? '17px' : '2px' }}
                      />
                    </div>
                  </label>
                  {(webhook.name || webhook.url) && (
                    <button
                      onClick={() => clearWebhook(webhook.slot)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ color: '#ff4444' }}
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Nome"
                  defaultValue={webhook.name || ''}
                  onBlur={e => saveWebhook(webhook.slot, 'name', e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ backgroundColor: '#0a0f0c', color: 'white', border: '1px solid #1a3a24' }}
                />
                <input
                  type="url"
                  placeholder="URL do webhook"
                  defaultValue={webhook.url || ''}
                  onBlur={e => saveWebhook(webhook.slot, 'url', e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ backgroundColor: '#0a0f0c', color: 'white', border: '1px solid #1a3a24' }}
                />
                <select
                  defaultValue={webhook.event || ''}
                  onChange={e => saveWebhook(webhook.slot, 'event', e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ backgroundColor: '#0a0f0c', color: webhook.event ? 'white' : '#4a7a5a', border: '1px solid #1a3a24' }}
                >
                  <option value="">Selecionar evento</option>
                  {WEBHOOK_EVENTS.map(ev => (
                    <option key={ev} value={ev}>{ev}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
