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

// Gmail e Google Agenda saíram daqui: viraram conexão pessoal, feita por
// cada usuário (admin ou colaborador) direto na tela de Agenda, não mais
// uma integração única por empresa.
const OAUTH_INTEGRATIONS = [
  'google_ads', 'google_drive',
  'meta_ads', 'meta_ads_2', 'meta_ads_3', 'meta_ads_4',
]
const GOOGLE_INTEGRATIONS = ['google_ads', 'google_drive']

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
  autentique: 'https://www.autentique.com.br/favicon.ico',
  assinafy: 'https://www.assinafy.com.br/favicon.ico',
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
  autentique: '🖊️',
  assinafy: '🖊️',
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
    <div className="rounded-xl p-4 bg-surface border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background">
            <IntegrationIcon type="elevenlabs" />
          </div>
          <div>
            <p className="text-text-main text-sm font-medium">{integration.label}</p>
            <p className={`text-xs ${integration.status === "connected" ? "text-cta" : "text-text-disabled"}`}>
              {integration.status === 'connected' ? 'Conectado' : 'Desconectado'}
            </p>
          </div>
        </div>
        {integration.status === 'connected' && (
          <button
            onClick={onDisconnect}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors"
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
            className="w-full text-sm px-3 py-2 rounded-lg outline-none bg-background text-text-main border border-border focus:border-primary"
          />
          <input
            type="text"
            placeholder="Agent ID (criado no ElevenAgents)"
            value={agentId}
            onChange={e => setAgentId(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg outline-none bg-background text-text-main border border-border focus:border-primary"
          />
          <button
            onClick={() => onSave(apiKey, agentId)}
            disabled={saving || !apiKey || !agentId}
            className="w-full text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50 bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar e conectar'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Agent ID: <span className="text-text-main">{integration.config?.agent_id}</span>
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={webhookUrl}
              className="flex-1 text-xs px-3 py-2 rounded-lg outline-none bg-background text-text-muted border border-border"
            />
            <button
              onClick={copyWebhook}
              className="text-xs px-3 py-2 rounded-lg bg-background text-primary border border-border hover:border-primary transition-colors"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-[11px] text-text-muted">
            Cole essa URL no painel ElevenLabs em Agent → Webhooks → Post-call transcription.
          </p>
        </div>
      )}
    </div>
  )
}

