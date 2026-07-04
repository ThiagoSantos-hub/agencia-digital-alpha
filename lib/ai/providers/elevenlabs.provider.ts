// lib/ai/providers/elevenlabs.provider.ts
// Implementa VoiceProvider
// sintetizar() → ElevenLabs TTS REST API
// transcrever() → OpenAI Whisper API

import type { VoiceProvider } from '../types'

export class ElevenLabsProvider implements VoiceProvider {
  private readonly elevenLabsKey: string
  private readonly voiceId:       string
  private readonly openAiKey:     string

  constructor() {
    const elKey   = process.env.ELEVENLABS_API_KEY
    const voiceId = process.env.ELEVENLABS_VOICE_ID
    const oaKey   = process.env.OPENAI_API_KEY

    if (!elKey)   throw new Error('[ElevenLabsProvider] ELEVENLABS_API_KEY não configurada.')
    if (!voiceId) throw new Error('[ElevenLabsProvider] ELEVENLABS_VOICE_ID não configurado.')
    if (!oaKey)   throw new Error('[ElevenLabsProvider] OPENAI_API_KEY não configurada.')

    this.elevenLabsKey = elKey
    this.voiceId       = voiceId
    this.openAiKey     = oaKey
  }

  async sintetizar(texto: string): Promise<Buffer> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`

    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key':   this.elevenLabsKey,
      },
      body: JSON.stringify({
        text:     texto,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability:        0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      const erro = await response.text()
      throw new Error(`[ElevenLabsProvider] Erro TTS: ${response.status} — ${erro}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async transcrever(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const formData = new FormData()
    // Converte Buffer para Uint8Array para compatibilidade com Blob no ambiente browser/edge
    const uint8Array = new Uint8Array(audioBuffer)
    const blob = new Blob([uint8Array], { type: mimeType })
    formData.append('file',     blob, 'audio.webm')
    formData.append('model',    'whisper-1')
    formData.append('language', 'pt')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method:  'POST',
      headers: { Authorization: `Bearer ${this.openAiKey}` },
      body:    formData,
    })

    if (!response.ok) {
      const erro = await response.text()
      throw new Error(`[ElevenLabsProvider] Erro Whisper: ${response.status} — ${erro}`)
    }

    const data = await response.json()
    return data.text ?? ''
  }
}
