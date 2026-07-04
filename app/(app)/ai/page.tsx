// app/(app)/ai/page.tsx
// Página /ai — Chat com a Alpha
// Projeto: Agência Digital Alpha

import { AlphaChatPanel } from '@/components/ai/AlphaChatPanel'

export default function AlphaAIPage() {
  return (
    <div className="h-[calc(100vh-64px)]">
      <AlphaChatPanel />
    </div>
  )
}
