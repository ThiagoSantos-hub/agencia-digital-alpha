'use client'

import { List, LayoutGrid } from 'lucide-react'
import type { ViewMode } from '@/hooks/useViewMode'

export function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1 shrink-0">
      <button
        type="button"
        onClick={() => onChange('tabela')}
        title="Ver em tabela"
        className={`p-1.5 rounded-md transition-colors ${mode === 'tabela' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'}`}
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange('cards')}
        title="Ver em cards"
        className={`p-1.5 rounded-md transition-colors ${mode === 'cards' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'}`}
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  )
}
