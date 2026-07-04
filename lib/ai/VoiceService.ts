// lib/ai/VoiceService.ts — v1.1.0
// Lazy initialization: provider só é criado na primeira chamada,
// não no import (evita throw em build time na Vercel)
import type { VoiceProvider } from './types'

export class VoiceService {
  private provider: VoiceProvider | null = null

  private getProvider(): VoiceProvider {
    if (!this.provider) {
      const { ElevenLabsProvider } = require('./providers/elevenlabs.provider')
      this.provider = new ElevenLabsProvider()
    }
    return this.provider
  }

  async sintetizar(texto: string): Promise<Buffer> {
    return this.getProvider().sintetizar(texto)
  }

  async sintetizarBase64(texto: string): Promise<string> {
    const buffer = await this.getProvider().sintetizar(texto)
    return buffer.toString('base64')
  }

  async transcrever(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<string> {
    return this.getProvider().transcrever(audioBuffer, mimeType)
  }
}

export const voiceService = new VoiceService()
