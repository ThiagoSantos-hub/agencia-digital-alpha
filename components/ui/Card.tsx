import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  /** Divisória visual extra (borda mais marcada + sombra suave) */
  elevated?: boolean
}

const paddingStyles = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({ children, className = '', padding = 'md', elevated = false }: CardProps) {
  return (
    <div
      className={`
        bg-surface border border-border rounded-xl
        ${elevated ? 'shadow-md ring-1 ring-black/[0.03]' : 'shadow-sm'}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
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
