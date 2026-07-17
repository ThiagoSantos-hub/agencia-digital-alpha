'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cardIn } from '@/lib/motion'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  elevated?: boolean
  /** Animação de entrada (padrão: true) */
  animate?: boolean
  delay?: number
}

const paddingStyles = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({
  children,
  className = '',
  padding = 'md',
  elevated = true,
  animate = true,
  delay = 0,
}: CardProps) {
  const cls = `
    bg-surface border border-border rounded-xl
    ${elevated ? 'shadow-elevated-md' : 'shadow-elevated-sm'}
    ${paddingStyles[padding]}
    ${className}
  `

  if (!animate) {
    return <div className={cls}>{children}</div>
  }

  return (
    <motion.div
      initial={cardIn.initial}
      animate={cardIn.animate}
      transition={{ ...cardIn.transition, delay }}
      className={cls}
    >
      {children}
    </motion.div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4 pb-3 border-b border-border">
      <div>
        <h3 className="text-text-main font-bold text-sm">{title}</h3>
        {description && (
          <p className="text-text-muted text-xs mt-0.5 font-medium">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
