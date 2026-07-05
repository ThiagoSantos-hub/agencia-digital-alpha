// lib/ai/providers/openai-tts.provider.ts
// Síntese de voz usando OpenAI TTS (tts-1)
// Transcrição usando OpenAI Whisper
import type { VoiceProvider } from '../types'

export class OpenAITTSProvider implements VoiceProvider {
  private readonly openAiKey: string | undefined

  constructor() {
    this.openAiKey = process.env.OPENAI_API_KEY
    if (!this.openAiKey) {
      console.warn('[OpenAITTSProvider] OPENAI_API_KEY não configurada.')
    }
  }

  async sintetizar(texto: string): Promise<Buffer> {
    if (!this.openAiKey) {
      throw new Error('[OpenAITTSProvider] OPENAI_API_KEY não configurada.')
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.openAiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: texto,
        voice: 'nova', // voz feminina — opções: alloy, echo, fable, nova, onyx, shimmer
      }),
    })

    if (!response.ok) {
      const erro = await response.text()
      throw new Error(`[OpenAITTSProvider] Erro TTS: ${response.status} — ${erro}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async transcrever(audioBuffer: Buffer, mimeType: string): Promise<string> {
    if (!this.openAiKey) {
      throw new Error('[OpenAITTSProvider] OPENAI_API_KEY não configurada.')
    }

    const formData = new FormData()
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType })
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
      throw new Error(`[OpenAITTSProvider] Erro Whisper: ${response.status} — ${erro}`)
    }

    const data = await response.json()
    return data.text ?? ''
  }
}
