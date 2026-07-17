'use client'

import { useEffect, useState } from 'react'
import { Settings, Volume2, Hash, Sliders, RotateCcw, Save, Bot } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  DEFAULT_ALPHA_SETTINGS,
  loadAlphaSettings,
  saveAlphaSettings,
  type AlphaSettings,
} from '@/lib/ai/alphaSettings'
import { springSoft } from '@/lib/motion'

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<AlphaSettings>(DEFAULT_ALPHA_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSettings(loadAlphaSettings())
    setReady(true)
  }, [])

  const update = <K extends keyof AlphaSettings>(key: K, value: AlphaSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    saveAlphaSettings(settings)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    setSettings({ ...DEFAULT_ALPHA_SETTINGS })
    saveAlphaSettings(DEFAULT_ALPHA_SETTINGS)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-elevated-sm">
          <Settings className="text-primary" size={22} />
        </div>
        <div>
          <h1 className="text-xl font-black text-text-main tracking-tight">Configurações</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Ajustes da Alpha IA — voz, tamanho da resposta e comportamento
          </p>
        </div>
      </div>

      <section className="bg-surface border border-border rounded-2xl p-6 shadow-elevated-md space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Bot size={16} className="text-ai" />
          <h2 className="text-sm font-black uppercase tracking-widest text-text-main">Alpha IA</h2>
        </div>

        {/* Velocidade da voz */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <Volume2 size={16} className="text-primary" />
              Velocidade da voz
            </label>
            <span className="text-sm font-black tabular-nums text-primary">
              {settings.voiceSpeed.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min={0.8}
            max={1.5}
            step={0.05}
            value={settings.voiceSpeed}
            onChange={(e) => update('voiceSpeed', Number(e.target.value))}
            className="w-full accent-primary h-2 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-disabled">
            <span>Lenta 0.8</span>
            <span>Natural 1.2</span>
            <span>Rápida 1.5</span>
          </div>
          <p className="text-xs text-text-muted">
            Controla o ritmo da fala da Alpha (OpenAI TTS). Recomendado: 1.25 a 1.35.
          </p>
        </div>

        {/* Max tokens */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <Hash size={16} className="text-primary" />
              Máximo de tokens na resposta
            </label>
            <span className="text-sm font-black tabular-nums text-primary">{settings.maxTokens}</span>
          </div>
          <input
            type="range"
            min={60}
            max={400}
            step={10}
            value={settings.maxTokens}
            onChange={(e) => update('maxTokens', Number(e.target.value))}
            className="w-full accent-primary h-2 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-disabled">
            <span>Curto 60</span>
            <span>Médio 200</span>
            <span>Longo 400</span>
          </div>
          <p className="text-xs text-text-muted">
            Quanto menor, mais objetiva e barata a resposta. Para voz, 100–150 costuma ser ideal.
          </p>
        </div>

        {/* Temperatura */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <Sliders size={16} className="text-primary" />
              Temperatura (criatividade)
            </label>
            <span className="text-sm font-black tabular-nums text-primary">
              {settings.temperature.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={settings.temperature}
            onChange={(e) => update('temperature', Number(e.target.value))}
            className="w-full accent-primary h-2 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-disabled">
            <span>Precisa 0.1</span>
            <span>Equilibrada 0.4</span>
            <span>Criativa 0.9</span>
          </div>
          <p className="text-xs text-text-muted">
            Valores baixos = respostas mais diretas e estáveis. Valores altos = mais variação.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          <motion.button
            type="button"
            onClick={handleSave}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springSoft}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-elevated-sm hover:bg-primary-hover"
          >
            <Save size={16} />
            Salvar configurações
          </motion.button>
          <motion.button
            type="button"
            onClick={handleReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springSoft}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-surface text-text-muted text-sm font-bold hover:bg-hover-bg shadow-elevated-sm"
          >
            <RotateCcw size={16} />
            Restaurar padrão
          </motion.button>
          {saved && (
            <span className="self-center text-xs font-bold text-cta">Salvo com sucesso</span>
          )}
        </div>
      </section>

      <p className="text-xs text-text-disabled text-center">
        As configurações ficam neste navegador e são aplicadas na próxima conversa com a Alpha.
      </p>
    </div>
  )
}
