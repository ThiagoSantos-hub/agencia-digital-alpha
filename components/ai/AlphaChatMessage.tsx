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
        <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1 text-[#1A56DB] font-bold">
          α
        </div>
      )}

      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bolha */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
          isUser
            ? 'bg-[#1A56DB] text-white rounded-br-sm font-medium'
            : 'bg-white border border-[#E2E8F0] text-[#1E293B] rounded-bl-sm'
        }`}>
          {message.content}
        </div>

        {/* Horário */}
        <span className="text-[#94A3B8] text-xs mt-1 px-1">
          {formatTime(message.createdAt)}
        </span>
      </div>

      {/* Avatar usuário */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-sm ml-2 flex-shrink-0 mt-1 text-[#64748B] font-bold">
          U
        </div>
      )}
    </div>
  )
}
