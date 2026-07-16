import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl shadow-sm ${paddingStyles[padding]} ${className}`}
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
    <div className="flex items-start justify-between mb-4">
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
