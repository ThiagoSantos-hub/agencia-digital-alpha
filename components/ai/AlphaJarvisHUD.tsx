'use client'

import { useEffect, useMemo, useState } from 'react'
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

/** Partículas flutuantes (determinísticas por índice — sem Math.random no render) */
function FloatingParticles({ intense }: { intense: boolean }) {
  const particles = useMemo(() => {
    return Array.from({ length: 48 }, (_, i) => {
      const seed = (i * 97 + 13) % 1000
      const x = (seed * 17) % 100
      const y = (seed * 31) % 100
      const size = 1.5 + ((seed * 7) % 25) / 10
      const duration = 6 + ((seed * 3) % 10)
      const delay = ((seed * 5) % 80) / 10
      const drift = 8 + ((seed * 11) % 24)
      const hue = seed % 3 // 0 cyan, 1 blue, 2 indigo
      return { id: i, x, y, size, duration, delay, drift, hue }
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
            y: intense
              ? [0, -p.drift * 1.4, p.drift * 0.5, -p.drift, 0]
              : [0, -p.drift, p.drift * 0.4, 0],
            x: intense
              ? [0, p.drift * 0.6, -p.drift * 0.4, p.drift * 0.3, 0]
              : [0, p.drift * 0.25, -p.drift * 0.15, 0],
            opacity: intense
              ? [0.25, 0.95, 0.4, 0.9, 0.25]
              : [0.15, 0.55, 0.25, 0.5, 0.15],
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

      {/* Partículas maiores / “sparks” ocasionais */}
      {Array.from({ length: 12 }, (_, i) => {
        const seed = (i * 53 + 7) % 100
        const left = (seed * 13) % 100
        const top = (seed * 29) % 100
        return (
          <motion.span
            key={`spark-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: 3,
              height: 3,
              background: 'rgba(165,243,252,0.9)',
              boxShadow: '0 0 12px rgba(34,211,238,0.9)',
            }}
            animate={{
              y: intense ? [0, -40, -80] : [0, -24, -48],
              opacity: [0, 0.9, 0],
              scale: [0.6, 1.2, 0.4],
            }}
            transition={{
              duration: intense ? 2.2 : 4,
              repeat: Infinity,
              delay: i * 0.55,
              ease: 'easeOut',
            }}
          />
        )
      })}
    </div>
  )
}

/** Globo digital com meridianos/paralelos e rotação */
function DigitalGlobe({ intense }: { intense: boolean }) {
  return (
    <div className="relative w-44 h-44">
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
            key={`m-${deg}`}
            className="absolute inset-0"
            style={{
              borderLeft: '1px solid rgba(56,189,248,0.22)',
              transform: `rotate(${deg}deg)`,
              left: '50%',
              transformOrigin: 'left center',
            }}
          />
        ))}
        {[18, 36, 54, 72].map((pct) => (
          <div
            key={`p-${pct}`}
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              top: `${pct}%`,
              width: `${Math.sin((pct / 100) * Math.PI) * 92}%`,
              height: 1,
              background: 'rgba(56,189,248,0.28)',
            }}
          />
        ))}
        <div
          className="absolute rounded-full opacity-50"
          style={{
            width: '38%',
            height: '28%',
            top: '28%',
            left: '22%',
            background: 'rgba(26,86,219,0.55)',
            filter: 'blur(1px)',
          }}
        />
        <div
          className="absolute rounded-full opacity-40"
          style={{
            width: '26%',
            height: '22%',
            top: '48%',
            left: '55%',
            background: 'rgba(76,58,191,0.5)',
            filter: 'blur(1px)',
          }}
        />
        <div
          className="absolute rounded-full opacity-35"
          style={{
            width: '20%',
            height: '16%',
            top: '62%',
            left: '30%',
            background: 'rgba(14,165,233,0.45)',
            filter: 'blur(1px)',
          }}
        />
      </motion.div>

      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.22) 0%, transparent 35%)',
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-3xl font-black text-white/90"
          style={{ textShadow: '0 0 18px rgba(56,189,248,0.8)' }}
        >
          α
        </span>
      </div>
    </div>
  )
}

function SoundWaves({ intense }: { intense: boolean }) {
  const rings = [0, 1, 2, 3, 4]
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {rings.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: 160 + i * 48,
            height: 160 + i * 48,
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

function WaveBars({ intense }: { intense: boolean }) {
  const bars = Array.from({ length: 28 }, (_, i) => i)
  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-[3px] h-14 pointer-events-none">
      {bars.map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background:
              i % 3 === 0
                ? 'linear-gradient(to top, #1A56DB, #38bdf8)'
                : 'linear-gradient(to top, #4C3ABF, #67e8f9)',
          }}
          animate={{
            height: intense
              ? [8, 28 + (i % 5) * 6, 10, 36, 8]
              : [6, 12, 8, 14, 6],
          }}
          transition={{
            duration: intense ? 0.45 + (i % 4) * 0.05 : 1.4,
            repeat: Infinity,
            delay: i * 0.03,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function GuideLines({ intense }: { intense: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[18, 35, 55, 72, 88].map((top, i) => (
        <motion.div
          key={`h-${i}`}
          className="absolute h-px w-full"
          style={{
            top: `${top}%`,
            background:
              'linear-gradient(90deg, transparent, rgba(56,189,248,0.45), transparent)',
          }}
          animate={{
            x: ['-100%', '100%'],
            opacity: intense ? [0.2, 0.9, 0.2] : [0.15, 0.45, 0.15],
          }}
          transition={{
            duration: intense ? 2.2 + i * 0.3 : 5 + i * 0.6,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.4,
          }}
        />
      ))}

      {[0, 1, 2].map((i) => (
        <motion.div
          key={`d-${i}`}
          className="absolute w-[140%] h-px origin-left"
          style={{
            top: `${20 + i * 25}%`,
            left: '-20%',
            background:
              'linear-gradient(90deg, transparent, rgba(76,58,191,0.5), transparent)',
            transform: `rotate(${12 + i * 4}deg)`,
          }}
          animate={{
            x: intense ? ['-10%', '30%', '-5%'] : ['0%', '15%', '0%'],
            opacity: intense ? [0.3, 0.85, 0.3] : [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: intense ? 1.4 : 3.5,
            repeat: Infinity,
            delay: i * 0.35,
          }}
        />
      ))}

      {[0, 1].map((i) => (
        <motion.div
          key={`arc-${i}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/20"
          style={{ width: 420 + i * 120, height: 280 + i * 80 }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{
            duration: intense ? 10 + i * 4 : 22 + i * 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]"
          style={{ top: `${15 + i * 12}%` }}
          animate={{
            left: ['-2%', '102%'],
            scale: intense ? [1, 1.6, 1] : [1, 1.15, 1],
          }}
          transition={{
            duration: intense ? 1.8 + i * 0.2 : 4 + i * 0.35,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.5,
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
              'radial-gradient(ellipse at center, rgba(8,15,35,0.94) 0%, rgba(2,6,18,0.98) 75%)',
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.14] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(26,86,219,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(26,86,219,0.4) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
            <motion.div
              className="w-full h-20 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent"
              animate={{ y: ['-15%', '115%'] }}
              transition={{ duration: intense ? 2.2 : 4.2, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          {/* Partículas flutuantes */}
          <FloatingParticles intense={intense} />

          <GuideLines intense={intense} />

          <div className="absolute top-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_#22d3ee]" />
              <span className="text-[11px] font-black tracking-[0.25em] text-cyan-300/90 uppercase">
                Digital Alpha · Sistema Online
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-cyan-300/90 font-mono text-sm tabular-nums">{clock}</span>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20 flex items-center justify-center"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="absolute left-5 top-20 bottom-24 w-56 flex flex-col gap-3 z-10">
            <HudPanel title="MONITOR CRM" icon={<Activity size={12} />}>
              <HudStat icon={<Users size={12} />} label="Clientes ativos" value={stats.clientes} color="#38bdf8" />
              <HudStat icon={<Megaphone size={12} />} label="Campanhas" value={stats.campanhas} color="#818cf8" />
              <HudStat icon={<CheckSquare size={12} />} label="Tarefas a fazer" value={stats.tarefas} color="#60a5fa" />
              <HudStat icon={<Radio size={12} />} label="Alertas" value={stats.alertas} color="#f87171" />
            </HudPanel>

            <HudPanel title="CANAL" icon={<Wallet size={12} />}>
              <p className="text-[10px] text-cyan-200/80 font-mono leading-relaxed">
                {mode === 'eleven'
                  ? 'ElevenLabs conversacional ativo. Fale naturalmente com a Alpha.'
                  : 'Alpha Voice com wake-word. Diga "Alpha" para comandar o CRM.'}
              </p>
            </HudPanel>
          </div>

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
                {lastResponse || <span className="text-slate-500 italic">—</span>}
              </p>
              {error && <p className="mt-2 text-[10px] text-red-400 font-medium">{error}</p>}
            </HudPanel>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="relative w-[340px] h-[340px] flex items-center justify-center">
              <SoundWaves intense={intense} />

              <motion.div
                className="absolute inset-6 rounded-full border border-primary/25"
                animate={{ rotate: 360 }}
                transition={{ duration: intense ? 8 : 18, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-12 rounded-full border border-dashed border-ai/35"
                animate={{ rotate: -360 }}
                transition={{ duration: intense ? 6 : 14, repeat: Infinity, ease: 'linear' }}
              />

              <DigitalGlobe intense={intense} />

              <div className="absolute inset-x-8 bottom-4">
                <WaveBars intense={intense} />
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-[10px] font-black tracking-[0.35em] text-cyan-400/90 uppercase mb-1">
                {modeTitle}
              </p>
              <motion.p
                className={`text-sm font-bold tracking-widest ${
                  intense ? 'text-cyan-300' : 'text-slate-400'
                }`}
                animate={intense ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {stateText}
              </motion.p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
              {['Clientes', 'Campanhas', 'Tarefas', 'Financeiro'].map((label) => (
                <span
                  key={label}
                  className="px-3 py-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-[10px] font-bold uppercase tracking-wider text-cyan-100/90"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="absolute bottom-5 left-0 right-0 flex justify-center z-10">
            <p className="text-[10px] text-slate-500 font-mono tracking-wide">
              ALPHA HUD · Digital Alpha · Monitoramento em tempo real
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
