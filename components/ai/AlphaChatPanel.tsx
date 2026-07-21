// components/ai/AlphaChatPanel.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { Trash2, AlertCircle, Bot, Loader2 } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useAlphaAI }        from '@/hooks/useAlphaAI'
import { AlphaChatMessage }  from './AlphaChatMessage'
import { AlphaChatInput }    from './AlphaChatInput'

export function AlphaChatPanel() {
  const { messages, loading, error, sendMessage, sendVoice, sendAudio, clearHistory } = useAlphaAI()
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const integracoesHref = pathname.startsWith('/colaborador') ? '/colaborador/integracoes' : '/integracoes'
  const [checkingKey, setCheckingKey] = useState(true)
  const [openaiConnected, setOpenaiConnected] = useState(false)

  useEffect(() => {
    fetch('/api/ai/keys')
      .then((res) => res.json())
      .then((json) => setOpenaiConnected(!!json.openaiConnected))
      .finally(() => setCheckingKey(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (checkingKey) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    )
  }

  if (!openaiConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-16 h-16 rounded-full bg-ai/10 border border-ai/20 flex items-center justify-center text-ai mb-4">
          <Bot size={28} />
        </div>
        <p className="text-text-main font-semibold mb-1">Conecte sua IA pra começar</p>
        <p className="text-text-muted text-sm max-w-sm mb-5">
          Cada pessoa usa a própria chave da OpenAI, a Alpha não funciona sem isso. Conecte a sua em Integrações.
        </p>
        <button
          onClick={() => router.push(integracoesHref)}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors"
        >
          Ir para Integrações
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background overflow-hidden">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-ai/10 border border-ai/30 flex items-center justify-center text-ai font-bold text-lg">
            α
          </div>
          <div>
            <p className="text-text-main font-semibold text-sm">Alpha</p>
            <p className="text-text-muted text-xs">Assistente de IA • Agência Digital Alpha</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} title="Limpar conversa"
            className="p-2 rounded-xl text-text-disabled hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Mensagens — única área com scroll interno */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-ai/10 border border-ai/20 flex items-center justify-center text-ai text-3xl font-bold mb-4">
              α
            </div>
            <p className="text-text-main font-semibold mb-1">Olá! Sou a Alpha</p>
            <p className="text-text-muted text-sm max-w-xs">
              Sua assistente de IA. Posso consultar clientes, tarefas, campanhas e o financeiro da agência em tempo real.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {['Como estão os clientes?', 'Minhas tarefas', 'Resumo financeiro do mês', 'Campanhas ativas'].map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="px-3 py-1.5 rounded-xl text-xs text-text-muted border border-border hover:border-primary/40 hover:text-primary transition-colors">
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
                <div className="w-8 h-8 rounded-full bg-ai/10 border border-ai/30 flex items-center justify-center text-sm mr-2 flex-shrink-0 text-ai font-bold">α</div>
                <div className="bg-surface border border-ai/30 rounded-xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-ai rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-ai rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-ai rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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

      {/* Input fixo no rodapé */}
      <div className="px-6 py-4 border-t border-border flex-shrink-0 bg-background">
        <AlphaChatInput
          loading={loading}
          onSend={sendMessage}
          onSendVoice={sendVoice}
          onSendAudio={sendAudio}
        />
        <p className="text-text-disabled text-xs text-center mt-2">
          Enter para enviar • Shift+Enter para nova linha • 🎙️ para falar com a Alpha
        </p>
      </div>
    </div>
  )
}
