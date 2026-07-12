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
            className="text-[#64748B] text-sm font-medium"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#1E293B] placeholder-[#94A3B8]
              focus:outline-none focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB] transition-all text-sm
              ${icon ? 'pl-10 pr-4' : 'px-3'}
              ${
                error
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : ''
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-[#64748B]">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
