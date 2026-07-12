// components/ai/AlphaChatPanel.tsx
'use client'
import { useEffect, useRef } from 'react'
import { Trash2, AlertCircle } from 'lucide-react'
import { useAlphaAI }        from '@/hooks/useAlphaAI'
import { AlphaChatMessage }  from './AlphaChatMessage'
import { AlphaChatInput }    from './AlphaChatInput'

export function AlphaChatPanel() {
  const { messages, loading, error, sendMessage, sendVoice, sendAudio, clearHistory } = useAlphaAI()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] flex-shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1A56DB] font-bold text-lg">
            α
          </div>
          <div>
            <p className="text-[#1E293B] font-semibold text-sm">Alpha</p>
            <p className="text-[#64748B] text-xs">Assistente de IA • Agência Digital Alpha</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} title="Limpar conversa"
            className="p-2 rounded-xl text-[#64748B] hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1A56DB] text-3xl font-bold mb-4">
              α
            </div>
            <p className="text-[#1E293B] font-semibold mb-1">Olá! Sou a Alpha</p>
            <p className="text-[#64748B] text-sm max-w-xs">
              Sua assistente de IA. Posso consultar clientes, tarefas, campanhas e o financeiro da agência em tempo real.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {['Como estão os clientes?', 'Minhas tarefas', 'Resumo financeiro do mês', 'Campanhas ativas'].map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="px-3 py-1.5 rounded-xl text-xs text-[#64748B] bg-white border border-[#E2E8F0] hover:border-[#1A56DB] hover:text-[#1A56DB] transition-colors shadow-sm">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => <AlphaChatMessage key={msg.id} message={msg} />)}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-sm mr-2 flex-shrink-0 text-[#1A56DB] font-bold">α</div>
                <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-[#1A56DB] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#1A56DB] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#1A56DB] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#E2E8F0] flex-shrink-0 bg-white">
        <AlphaChatInput
          loading={loading}
          onSend={sendMessage}
          onSendVoice={sendVoice}
          onSendAudio={sendAudio}
        />
        <p className="text-[#94A3B8] text-xs text-center mt-2">
          Enter para enviar • Shift+Enter para nova linha • 🎙️ para falar com a Alpha
        </p>
      </div>
    </div>
  )
}
