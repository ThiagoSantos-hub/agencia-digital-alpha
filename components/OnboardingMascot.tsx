'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, PlayCircle, Sparkles, X, ArrowRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { toEmbedUrl } from '@/lib/videoEmbed'

interface OnboardingModule {
  key: string
  label: string
  path_prefix: string
  surface: string
  video_url: string | null
}

interface OnboardingStatus {
  modules: OnboardingModule[]
  seenKeys: string[]
}

// Cache global simples durante a sessão, mesmo truque do cachedProfile em
// hooks/useAuth.ts, evita refazer a request ao trocar entre as árvores de
// layout (app)/(collaborator).
let cachedStatus: OnboardingStatus | null = null

function matchModule(pathname: string, modules: OnboardingModule[]): OnboardingModule | null {
  const matches = modules.filter(
    (m) => pathname === m.path_prefix || pathname.startsWith(`${m.path_prefix}/`)
  )
  if (matches.length === 0) return null
  return matches.sort((a, b) => b.path_prefix.length - a.path_prefix.length)[0]
}

export function OnboardingMascot() {
  const pathname = usePathname()
  const [status, setStatus] = useState<OnboardingStatus | null>(cachedStatus)
  const [expanded, setExpanded] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const autoShown = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (cachedStatus) return
    fetch('/api/onboarding/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: OnboardingStatus | null) => {
        if (!data) return
        cachedStatus = data
        setStatus(data)
      })
      .catch(() => {})
  }, [])

  const currentModule = status ? matchModule(pathname, status.modules) : null
  const seen = currentModule ? status!.seenKeys.includes(currentModule.key) : false

  useEffect(() => {
    if (!currentModule) return
    if (!seen && !autoShown.current.has(currentModule.key)) {
      autoShown.current.add(currentModule.key)
      setExpanded(true)
    } else {
      setExpanded(false)
    }
    setVideoOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModule?.key])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    if (expanded) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [expanded])

  useEffect(() => {
    document.body.style.overflow = expanded || videoOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [expanded, videoOpen])

  if (!currentModule) return null

  const markSeen = () => {
    if (seen || !status) return
    const updated = { ...status, seenKeys: [...status.seenKeys, currentModule.key] }
    setStatus(updated)
    cachedStatus = updated
    fetch('/api/onboarding/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleKey: currentModule.key }),
    }).catch(() => {})
  }

  const handleDismiss = () => {
    markSeen()
    setExpanded(false)
  }

  const handleWatchVideo = () => {
    markSeen()
    setExpanded(false)
    setVideoOpen(true)
  }

  const embedUrl = currentModule.video_url ? toEmbedUrl(currentModule.video_url) : null

  const mascotImg = !imgFailed && (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mascot-robot.png"
      alt="Assistente"
      className="w-full h-full object-contain"
      onError={() => setImgFailed(true)}
    />
  )

  return (
    <>
      {/* Ícone flutuante: canto inferior direito, empilhado acima dos outros
          widgets (SupportChatWidget em bottom-6 right-24, VoiceAssistant em
          bottom-6 right-6). Nunca no canto esquerdo, onde fica o menu
          lateral e o botão "Sair do sistema". */}
      <div className="fixed bottom-24 right-6 z-[60]">
        <button
          onClick={() => setExpanded(true)}
          title="Ajuda deste módulo"
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 border-2 bg-surface border-border text-primary overflow-hidden p-1.5"
        >
          {imgFailed ? <Bot size={24} /> : mascotImg}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={handleDismiss}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative flex items-end justify-center"
            >
              <div className="hidden sm:block w-40 md:w-48 -mr-10 mb-0 pointer-events-none select-none drop-shadow-2xl">
                {mascotImg}
              </div>

              <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <button
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 text-text-disabled hover:text-text-main transition-colors"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-text-main font-bold text-base leading-tight">{currentModule.label}</h2>
                    <p className="text-text-muted text-xs">Seu assistente do sistema</p>
                  </div>
                </div>

                <p className="text-sm text-text-muted mb-4">
                  Vamos te mostrar como aproveitar ao máximo os recursos de <span className="font-semibold text-text-main">{currentModule.label}</span>.
                </p>

                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-xs text-text-main">
                    <Sparkles size={14} className="text-primary shrink-0" /> Recursos e funções explicados
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-main">
                    <PlayCircle size={14} className="text-primary shrink-0" /> Vídeo rápido sempre que precisar
                  </div>
                </div>

                {currentModule.video_url ? (
                  <button
                    onClick={handleWatchVideo}
                    className="w-full flex items-center justify-center gap-2 bg-cta hover:bg-cta-hover text-white py-3 rounded-xl font-bold text-sm transition-colors"
                  >
                    Assistir vídeo <ArrowRight size={16} />
                  </button>
                ) : (
                  <div className="w-full text-center text-xs text-text-disabled bg-hover-bg border border-border rounded-xl py-3">
                    Vídeo em breve
                  </div>
                )}

                <button
                  onClick={handleDismiss}
                  className="w-full text-center text-xs text-text-muted hover:text-text-main transition-colors mt-3"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Modal open={videoOpen} onClose={() => setVideoOpen(false)} title={currentModule.label} size="xl">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full aspect-video rounded-lg"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : (
          <p className="text-sm text-text-muted">Não foi possível carregar este vídeo.</p>
        )}
      </Modal>
    </>
  )
}
