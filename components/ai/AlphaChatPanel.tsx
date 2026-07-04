// components/ai/AlphaChatPanel.tsx
// Painel completo de chat — junta mensagens + input + estado de loading

'use client'

import { useEffect, useRef } from 'react'
import { Trash2, AlertCircle } from 'lucide-react'
import { useAlphaAI } from '@/hooks/useAlphaAI'
import { AlphaChatMessage } from './AlphaChatMessage'
import { AlphaChatInput }   from './AlphaChatInput'

export function AlphaChatPanel() {
  const { messages, loading, error, sendMessage, sendVoice, clearHistory } = useAlphaAI()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll automático para a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-[#0a0f0c]">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a3a24] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center text-[#00ff88] font-bold text-lg">
            α
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Alpha</p>
            <p className="text-gray-500 text-xs">Assistente de IA • Agência Digital Alpha</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            title="Limpar conversa"
            className="p-2 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center text-[#00ff88] text-3xl font-bold mb-4">
              α
            </div>
            <p className="text-white font-semibold mb-1">Olá! Sou a Alpha</p>
            <p className="text-gray-500 text-sm max-w-xs">
              Sua assistente de IA. Posso consultar clientes, tarefas, campanhas e o financeiro da agência em tempo real.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'Como estão os clientes?',
                'Tarefas pendentes',
                'Resumo financeiro do mês',
                'Campanhas ativas',
              ].map(sugestao => (
                <button
                  key={sugestao}
                  onClick={() => sendMessage(sugestao)}
                  className="px-3 py-1.5 rounded-xl text-xs text-gray-400 border border-[#1a3a24] hover:border-[#00ff88]/40 hover:text-[#00ff88] transition-colors"
                >
                  {sugestao}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <AlphaChatMessage key={msg.id} message={msg} />
            ))}

            {/* Indicador de digitação */}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center text-sm mr-2 flex-shrink-0">
                  α
                </div>
                <div className="bg-[#0f1a14] border border-[#1a3a24] rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#1a3a24] flex-shrink-0">
        <AlphaChatInput
          loading={loading}
          onSend={sendMessage}
          onSendVoice={sendVoice}
        />
        <p className="text-gray-700 text-xs text-center mt-2">
          Enter para enviar • Shift+Enter para nova linha • 🎙️ para resposta em voz
        </p>
      </div>
    </div>
  )
}
