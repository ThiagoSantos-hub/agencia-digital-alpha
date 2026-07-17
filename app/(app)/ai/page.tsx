// app/(app)/ai/page.tsx
// Página /ai — Chat com a Alpha
// Projeto: Agência Digital Alpha

import { AlphaChatPanel } from '@/components/ai/AlphaChatPanel'

export default function AlphaAIPage() {
  // -m-8 cancela o padding do main; altura = viewport - header (64px)
  // overflow-hidden evita scrollbar da página; só a área de mensagens rola
  return (
    <div className="-m-8 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <AlphaChatPanel />
    </div>
  )
}
