'use client'

import { useEffect, useState } from 'react'
import { Bot, Mic, Check } from 'lucide-react'

const cardCls = 'rounded-xl p-4 bg-surface border border-border shadow-sm'
const btnPrimary = 'text-xs px-3 py-1.5 rounded-lg font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50'
const btnDanger = 'text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors'
const inputCls = 'flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-primary/50'

export function PersonalAIKeysCard() {
  const [openaiConnected, setOpenaiConnected] = useState(false)
  const [elevenlabsConnected, setElevenlabsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [openaiKey, setOpenaiKey] = useState('')
  const [elevenlabsKey, setElevenlabsKey] = useState('')
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/keys')
      const json = await res.json()
      setOpenaiConnected(!!json.openaiConnected)
      setElevenlabsConnected(!!json.elevenlabsConnected)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
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
    await fetchStatus()
    setSaving(null)
  }

  const removeOpenai = async () => {
    setSaving('openai')
    await fetch('/api/ai/keys?type=openai', { method: 'DELETE' })
    await fetchStatus()
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
    await fetchStatus()
    setSaving(null)
  }

  const removeElevenlabs = async () => {
    setSaving('elevenlabs')
    await fetch('/api/ai/keys?type=elevenlabs', { method: 'DELETE' })
    await fetchStatus()
    setSaving(null)
  }

  if (loading) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className={cardCls}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background">
            <Bot size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-text-main text-sm font-medium">Minha IA (OpenAI)</p>
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${openaiConnected ? 'text-cta' : 'text-text-disabled'}`}>
              {openaiConnected ? <><Check size={11} /> Conectado</> : 'Necessário pra usar o Alpha AI'}
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
              {elevenlabsConnected ? <><Check size={11} /> Conectado</> : 'Opcional, deixa a voz da IA mais natural'}
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
    </div>
  )
}
