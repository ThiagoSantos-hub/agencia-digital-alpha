'use client'

import { useEffect, useState } from 'react'
import { AlphaWidget } from '@/components/AlphaWidget'
import { AlphaVoiceButton } from '@/components/AlphaVoiceButton'

// Mostra só UM botão flutuante de voz por vez — qual dos dois é escolhido
// pelo usuário em Integrações > Minha IA > "IA do microfone flutuante".
export function VoiceAssistantWidget() {
  const [provider, setProvider] = useState<'alpha' | 'elevenlabs' | null>(null)

  useEffect(() => {
    fetch('/api/ai/keys')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setProvider(json?.voiceProvider === 'alpha' ? 'alpha' : 'elevenlabs'))
      .catch(() => setProvider('elevenlabs'))
  }, [])

  if (provider === null) return null
  return provider === 'alpha' ? <AlphaVoiceButton /> : <AlphaWidget />
}
