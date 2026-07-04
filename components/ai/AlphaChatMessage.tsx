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
      {/* Avatar Alpha */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
          α
        </div>
      )}

      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bolha */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[#00ff88] text-[#0a0f0c] rounded-br-sm font-medium'
            : 'bg-[#0f1a14] border border-[#1a3a24] text-gray-100 rounded-bl-sm'
        }`}>
          {message.content}
        </div>

        {/* Horário */}
        <span className="text-gray-600 text-xs mt-1 px-1">
          {formatTime(message.createdAt)}
        </span>
      </div>

      {/* Avatar usuário */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-[#1a3a24] border border-[#1a3a24] flex items-center justify-center text-sm ml-2 flex-shrink-0 mt-1 text-gray-300">
          U
        </div>
      )}
    </div>
  )
}
