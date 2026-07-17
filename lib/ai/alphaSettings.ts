// lib/ai/alphaSettings.ts — preferências da Alpha IA (admin)
'use client'

export interface AlphaSettings {
  /** Velocidade da voz TTS (0.8 a 1.5) */
  voiceSpeed: number
  /** Máximo de tokens na resposta */
  maxTokens: number
  /** Criatividade 0–1 */
  temperature: number
  /**
   * Tempo de silêncio (ms) antes de enviar o áudio para processar.
   * Menor = responde mais rápido; maior = espera você terminar de falar.
   */
  silenceMs: number
}

export const DEFAULT_ALPHA_SETTINGS: AlphaSettings = {
  voiceSpeed: 1.3,
  maxTokens: 120,
  temperature: 0.3,
  silenceMs: 900,
}

const KEY = 'alpha_ia_settings'

export function loadAlphaSettings(): AlphaSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_ALPHA_SETTINGS }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_ALPHA_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AlphaSettings>
    return {
      voiceSpeed: clamp(Number(parsed.voiceSpeed) || DEFAULT_ALPHA_SETTINGS.voiceSpeed, 0.8, 1.5),
      maxTokens: Math.round(
        clamp(Number(parsed.maxTokens) || DEFAULT_ALPHA_SETTINGS.maxTokens, 60, 400)
      ),
      temperature: clamp(
        Number(parsed.temperature) || DEFAULT_ALPHA_SETTINGS.temperature,
        0.1,
        0.9
      ),
      silenceMs: Math.round(
        clamp(Number(parsed.silenceMs) || DEFAULT_ALPHA_SETTINGS.silenceMs, 400, 2000)
      ),
    }
  } catch {
    return { ...DEFAULT_ALPHA_SETTINGS }
  }
}

export function saveAlphaSettings(settings: AlphaSettings): void {
  if (typeof window === 'undefined') return
  const clean: AlphaSettings = {
    voiceSpeed: clamp(settings.voiceSpeed, 0.8, 1.5),
    maxTokens: Math.round(clamp(settings.maxTokens, 60, 400)),
    temperature: clamp(settings.temperature, 0.1, 0.9),
    silenceMs: Math.round(clamp(settings.silenceMs, 400, 2000)),
  }
  localStorage.setItem(KEY, JSON.stringify(clean))
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
