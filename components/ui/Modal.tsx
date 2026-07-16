'use client'

import { useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-text-main/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Painel */}
      <div
        className={`
          relative w-full ${sizeStyles[size]}
          bg-surface border border-border rounded-xl shadow-2xl
          flex flex-col max-h-[90vh]
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-text-main font-bold text-base">{title}</h2>
            {description && (
              <p className="text-text-muted text-sm mt-0.5 font-medium">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-disabled hover:text-text-main transition-colors ml-4 mt-0.5"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">{children}</div>

        {/* Footer opcional */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-hover-bg/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
