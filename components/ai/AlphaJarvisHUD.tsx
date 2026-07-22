'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Activity, Users, Megaphone, CheckSquare, Wallet, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { VoiceState } from '@/hooks/useAlphaVoice'
import { SecondBrainGraph } from '@/components/ai/SecondBrainGraph'
import { ALPHA_CONFIG } from '@/lib/ai/alphaPersona'

export type JarvisMode = 'alpha' | 'eleven'
export type { VoiceState }

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
  statusLabel?: string
  brainFlashId?: string | null
}

function nowLabel() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Fortaleza',
  })
}

function FloatingParticles({ intense }: { intense: boolean }) {
  const particles = useMemo(() => {
    return Array.from({ length: 48 }, (_, i) => {
      const seed = (i * 97 + 13) % 1000
      return {
        id: i,
        x: (seed * 17) % 100,
        y: (seed * 31) % 100,
        size: 1.5 + ((seed * 7) % 25) / 10,
        duration: 6 + ((seed * 3) % 10),
        delay: ((seed * 5) % 80) / 10,
        drift: 8 + ((seed * 11) % 24),
        hue: seed % 3,
      }
    })
  }, [])

  const colorFor = (hue: number) => {
    if (hue === 0) return 'rgba(56,189,248,0.85)'
    if (hue === 1) return 'rgba(26,86,219,0.8)'
    return 'rgba(129,140,248,0.85)'
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: colorFor(p.hue),
            boxShadow: `0 0 ${intense ? 10 : 6}px ${colorFor(p.hue)}`,
          }}
          animate={{
            y: intense ? [0, -p.drift * 1.4, p.drift * 0.5, -p.drift, 0] : [0, -p.drift, p.drift * 0.4, 0],
            x: intense ? [0, p.drift * 0.6, -p.drift * 0.4, p.drift * 0.3, 0] : [0, p.drift * 0.25, -p.drift * 0.15, 0],
            opacity: intense ? [0.25, 0.95, 0.4, 0.9, 0.25] : [0.15, 0.55, 0.25, 0.5, 0.15],
            scale: intense ? [1, 1.35, 0.9, 1.25, 1] : [1, 1.1, 1],
          }}
          transition={{
            duration: intense ? p.duration * 0.55 : p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function DigitalGlobe({ intense }: { intense: boolean }) {
  return (
    <div className="relative w-36 h-36 md:w-44 md:h-44">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 32% 28%, rgba(125,211,252,0.35) 0%, rgba(26,86,219,0.25) 40%, rgba(15,23,42,0.9) 72%)',
          boxShadow: intense
            ? '0 0 60px rgba(56,189,248,0.45), 0 0 120px rgba(76,58,191,0.35)'
            : '0 0 40px rgba(26,86,219,0.35)',
        }}
      />
      <motion.div
        className="absolute inset-2 rounded-full overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 30% 25%, rgba(56,189,248,0.2), transparent 55%), #0b1224',
          border: '1px solid rgba(56,189,248,0.45)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: intense ? 12 : 28, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 30, 60, 90, 120, 150].map((deg) => (
          <div
            key={deg}
            className="absolute inset-0"
            style={{
              borderLeft: '1px solid rgba(56,189,248,0.22)',
              transform: `rotate(${deg}deg)`,
              left: '50%',
              transformOrigin: 'left center',
            }}
          />
        ))}
      </motion.div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-3xl font-black text-white/90" style={{ textShadow: '0 0 18px rgba(56,189,248,0.8)' }}>
          α
        </span>
      </div>
    </div>
  )
}

