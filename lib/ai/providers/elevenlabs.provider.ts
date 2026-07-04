// lib/ai/providers/elevenlabs.provider.ts
// Implementa VoiceProvider
// sintetizar() → ElevenLabs TTS REST API
// transcrever() → OpenAI Whisper API

import type { VoiceProvider } from '../types'

export class ElevenLabsProvider implements VoiceProvider {
  private readonly elevenLabsKey: string | undefined
  private readonly voiceId:       string | undefined
  private readonly openAiKey:     string | undefined

  constructor() {
    this.elevenLabsKey = process.env.ELEVENLABS_API_KEY
    this.voiceId       = process.env.ELEVENLABS_VOICE_ID
    this.openAiKey     = process.env.OPENAI_API_KEY

    // Apenas OPENAI_API_KEY é estritamente obrigatória para o funcionamento da classe (transcrição)
    // ElevenLabs é obrigatória apenas se sintetizar() for chamado.
    if (!this.openAiKey) {
      console.warn('[ElevenLabsProvider] OPENAI_API_KEY não configurada. Transcrição não funcionará.')
    }
  }

  async sintetizar(texto: string): Promise<Buffer> {
    if (!this.elevenLabsKey || !this.voiceId) {
      throw new Error('[ElevenLabsProvider] ELEVENLABS_API_KEY ou ELEVENLABS_VOICE_ID não configurados.')
    }

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
    if (!this.openAiKey) {
      throw new Error('[ElevenLabsProvider] OPENAI_API_KEY não configurada para transcrição.')
    }

    const formData = new FormData()
    const uint8Array = new Uint8Array(audioBuffer)
    const blob = new Blob([uint8Array], { type: mimeType })
    
    // Determina a extensão correta baseada no mimeType para o Whisper não se perder
    const extensao = mimeType.includes('mp4') ? 'm4a' : 'webm'
    formData.append('file',     blob, `audio.${extensao}`)
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
