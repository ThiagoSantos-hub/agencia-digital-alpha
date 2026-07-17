// components/ai/AlphaChatMessage.tsx
// Bolha de mensagem — usuário (direita) ou Alpha (esquerda)

import type { ChatMessage } from '@/hooks/useAlphaAI'

interface AlphaChatMessageProps {
  message: ChatMessage
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function AlphaChatMessage({ message }: AlphaChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar Alpha — usa Índigo IA */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-ai/10 border border-ai/30 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1 text-ai font-bold">
          α
        </div>
      )}

      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bolha */}
        <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-white rounded-br-sm font-medium'
            : 'bg-surface border border-border text-text-main rounded-bl-sm'
        }`}>
          {message.content}
        </div>

        {/* Horário */}
        <span className="text-text-disabled text-xs mt-1 px-1">
          {formatTime(message.createdAt)}
        </span>
      </div>

      {/* Avatar usuário */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-hover-bg border border-border flex items-center justify-center text-sm ml-2 flex-shrink-0 mt-1 text-text-main">
          U
        </div>
      )}
    </div>
  )
}
