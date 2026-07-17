// lib/ai/VoiceService.ts — v2.1.0 (speed configurável)
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

  async sintetizar(
    texto: string,
    provider: VoiceProviderName = 'openai',
    options?: { speed?: number }
  ): Promise<Buffer> {
    const p = this.getProvider(provider) as VoiceProvider & {
      sintetizar: (t: string, opts?: { speed?: number }) => Promise<Buffer>
    }
    return p.sintetizar(texto, options)
  }

  async sintetizarBase64(
    texto: string,
    provider: VoiceProviderName = 'openai',
    options?: { speed?: number }
  ): Promise<string> {
    const buffer = await this.sintetizar(texto, provider, options)
    return buffer.toString('base64')
  }

  async transcrever(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<string> {
    return this.getProvider('openai').transcrever(audioBuffer, mimeType)
  }
}

export const voiceService = new VoiceService()
