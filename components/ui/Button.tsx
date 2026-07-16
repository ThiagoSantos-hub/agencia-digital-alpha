import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'cta'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-primary hover:bg-primary-hover text-text-main border border-primary shadow-sm',
  cta:
    'bg-cta hover:bg-cta-hover text-text-main border border-cta shadow-sm',
  secondary:
    'bg-surface hover:bg-hover-bg text-text-main border border-border',
  ghost:
    'bg-transparent hover:bg-hover-bg text-text-muted hover:text-text-main border border-transparent',
  danger:
    'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-lg gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
