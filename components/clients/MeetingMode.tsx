'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

export function MeetingMode({
  clientName,
  onClose,
  children,
}: {
  clientName: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 bg-background/95 backdrop-blur border-b border-border">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wide font-semibold">Modo Reunião</p>
          <h1 className="text-text-main text-2xl font-bold">{clientName}</h1>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-muted bg-surface border border-border hover:text-text-main transition-colors"
        >
          <X size={16} /> Sair (Esc)
        </button>
      </div>
      <div className="max-w-5xl mx-auto px-8 py-10">
        {children}
      </div>
    </div>
  )
}
