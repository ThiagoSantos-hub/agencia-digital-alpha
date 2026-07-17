'use client'

import { useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  md: 'max-w-md',
  lg: 'max-w-lg',
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`
              relative w-full ${sizeStyles[size]}
              bg-surface border border-border rounded-xl shadow-2xl
              flex flex-col max-h-[85vh] overflow-hidden
            `}
          >
            <div className="flex-shrink-0 flex items-start justify-between px-5 py-3.5 border-b border-border">
              <div>
                <h2 className="text-text-main font-semibold text-sm">{title}</h2>
                {description && (
                  <p className="text-text-muted text-xs mt-0.5">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-text-disabled hover:text-text-main transition-colors ml-3 p-1 rounded-lg hover:bg-hover-bg"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 custom-scrollbar">
              {children}
            </div>

            {footer && (
              <div className="flex-shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
