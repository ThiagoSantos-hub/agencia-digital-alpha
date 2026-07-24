'use client'

import { useRouter } from 'next/navigation'

// Volta pra página anterior de verdade (histórico do navegador), não pra um
// destino fixo. Um link fixo pra "/" caía no login pra quem não está
// autenticado, já que "/" não é uma rota pública.
export function BackButton() {
  const router = useRouter()
  return (
    <button onClick={() => router.back()} className="text-sm text-primary hover:underline">
      ← Voltar
    </button>
  )
}