function SoundWaves({ intense }: { intense: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: 140 + i * 40,
            height: 140 + i * 40,
            borderColor: i % 2 === 0 ? 'rgba(56,189,248,0.35)' : 'rgba(76,58,191,0.3)',
          }}
          animate={{
            scale: intense ? [1, 1.08, 0.96, 1.05, 1] : [1, 1.02, 1],
            opacity: intense ? [0.55, 0.2, 0.5, 0.25, 0.55] : [0.35, 0.15, 0.35],
          }}
          transition={{
            duration: intense ? 1.1 + i * 0.12 : 2.8 + i * 0.25,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
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
  brainFlashId = null,
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

  const intense =
    voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'processing'

  const stateText =
    statusLabel ??
    (voiceState === 'listening'
      ? 'OUVINDO'
      : voiceState === 'processing'
        ? 'PROCESSANDO'
        : voiceState === 'speaking'
          ? 'FALANDO'
          : 'PRONTA')

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(8,15,35,0.96) 0%, rgba(2,6,18,0.99) 75%)',
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.12] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(26,86,219,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(26,86,219,0.4) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <FloatingParticles intense={intense} />

          {/* Top */}
          <div className="relative z-10 px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_#22d3ee]" />
              <span className="text-[11px] font-black tracking-[0.25em] text-cyan-300/90 uppercase">
                {ALPHA_CONFIG.name} · Digital Alpha · Online
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-cyan-300/90 font-mono text-sm tabular-nums">{clock}</span>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Corpo */}
          <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 px-4 pb-3">
            {/* CRM */}
            <div className="lg:col-span-3 flex flex-col gap-2 order-2 lg:order-1">
              <HudPanel title="MONITOR CRM" icon={<Activity size={12} />}>
                <HudStat label="Clientes" value={stats.clientes} color="#38bdf8" />
                <HudStat label="Campanhas" value={stats.campanhas} color="#818cf8" />
                <HudStat label="Tarefas" value={stats.tarefas} color="#60a5fa" />
                <HudStat label="Alertas" value={stats.alertas} color="#f87171" />
              </HudPanel>
              <HudPanel title="CANAL" icon={<Wallet size={12} />}>
                <p className="text-[10px] text-cyan-200/80 font-mono leading-relaxed">
                  {mode === 'eleven'
                    ? 'ElevenLabs ativo. Fale com a Alpha.'
                    : `Wake word: "${ALPHA_CONFIG.wakeWord}". Trata você como ${ALPHA_CONFIG.address}.`}
                </p>
              </HudPanel>
            </div>

            {/* Centro */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center order-1 lg:order-2 min-h-0">
              <div className="relative w-[260px] h-[260px] md:w-[300px] md:h-[300px] flex items-center justify-center shrink-0">
                <SoundWaves intense={intense} />
                <DigitalGlobe intense={intense} />
              </div>
              <p className="mt-2 text-[10px] font-black tracking-[0.35em] text-cyan-400/90 uppercase">
                {mode === 'eleven' ? 'ALPHA · ELEVEN' : 'ALPHA · IA'}
              </p>
              <motion.p
                className={`text-sm font-bold tracking-widest ${intense ? 'text-cyan-300' : 'text-slate-400'}`}
                animate={intense ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {stateText}
              </motion.p>

              {/* Second Brain */}
              <div className="w-full mt-3 max-w-2xl px-1">
                <SecondBrainGraph flashId={brainFlashId} />
              </div>
            </div>

            {/* Conversa */}
            <div className="lg:col-span-3 flex flex-col gap-2 order-3">
              <HudPanel title="ENTRADA" icon={<Radio size={12} />}>
                <p className="text-[11px] text-slate-200 min-h-[40px] leading-relaxed">
                  {transcript || <span className="text-slate-500 italic">Aguardando voz…</span>}
                </p>
              </HudPanel>
              <HudPanel title="RESPOSTA ALPHA" icon={<Activity size={12} />} className="flex-1">
                <p className="text-[11px] text-cyan-100/90 min-h-[60px] leading-relaxed">
                  {lastResponse || <span className="text-slate-500 italic">—</span>}
                </p>
                {error && <p className="mt-2 text-[10px] text-red-400">{error}</p>}
              </HudPanel>
            </div>
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
      className={`rounded-xl border border-cyan-400/20 bg-slate-950/75 backdrop-blur-md p-3 shadow-[0_0_28px_rgba(26,86,219,0.18)] ${className}`}
    >
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-400/15">
        <span className="text-cyan-400">{icon}</span>
        <span className="text-[9px] font-black tracking-[0.2em] text-cyan-400/90 uppercase">{title}</span>
      </div>
      {children}
    </div>
  )
}

function HudStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-slate-400 flex-1">{label}</span>
      <span className="text-sm font-black tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  )
}
