// lib/ai/VoiceService.ts — v2.1.0 (speed configurável)
import type { VoiceProvider } from './types'

export type VoiceProviderName = 'openai' | 'elevenlabs'

export interface VoiceKeys {
  openAiKey: string
  elevenLabsKey?: string
  elevenLabsVoiceId?: string
}

export class VoiceService {
  private getProvider(provider: VoiceProviderName, keys: VoiceKeys): VoiceProvider {
    if (provider === 'elevenlabs' && keys.elevenLabsKey && keys.elevenLabsVoiceId) {
      const { ElevenLabsProvider } = require('./providers/elevenlabs.provider')
      return new ElevenLabsProvider({
        elevenLabsKey: keys.elevenLabsKey,
        voiceId: keys.elevenLabsVoiceId,
        openAiKey: keys.openAiKey,
      })
    }
    const { OpenAITTSProvider } = require('./providers/openai-tts.provider')
    return new OpenAITTSProvider(keys.openAiKey)
  }

  async sintetizar(
    texto: string,
    keys: VoiceKeys,
    provider: VoiceProviderName = 'openai',
    options?: { speed?: number }
  ): Promise<Buffer> {
    const p = this.getProvider(provider, keys) as VoiceProvider & {
      sintetizar: (t: string, opts?: { speed?: number }) => Promise<Buffer>
    }
    return p.sintetizar(texto, options)
  }

  async sintetizarBase64(
    texto: string,
    keys: VoiceKeys,
    provider: VoiceProviderName = 'openai',
    options?: { speed?: number }
  ): Promise<string> {
    const buffer = await this.sintetizar(texto, keys, provider, options)
    return buffer.toString('base64')
  }

  async transcrever(audioBuffer: Buffer, keys: VoiceKeys, mimeType = 'audio/webm'): Promise<string> {
    return this.getProvider('openai', keys).transcrever(audioBuffer, mimeType)
  }
}

export const voiceService = new VoiceService()
