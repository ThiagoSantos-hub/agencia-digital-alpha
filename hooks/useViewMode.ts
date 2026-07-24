'use client'

import { useEffect, useState } from 'react'

export type ViewMode = 'tabela' | 'cards'

// Lembra a última visualização escolhida (tabela ou cards) por painel, entre
// sessões. A chave é compartilhada entre a versão admin e colaborador do
// mesmo painel, já que é uma preferência de visualização, não de dados.
export function useViewMode(key: string, defaultMode: ViewMode): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setModeState] = useState<ViewMode>(defaultMode)

  useEffect(() => {
    const saved = localStorage.getItem(key)
    if (saved === 'tabela' || saved === 'cards') setModeState(saved)
  }, [key])

  const setMode = (next: ViewMode) => {
    setModeState(next)
    localStorage.setItem(key, next)
  }

  return [mode, setMode]
}
