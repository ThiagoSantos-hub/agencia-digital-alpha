// lib/ai/VoiceService.ts — v2.0.0
// Suporta dois providers: 'openai' (padrão) e 'elevenlabs'
import type { VoiceProvider } from './types'

export type VoiceProviderName = 'openai' | 'elevenlabs'

export class VoiceService {
  private providers: Partial<Record<VoiceProviderName, VoiceProvider>> = {}

  private getProvider(nome: VoiceProviderName = 'openai'): VoiceProvider {
    if (!this.providers[nome]) {
      if (nome === 'elevenlabs') {
        const { ElevenLabsProvider } = require('./providers/elevenlabs.provider')
        this.providers['elevenlabs'] = new ElevenLabsProvider()
      } else {
        const { OpenAITTSProvider } = require('./providers/openai-tts.provider')
        this.providers['openai'] = new OpenAITTSProvider()
      }
    }
    return this.providers[nome]!
  }

  async sintetizar(texto: string, provider: VoiceProviderName = 'openai'): Promise<Buffer> {
    return this.getProvider(provider).sintetizar(texto)
  }

  async sintetizarBase64(texto: string, provider: VoiceProviderName = 'openai'): Promise<string> {
    const buffer = await this.getProvider(provider).sintetizar(texto)
    return buffer.toString('base64')
  }

  async transcrever(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<string> {
    return this.getProvider('openai').transcrever(audioBuffer, mimeType)
  }
}

export const voiceService = new VoiceService()
