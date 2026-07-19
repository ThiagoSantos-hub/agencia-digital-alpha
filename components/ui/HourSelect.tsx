'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface HourSelectProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

// Select nativo em navegador mobile renderiza o dropdown ocupando a tela inteira,
// sem respeitar a largura do input — esse componente troca por um popover próprio
// do tamanho do campo.
export function HourSelect({ value, onChange, className }: HourSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isWholeHour = /^\d{2}:00$/.test(value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${className ?? ''} flex items-center justify-between`}
      >
        <span>{value}</span>
        <ChevronDown size={16} className="text-text-muted shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-28 max-h-56 overflow-y-auto rounded-xl border border-border bg-surface shadow-lg">
          {!isWholeHour && (
            <button
              type="button"
              onClick={() => { onChange(value); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs text-text-muted hover:bg-hover-bg border-b border-border"
            >
              {value} (ajustar)
            </button>
          )}
          {HOURS.map(hora => (
            <button
              key={hora}
              type="button"
              onClick={() => { onChange(hora); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-hover-bg ${hora === value ? 'bg-primary/10 text-primary font-semibold' : 'text-text-main'}`}
            >
              {hora}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
