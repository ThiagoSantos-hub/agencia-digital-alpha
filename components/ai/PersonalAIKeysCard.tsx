'use client'

import { useEffect, useState } from 'react'
import { Bot, Mic, Check, ChevronDown, Copy, CheckCheck, Headphones, UserCircle } from 'lucide-react'

const cardCls = 'rounded-xl p-4 bg-surface border border-border shadow-sm'
const btnPrimary = 'text-xs px-3 py-1.5 rounded-lg font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50'
const btnDanger = 'text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors'
const inputCls = 'flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-primary/50'

const TOOLS = [
  { acao: 'get_clientes', descricao: 'Busca a lista de clientes da agência, quantos estão ativos, atrasados ou inativos, e a receita mensal prevista.' },
  { acao: 'get_financeiro', descricao: 'Busca o resumo financeiro da agência do mês atual e do mês passado, contas vencendo e maiores gastos.' },
  { acao: 'get_campanhas', descricao: 'Busca as campanhas de tráfego pago da agência, ativas, pausadas e finalizadas, com métricas. Aceita um parâmetro opcional "cliente" pra filtrar.' },
  { acao: 'get_integracoes', descricao: 'Busca quais integrações (Meta Ads, Google Ads, WhatsApp etc.) estão conectadas ou desconectadas.' },
  { acao: 'get_resumo_geral', descricao: 'Busca um resumo geral rápido combinando clientes, financeiro, campanhas e integrações.' },
]

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <p className="text-[11px] font-semibold text-text-muted mb-1">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={value} className={`${inputCls} font-mono text-[11px]`} onFocus={(e) => e.target.select()} />
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="shrink-0 px-2.5 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary/40 transition-colors"
        >
          {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  )
}

