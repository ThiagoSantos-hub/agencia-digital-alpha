// lib/ai/VoiceService.ts
// Delega síntese e transcrição ao VoiceProvider

import type { VoiceProvider } from './types'
import { ElevenLabsProvider } from './providers/elevenlabs.provider'

export class VoiceService {
  private provider: VoiceProvider

  constructor(provider?: VoiceProvider) {
    this.provider = provider ?? new ElevenLabsProvider()
  }

  async sintetizar(texto: string): Promise<Buffer> {
    return this.provider.sintetizar(texto)
  }

  async sintetizarBase64(texto: string): Promise<string> {
    const buffer = await this.provider.sintetizar(texto)
    return buffer.toString('base64')
  }

  async transcrever(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<string> {
    return this.provider.transcrever(audioBuffer, mimeType)
  }
}

export const voiceService = new VoiceService()
