'use client'

import { useEffect, useState } from 'react'

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

const OAUTH_INTEGRATIONS = ['google_ads', 'gmail', 'google_drive', 'google_calendar', 'meta_ads']

const INTEGRATION_ICONS: Record<string, string> = {
  google_ads: '🎯',
  gmail: '📧',
  google_drive: '📁',
  google_calendar: '📅',
  meta_ads: '📣',
  brevo: '💌',
  openai: '🤖',
  evolution_api: '💬',
  n8n: '⚡',
}

const WEBHOOK_EVENTS = [
  'cliente.criado',
  'cliente.atualizado',
  'campanha.criada',
  'campanha.atualizada',
  'relatorio.gerado',
]

export default function IntegracoesPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    // Verificar mensagens de redirect OAuth
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'google_connected') setSuccessMsg('Google conectado com sucesso!')
    if (params.get('success') === 'meta_connected') setSuccessMsg('Meta Ads conectado com sucesso!')
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
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold">Integrações</h1>
        <p className="text-sm mt-1" style={{ color: '#4a7a5a' }}>
          Conecte suas ferramentas e automatize sua agência
        </p>
      </div>

      {/* Mensagens */}
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

      {/* Integrações OAuth (Google + Meta) */}
      <section>
        <h2 className="text-white text-lg font-semibold mb-4">Conexões OAuth</h2>
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
                  <span className="text-2xl">{INTEGRATION_ICONS[integration.type]}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{integration.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: integration.status === 'connected' ? '#00ff88' : '#4a7a5a' }}>
                      {integration.status === 'connected'
                        ? `Conectado${integration.connected_at ? ' em ' + new Date(integration.connected_at).toLocaleDateString('pt-BR') : ''}`
                        : 'Desconectado'}
                    </p>
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
                      ['google_ads', 'gmail', 'google_drive', 'google_calendar'].includes(integration.type)
                        ? '/api/integrations/connect/google'
                        : '/api/integrations/connect/meta'
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

      {/* Integrações por API Key */}
      <section>
        <h2 className="text-white text-lg font-semibold mb-4">Chaves de API</h2>
        <div className="space-y-3">
          {integrations
            .filter(i => !OAUTH_INTEGRATIONS.includes(i.type))
            .map(integration => (
              <div
                key={integration.type}
                className="rounded-xl p-4"
                style={{ backgroundColor: '#0f1f14', border: '1px solid #1a3a24' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{INTEGRATION_ICONS[integration.type]}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{integration.label}</p>
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

      {/* Webhooks */}
      <section>
        <h2 className="text-white text-lg font-semibold mb-4">Webhooks</h2>
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <div
              key={webhook.slot}
              className="rounded-xl p-4"
              style={{ backgroundColor: '#0f1f14', border: '1px solid #1a3a24' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-white text-sm font-medium">Slot {webhook.slot}</p>
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
