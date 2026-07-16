import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-bold text-text-main"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full py-2.5 bg-surface border rounded-lg text-text-main placeholder-text-disabled
              focus:outline-none focus:ring-1 transition-colors text-sm font-medium
              ${icon ? 'pl-10 pr-4' : 'px-4'}
              ${
                error
                  ? 'border-red-500 focus:border-red-600 focus:ring-red-100'
                  : 'border-border focus:border-primary focus:ring-primary/10'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>

        {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
        {hint && !error && <p className="text-xs text-text-disabled font-medium">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
