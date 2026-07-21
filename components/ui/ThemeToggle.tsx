'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Mudar pra tema claro' : 'Mudar pra tema escuro'}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
