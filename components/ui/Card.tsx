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
      className={`bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-shadow ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Subcomponentes opcionais ────────────────────────────────────────────────

interface CardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-[#1E293B] font-semibold text-sm">{title}</h3>
        {description && (
          <p className="text-[#64748B] text-xs mt-0.5">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