export function PersonalAIKeysCard() {
  const [openaiConnected, setOpenaiConnected] = useState(false)
  const [elevenlabsConnected, setElevenlabsConnected] = useState(false)
  const [agentConnected, setAgentConnected] = useState(false)
  const [webhookSecret, setWebhookSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [showInstructions, setShowInstructions] = useState(false)

  const [openaiKey, setOpenaiKey] = useState('')
  const [elevenlabsKey, setElevenlabsKey] = useState('')
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [workContext, setWorkContext] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  // showLoading só deve ser true na primeira busca (montagem) — chamado de
  // novo depois de salvar/desconectar, ligar loading de novo fazia o card
  // inteiro sumir (return null) e reaparecer, parecendo um reload de página.
  const fetchStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch('/api/ai/keys')
      const json = await res.json()
      setOpenaiConnected(!!json.openaiConnected)
      setElevenlabsConnected(!!json.elevenlabsConnected)
      setAgentConnected(!!json.agentConnected)
      setWebhookSecret(json.webhookSecret ?? '')
      setPreferredName(json.preferredName ?? '')
      setWorkContext(json.workContext ?? '')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    setWebhookUrl(`${window.location.origin}/api/alpha`)
  }, [])

  const saveOpenai = async () => {
    if (!openaiKey.trim()) return
    setSaving('openai')
    await fetch('/api/ai/keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openaiApiKey: openaiKey.trim() }),
    })
    setOpenaiKey('')
    await fetchStatus(false)
    setSaving(null)
  }

  const removeOpenai = async () => {
    setSaving('openai')
    await fetch('/api/ai/keys?type=openai', { method: 'DELETE' })
    await fetchStatus(false)
    setSaving(null)
  }

  const saveElevenlabs = async () => {
    if (!elevenlabsKey.trim() || !elevenlabsVoiceId.trim()) return
    setSaving('elevenlabs')
    await fetch('/api/ai/keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elevenlabsApiKey: elevenlabsKey.trim(), elevenlabsVoiceId: elevenlabsVoiceId.trim() }),
    })
    setElevenlabsKey('')
    setElevenlabsVoiceId('')
    await fetchStatus(false)
    setSaving(null)
  }

  const removeElevenlabs = async () => {
    setSaving('elevenlabs')
    await fetch('/api/ai/keys?type=elevenlabs', { method: 'DELETE' })
    await fetchStatus(false)
    setSaving(null)
  }

  const saveAgent = async () => {
    if (!agentId.trim()) return
    setSaving('agent')
    await fetch('/api/ai/keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elevenlabsAgentId: agentId.trim() }),
    })
    setAgentId('')
    await fetchStatus(false)
    setSaving(null)
  }

  const removeAgent = async () => {
    setSaving('agent')
    await fetch('/api/ai/keys?type=agent', { method: 'DELETE' })
    await fetchStatus(false)
    setSaving(null)
  }

  const saveProfile = async () => {
    setSaving('profile')
    await fetch('/api/ai/keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredName: preferredName.trim(), workContext: workContext.trim() }),
    })
    setSaving(null)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  if (loading) return null

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background">
            <UserCircle size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-text-main text-sm font-medium">Como a Alpha deve te tratar</p>
            <p className="text-xs mt-0.5 text-text-muted">Isso deixa as respostas mais do seu jeito, não é obrigatório preencher.</p>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[11px] font-semibold text-text-muted mb-1 block">Como você quer ser chamado</label>
            <input
              type="text"
              placeholder="Ex: Thiago, diretor, chefe..."
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-muted mb-1 block">Sobre você e seu jeito de trabalhar</label>
            <textarea
              placeholder="Ex: Sou dono de uma agência de marketing, prefiro respostas curtas e direto ao ponto, sem enrolação."
              value={workContext}
              onChange={(e) => setWorkContext(e.target.value)}
              className={`${inputCls} w-full min-h-[70px] resize-none`}
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={saveProfile} disabled={saving === 'profile'} className={btnPrimary}>
              {saving === 'profile' ? 'Salvando...' : 'Salvar'}
            </button>
            {profileSaved && <span className="text-cta text-xs flex items-center gap-1"><Check size={12} /> Salvo</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background">
              <Bot size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-text-main text-sm font-medium">Minha IA (OpenAI)</p>
              <p className={`text-xs mt-0.5 flex items-center gap-1 ${openaiConnected ? 'text-cta' : 'text-text-disabled'}`}>
                {openaiConnected ? <><Check size={11} /> Conectado</> : 'Necessário pro chat da Alpha'}
              </p>
            </div>
          </div>
          {openaiConnected ? (
            <button onClick={removeOpenai} disabled={saving === 'openai'} className={btnDanger}>Desconectar</button>
          ) : (
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Sua chave da OpenAI (sk-...)"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className={inputCls}
              />
              <button onClick={saveOpenai} disabled={saving === 'openai' || !openaiKey.trim()} className={btnPrimary}>
                {saving === 'openai' ? '...' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background">
              <Mic size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-text-main text-sm font-medium">Minha voz (ElevenLabs)</p>
              <p className={`text-xs mt-0.5 flex items-center gap-1 ${elevenlabsConnected ? 'text-cta' : 'text-text-disabled'}`}>
                {elevenlabsConnected ? <><Check size={11} /> Conectado</> : 'Opcional, deixa a voz do chat mais natural'}
              </p>
            </div>
          </div>
          {elevenlabsConnected ? (
            <button onClick={removeElevenlabs} disabled={saving === 'elevenlabs'} className={btnDanger}>Desconectar</button>
          ) : (
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Chave da ElevenLabs"
                value={elevenlabsKey}
                onChange={(e) => setElevenlabsKey(e.target.value)}
                className={`${inputCls} w-full`}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ID da voz"
                  value={elevenlabsVoiceId}
                  onChange={(e) => setElevenlabsVoiceId(e.target.value)}
                  className={inputCls}
                />
                <button
                  onClick={saveElevenlabs}
                  disabled={saving === 'elevenlabs' || !elevenlabsKey.trim() || !elevenlabsVoiceId.trim()}
                  className={btnPrimary}
                >
                  {saving === 'elevenlabs' ? '...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={cardCls}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background">
              <Headphones size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-text-main text-sm font-medium">Assistente de voz</p>
              <p className={`text-xs mt-0.5 flex items-center gap-1 ${agentConnected ? 'text-cta' : 'text-text-disabled'}`}>
                {agentConnected ? <><Check size={11} /> Conectado</> : 'Pro botão de microfone flutuante'}
              </p>
            </div>
          </div>
          {agentConnected ? (
            <button onClick={removeAgent} disabled={saving === 'agent'} className={btnDanger}>Desconectar</button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ID do agente ElevenLabs"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className={inputCls}
              />
              <button onClick={saveAgent} disabled={saving === 'agent' || !agentId.trim()} className={btnPrimary}>
                {saving === 'agent' ? '...' : 'Salvar'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={cardCls}>
        <button
          type="button"
          onClick={() => setShowInstructions((v) => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <p className="text-text-main text-sm font-medium">Como configurar tudo isso, passo a passo</p>
          <ChevronDown size={16} className={`text-text-muted transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
        </button>

        {showInstructions && (
          <div className="mt-4 space-y-5 text-xs text-text-main leading-relaxed">
            <div>
              <p className="font-semibold mb-1">1. Chave da OpenAI (obrigatória pro chat)</p>
              <p className="text-text-muted">
                Entre em <span className="font-mono">platform.openai.com</span>, faça login, vá em "API keys" no menu, clique em "Create new secret key",
                copie o valor (começa com "sk-") e cole no campo "Minha IA (OpenAI)" acima. Cada pessoa paga o próprio uso direto pra OpenAI, conforme for usando.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1">2. Chave da ElevenLabs e ID da voz (opcional, deixa a voz do chat mais natural)</p>
              <p className="text-text-muted">
                Entre em <span className="font-mono">elevenlabs.io</span>, faça login, vá em Configurações (ícone da sua conta) → "API Keys" e copie sua chave.
                Pra pegar o ID de uma voz, vá em "Voices", escolha uma voz e copie o ID dela (aparece nos detalhes da voz). Cole os dois no campo "Minha voz" acima.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1">3. Agente de voz (pro botão de microfone flutuante)</p>
              <p className="text-text-muted mb-2">
                Dentro da ElevenLabs, vá em "Conversational AI" → "Create an agent". Dê um nome (ex: "Alpha"), escolha um modelo de linguagem,
                e em "System prompt" escreva como você quer que o assistente se comporte (ex: "Você é a Alpha, assistente da minha agência de marketing, responda de forma direta e profissional").
              </p>
              <p className="text-text-muted mb-2">
                Depois, na mesma tela do agente, vá em "Tools" (ferramentas) e crie 5 ferramentas do tipo "Webhook", uma pra cada linha abaixo.
                Em todas elas, use o mesmo endereço e o mesmo cabeçalho de segurança:
              </p>
              <div className="space-y-2 mb-3">
                <CopyField label="Endereço do webhook (Server URL / URL, igual nas 5 ferramentas)" value={webhookUrl} />
                <CopyField label="Cabeçalho: x-alpha-secret (Header, igual nas 5 ferramentas)" value={webhookSecret} />
              </div>
              <p className="text-text-muted mb-2">Método: <span className="font-mono">POST</span>. Corpo (Body) de cada ferramenta:</p>
              <div className="space-y-2">
                {TOOLS.map((t) => (
                  <div key={t.acao} className="rounded-lg bg-background border border-border p-2.5">
                    <p className="font-mono text-[11px] text-primary mb-1">{`{"acao": "${t.acao}", "params": {}}`}</p>
                    <p className="text-text-muted text-[11px]">Descrição da ferramenta (pra IA saber quando usar): {t.descricao}</p>
                  </div>
                ))}
              </div>
              <p className="text-text-muted mt-2">
                Depois de salvar o agente, volta na página do agente e copia o "Agent ID" dele (aparece no topo ou na URL). Cola no campo "Assistente de voz" acima.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
