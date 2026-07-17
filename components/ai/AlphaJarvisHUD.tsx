'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Activity, Users, Megaphone, CheckSquare, Wallet, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { VoiceState } from '@/hooks/useAlphaVoice'

export type JarvisMode = 'alpha' | 'eleven'

interface CrmStats {
  clientes: number
  campanhas: number
  tarefas: number
  alertas: number
}

interface AlphaJarvisHUDProps {
  open: boolean
  onClose: () => void
  mode: JarvisMode
  voiceState?: VoiceState
  transcript?: string
  lastResponse?: string
  error?: string | null
  /** ElevenLabs / status externo */
  statusLabel?: string
}

function nowLabel() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Fortaleza',
  })
}

export function AlphaJarvisHUD({
  open,
  onClose,
  mode,
  voiceState = 'idle',
  transcript = '',
  lastResponse = '',
  error = null,
  statusLabel,
}: AlphaJarvisHUDProps) {
  const [clock, setClock] = useState(nowLabel())
  const [stats, setStats] = useState<CrmStats>({ clientes: 0, campanhas: 0, tarefas: 0, alertas: 0 })

  useEffect(() => {
    if (!open) return
    const t = setInterval(() => setClock(nowLabel()), 1000)
    return () => clearInterval(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    ;(async () => {
      const [c, camp, tasks, alerts] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'ativa'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'a_fazer'),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('ativo', true),
      ])
      setStats({
        clientes: c.count ?? 0,
        campanhas: camp.count ?? 0,
        tarefas: tasks.count ?? 0,
        alertas: alerts.count ?? 0,
      })
    })()
  }, [open])

  const active = voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'processing'
  const stateText =
    statusLabel ??
    (voiceState === 'listening'
      ? 'OUVINDO'
      : voiceState === 'processing'
        ? 'PROCESSANDO'
        : voiceState === 'speaking'
          ? 'FALANDO'
          : 'PRONTA')

  const modeTitle = mode === 'eleven' ? 'ALPHA · VOZ (ELEVEN)' : 'ALPHA · IA'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(15,23,42,0.92) 0%, rgba(2,6,23,0.97) 70%)',
          }}
        >
          {/* Grid de fundo */}
          <div
            className="absolute inset-0 opacity-[0.12] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(26,86,219,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(26,86,219,0.35) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Scanline sutil */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            <motion.div
              className="w-full h-24 bg-gradient-to-b from-transparent via-primary/40 to-transparent"
              animate={{ y: ['-20%', '120%'] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-ai animate-pulse shadow-[0_0_12px_#4C3ABF]" />
              <span className="text-[11px] font-black tracking-[0.25em] text-primary uppercase">
                Digital Alpha · Sistema Online
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-cyan-300/90 font-mono text-sm tabular-nums">{clock}</span>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Lateral esquerda — CRM */}
          <div className="absolute left-5 top-20 bottom-24 w-56 flex flex-col gap-3 z-10">
            <HudPanel title="MONITOR CRM" icon={<Activity size={12} />}>
              <HudStat icon={<Users size={12} />} label="Clientes ativos" value={stats.clientes} color="#1A56DB" />
              <HudStat icon={<Megaphone size={12} />} label="Campanhas" value={stats.campanhas} color="#4C3ABF" />
              <HudStat icon={<CheckSquare size={12} />} label="Tarefas a fazer" value={stats.tarefas} color="#3b82f6" />
              <HudStat icon={<Radio size={12} />} label="Alertas" value={stats.alertas} color="#ef4444" />
            </HudPanel>

            <HudPanel title="CANAL" icon={<Wallet size={12} />}>
              <p className="text-[10px] text-cyan-200/80 font-mono leading-relaxed">
                {mode === 'eleven'
                  ? 'ElevenLabs conversacional ativo. Fale naturalmente com a Alpha.'
                  : 'Alpha Voice com wake-word. Diga "Alpha" para comandar o CRM.'}
              </p>
            </HudPanel>
          </div>

          {/* Lateral direita — conversa */}
          <div className="absolute right-5 top-20 bottom-24 w-64 flex flex-col gap-3 z-10">
            <HudPanel title="ENTRADA" icon={<Radio size={12} />}>
              <p className="text-[11px] text-slate-200 min-h-[48px] leading-relaxed">
                {transcript || (
                  <span className="text-slate-500 italic">Aguardando sua voz…</span>
                )}
              </p>
            </HudPanel>
            <HudPanel title="RESPOSTA ALPHA" icon={<Activity size={12} />} className="flex-1">
              <p className="text-[11px] text-cyan-100/90 min-h-[80px] leading-relaxed">
                {lastResponse || (
                  <span className="text-slate-500 italic">—</span>
                )}
              </p>
              {error && (
                <p className="mt-2 text-[10px] text-red-400 font-medium">{error}</p>
              )}
            </HudPanel>
          </div>

          {/* Centro — núcleo Alpha */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Anéis */}
              <motion.div
                className="absolute inset-0 rounded-full border border-primary/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-4 rounded-full border border-ai/40 border-dashed"
                animate={{ rotate: -360 }}
                transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-10 rounded-full border-2 border-cyan-400/50"
                animate={{
                  scale: active ? [1, 1.06, 1] : 1,
                  boxShadow: active
                    ? [
                        '0 0 20px rgba(76,58,191,0.4)',
                        '0 0 48px rgba(26,86,219,0.55)',
                        '0 0 20px rgba(76,58,191,0.4)',
                      ]
                    : '0 0 24px rgba(26,86,219,0.25)',
                }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />

              {/* Núcleo */}
              <div
                className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background:
                    'radial-gradient(circle at 35% 30%, #4C3ABF 0%, #1A56DB 45%, #0f172a 100%)',
                  boxShadow: '0 0 40px rgba(76,58,191,0.55), inset 0 0 20px rgba(255,255,255,0.15)',
                }}
              >
                <span className="text-white text-4xl font-black tracking-tighter">α</span>
              </div>

              {/* Barras de áudio */}
              {(voiceState === 'listening' || voiceState === 'speaking') && (
                <div className="absolute -bottom-2 flex items-end gap-1 h-8">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1 rounded-full bg-cyan-400"
                      animate={{ height: [6, 22, 8, 18, 6] }}
                      transition={{
                        duration: 0.7 + i * 0.05,
                        repeat: Infinity,
                        delay: i * 0.08,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <p className="text-[10px] font-black tracking-[0.35em] text-primary uppercase mb-1">
                {modeTitle}
              </p>
              <p
                className={`text-sm font-bold tracking-widest ${
                  active ? 'text-cyan-300' : 'text-slate-400'
                }`}
              >
                {stateText}
              </p>
            </div>

            {/* Atalhos centrais */}
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-md">
              {['Clientes', 'Campanhas', 'Tarefas', 'Financeiro'].map((label) => (
                <span
                  key={label}
                  className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-[10px] font-bold uppercase tracking-wider text-cyan-100/90"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Rodapé */}
          <div className="absolute bottom-5 left-0 right-0 flex justify-center z-10">
            <p className="text-[10px] text-slate-500 font-mono tracking-wide">
              ALPHA HUD · Digital Alpha · Dados em tempo real do CRM
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function HudPanel({
  title,
  icon,
  children,
  className = '',
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-primary/25 bg-slate-950/70 backdrop-blur-md p-3 shadow-[0_0_24px_rgba(26,86,219,0.15)] ${className}`}
    >
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-primary/20">
        <span className="text-primary">{icon}</span>
        <span className="text-[9px] font-black tracking-[0.2em] text-primary uppercase">{title}</span>
      </div>
      {children}
    </div>
  )
}

function HudStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span style={{ color }} className="opacity-90">
        {icon}
      </span>
      <span className="text-[10px] text-slate-400 flex-1">{label}</span>
      <span className="text-sm font-black tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  )
}
