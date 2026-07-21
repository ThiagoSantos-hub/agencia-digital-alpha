'use client'

import { useState, useEffect, useCallback } from 'react'
import { getStoredTheme, getSystemTheme, applyTheme, type Theme } from '@/lib/theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme | null) ?? getStoredTheme() ?? getSystemTheme()
    setTheme(current)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
