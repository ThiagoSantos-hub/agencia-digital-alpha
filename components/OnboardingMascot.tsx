'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, PlayCircle } from 'lucide-react'
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

  return (
    <>
      <div className="fixed bottom-6 left-6 z-[60]">
        <button
          onClick={() => setExpanded(true)}
          title="Ajuda deste módulo"
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 border-2 bg-surface border-border text-primary overflow-hidden"
        >
          {imgFailed ? (
            <Bot size={24} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/mascot-robot.png"
              alt="Assistente"
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          )}
        </button>
      </div>

      <Modal open={expanded} onClose={handleDismiss} title={currentModule.label} size="sm">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-background flex items-center justify-center">
            {imgFailed ? (
              <Bot size={28} className="text-primary" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/mascot-robot.png"
                alt="Assistente"
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            )}
          </div>
          <p className="text-sm text-text-muted">
            Conheça o módulo <span className="font-semibold text-text-main">{currentModule.label}</span> e aprenda a usar todos os recursos.
          </p>

          {currentModule.video_url ? (
            <button
              onClick={handleWatchVideo}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              <PlayCircle size={18} /> Assistir vídeo
            </button>
          ) : (
            <p className="text-xs text-text-disabled bg-hover-bg border border-border rounded-xl py-2.5 w-full">
              Vídeo em breve
            </p>
          )}

          <button
            onClick={handleDismiss}
            className="text-xs text-text-muted hover:text-text-main transition-colors"
          >
            Fechar
          </button>
        </div>
      </Modal>

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