function AssinafyCard({
  integration,
  onSave,
  onDisconnect,
  saving,
}: {
  integration: Integration
  onSave: (apiKey: string, accountId: string) => void
  onDisconnect: () => void
  saving: boolean
}) {
  const [apiKey, setApiKey] = useState('')
  const [accountId, setAccountId] = useState(integration.config?.account_id || '')

  return (
    <div className="rounded-xl p-4 bg-surface border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background">
            <IntegrationIcon type="assinafy" />
          </div>
          <div>
            <p className="text-text-main text-sm font-medium">{integration.label}</p>
            <p className={`text-xs ${integration.status === "connected" ? "text-cta" : "text-text-disabled"}`}>
              {integration.status === 'connected' ? 'Conectado' : 'Desconectado'}
            </p>
          </div>
        </div>
        {integration.status === 'connected' && (
          <button
            onClick={onDisconnect}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors"
          >
            Remover
          </button>
        )}
      </div>

      {integration.status !== 'connected' ? (
        <div className="space-y-2">
          <input
            type="password"
            placeholder="API Key da Assinafy"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg outline-none bg-background text-text-main border border-border focus:border-primary"
          />
          <input
            type="text"
            placeholder="Account ID (painel da Assinafy)"
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg outline-none bg-background text-text-main border border-border focus:border-primary"
          />
          <button
            onClick={() => onSave(apiKey, accountId)}
            disabled={saving || !apiKey || !accountId}
            className="w-full text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50 bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar e conectar'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-text-muted">
          Account ID: <span className="text-text-main">{integration.config?.account_id}</span>
        </p>
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
  const [esignatureProvider, setEsignatureProvider] = useState<'autentique' | 'assinafy'>('autentique')
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savingProvider, setSavingProvider] = useState(false)
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
    const [intRes, whRes, companyRes] = await Promise.all([
      fetch('/api/integrations'),
      fetch('/api/webhooks'),
      fetch('/api/company'),
    ])
    if (intRes.ok) setIntegrations(await intRes.json())
    if (whRes.ok) setWebhooks(await whRes.json())
    if (companyRes.ok) {
      const company = await companyRes.json()
      setEsignatureProvider(company.esignature_provider === 'assinafy' ? 'assinafy' : 'autentique')
    }
    setLoading(false)
  }

  async function saveEsignatureProvider(provider: 'autentique' | 'assinafy') {
    setSavingProvider(true)
    const res = await fetch('/api/company', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ esignature_provider: provider }),
    })
    if (res.ok) {
      setEsignatureProvider(provider)
      setSuccessMsg(`Provedor de assinatura eletrônica alterado para ${provider === 'assinafy' ? 'Assinafy' : 'Autentique'}.`)
    } else {
      setErrorMsg('Erro ao trocar o provedor de assinatura.')
    }
    setSavingProvider(false)
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

  async function saveAssinafy(apiKey: string, accountId: string) {
    setSavingKey('assinafy')
    const res = await fetch('/api/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'assinafy', access_token: apiKey, config: { account_id: accountId } }),
    })
    if (res.ok) {
      setSuccessMsg('Assinafy conectado com sucesso!')
      fetchData()
    } else {
      setErrorMsg('Erro ao salvar Assinafy.')
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
        <div className="w-8 h-8 border-2 rounded-full animate-spin border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-text-main text-2xl font-bold">Integrações</h1>
        <p className="text-sm mt-1 text-text-muted">
          Conecte suas ferramentas e automatize sua agência
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg text-sm font-medium bg-cta/10 text-cta border border-cta/30">
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg text-sm font-medium bg-red-50 text-red-500 border border-red-200">
          ❌ {errorMsg}
        </div>
      )}

      <section>
        <h2 className="text-text-main text-lg font-semibold mb-4">Conexões OAuth</h2>
        <p className="text-xs mb-2 text-text-muted">
          Cada serviço do Google pode ser conectado com uma conta diferente. Ao clicar em "Conectar", o Google vai pedir para você escolher a conta.
        </p>
        <div className="rounded-lg px-3 py-2.5 mb-4 text-xs bg-primary/5 border border-primary/20 text-text-muted">
          <p>Gmail e Google Agenda agora são conectados na tela de <a href="/agenda" className="text-primary underline">Agenda</a>, já que cada pessoa da equipe conecta a própria conta.</p>
        </div>
        <div className="rounded-lg px-3 py-2.5 mb-4 text-xs bg-primary/5 border border-primary/20 text-text-muted">
          <p className="font-medium text-text-main mb-1">Conectando o Meta Ads:</p>
          <p>Ao clicar em "Conectar" você autoriza o acesso à sua conta de anúncios do Meta (e, se vinculado, ao Instagram da mesma conta). Escolha a conta certa quando o Facebook perguntar. Se aparecer um erro de permissão durante o processo, entre em contato com o suporte, pode ser necessário liberar seu acesso antes.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations
            .filter(i => OAUTH_INTEGRATIONS.includes(i.type))
            .map(integration => (
              <div
                key={integration.type}
                className="rounded-xl p-4 flex items-center justify-between bg-surface border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background">
                    <IntegrationIcon type={integration.type} />
                  </div>
                  <div>
                    <p className="text-text-main text-sm font-medium">{integration.label}</p>
                    <p className={`text-xs mt-0.5 ${integration.status === "connected" ? "text-cta" : "text-text-disabled"}`}>
                      {integration.status === 'connected'
                        ? `Conectado${integration.connected_at ? ' em ' + new Date(integration.connected_at).toLocaleDateString('pt-BR') : ''}`
                        : 'Desconectado'}
                    </p>
                    {integration.status === 'connected' && integration.config?.connected_email && (
                      <p className="text-xs mt-0.5 text-text-muted">
                        {integration.config.connected_email}
                      </p>
                    )}
                  </div>
                </div>
                {integration.status === 'connected' ? (
                  <button
                    onClick={() => disconnect(integration.type)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
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
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-primary text-white hover:bg-primary-hover"
                  >
                    Conectar
                  </a>
                )}
              </div>
            ))}
        </div>
      </section>

      <section>
        <h2 className="text-text-main text-lg font-semibold mb-1">Assinatura eletrônica</h2>
        <p className="text-xs mb-4 text-text-muted">
          Conecte o provedor que sua empresa já usa e escolha qual deles envia os contratos gerados pelo formulário público.
        </p>
        <div className="flex items-center gap-2 mb-4">
          {(['autentique', 'assinafy'] as const).map(provider => (
            <button
              key={provider}
              onClick={() => saveEsignatureProvider(provider)}
              disabled={savingProvider || esignatureProvider === provider}
              className={`text-xs px-4 py-2 rounded-lg font-medium border transition-colors disabled:cursor-default ${
                esignatureProvider === provider
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text-muted border-border hover:border-primary'
              }`}
            >
              {esignatureProvider === provider ? '✓ ' : ''}{provider === 'assinafy' ? 'Assinafy' : 'Autentique'} {esignatureProvider === provider ? '(ativo)' : ''}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-text-main text-lg font-semibold mb-4">Chaves de API</h2>
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
            .filter(i => i.type === 'assinafy')
            .map(integration => (
              <AssinafyCard
                key={integration.type}
                integration={integration}
                onSave={saveAssinafy}
                onDisconnect={() => disconnect('assinafy')}
                saving={savingKey === 'assinafy'}
              />
            ))}
          {integrations
            .filter(i => !OAUTH_INTEGRATIONS.includes(i.type) && i.type !== 'elevenlabs' && i.type !== 'assinafy' && i.type !== 'whatsapp' && i.type !== 'evolution_api' && i.type !== 'gmail' && i.type !== 'google_calendar')
            .map(integration => (
              <div
                key={integration.type}
                className="rounded-xl p-4 bg-surface border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background">
                      <IntegrationIcon type={integration.type} />
                    </div>
                    <div>
                      <p className="text-text-main text-sm font-medium">{integration.label}</p>
                      <p className={`text-xs ${integration.status === "connected" ? "text-cta" : "text-text-disabled"}`}>
                        {integration.status === 'connected' ? 'Conectado' : 'Desconectado'}
                      </p>
                    </div>
                  </div>
                  {integration.status === 'connected' && (
                    <button
                      onClick={() => disconnect(integration.type)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors"
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
                      className="flex-1 text-sm px-3 py-2 rounded-lg outline-none bg-background text-text-main border border-border focus:border-primary"
                    />
                    <button
                      onClick={() => saveApiKey(integration.type)}
                      disabled={savingKey === integration.type || !apiKeys[integration.type]}
                      className="text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50 bg-primary text-white hover:bg-primary-hover transition-colors"
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
        <h2 className="text-text-main text-lg font-semibold mb-1">WhatsApp</h2>
        <p className="text-xs mb-4 text-text-muted">
          Conecte seu WhatsApp para enviar relatórios automáticos para contatos e grupos.
        </p>
        <WhatsAppConnect showGroupsButton={true} />
      </section>

      <section>
        <h2 className="text-text-main text-lg font-semibold mb-4">Webhooks</h2>
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <div
              key={webhook.slot}
              className="rounded-xl p-4 bg-surface border border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-text-main text-sm font-medium">Slot {webhook.slot}</p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-text-muted">Ativo</span>
                    <div
                      onClick={() => saveWebhook(webhook.slot, 'active', !webhook.active)}
                      className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${webhook.active ? "bg-cta" : "bg-border"}`}
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
                      className="text-xs px-2 py-1 rounded text-red-500 hover:text-red-600"
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
                  className="text-sm px-3 py-2 rounded-lg outline-none bg-background text-text-main border border-border focus:border-primary"
                />
                <input
                  type="url"
                  placeholder="URL do webhook"
                  defaultValue={webhook.url || ''}
                  onBlur={e => saveWebhook(webhook.slot, 'url', e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg outline-none bg-background text-text-main border border-border focus:border-primary"
                />
                <select
                  defaultValue={webhook.event || ''}
                  onChange={e => saveWebhook(webhook.slot, 'event', e.target.value)}
                  className={`text-sm px-3 py-2 rounded-lg outline-none bg-background border border-border ${webhook.event ? "text-text-main" : "text-text-disabled"}`}
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
