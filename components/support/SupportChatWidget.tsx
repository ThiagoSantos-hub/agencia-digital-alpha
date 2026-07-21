'use client'

import { useEffect, useRef, useState } from 'react'
import { HelpCircle, X, Send, Loader2 } from 'lucide-react'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const MSG_INICIAL: ChatMsg = {
  role: 'assistant',
  content: 'Oi! Sou a IA de Suporte da Digital Alpha. Posso te ajudar a entender como usar o sistema, qual tela faz o quê, e coisas assim. Não tenho acesso aos dados da sua empresa, só sei sobre o funcionamento do sistema em si.',
}

// Assistente de FAQ sobre o sistema, separado da Alpha AI pessoal (que tem
// acesso aos dados da empresa) — fica no canto oposto ao botão de voz da
// Alpha pra não sobrepor nada.
export function SupportChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([MSG_INICIAL])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const enviar = async () => {
    const texto = input.trim()
    if (!texto || loading) return

    const novasMensagens: ChatMsg[] = [...messages, { role: 'user', content: texto }]
    setMessages(novasMensagens)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: novasMensagens }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: res.ok ? data.text : (data.error || 'Erro ao responder.') }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Erro de conexão. Tente de novo.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-24 z-[60] flex flex-col items-end gap-3 pointer-events-none">
      {open && (
        <div className="pointer-events-auto w-[340px] h-[440px] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-2">
              <HelpCircle size={16} className="text-text-muted" />
              <p className="text-text-main text-sm font-semibold">Suporte</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-text-muted hover:bg-hover-bg">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user' ? 'bg-primary text-white' : 'bg-background border border-border text-text-main'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-background border border-border rounded-xl px-3 py-2">
                  <Loader2 size={14} className="animate-spin text-text-muted" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-2.5 border-t border-border flex gap-2 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') enviar() }}
              placeholder="Digite sua dúvida..."
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={enviar}
              disabled={loading || !input.trim()}
              className="w-9 h-9 shrink-0 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 text-white flex items-center justify-center transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        title="Suporte"
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all pointer-events-auto hover:scale-110 active:scale-95 border-2 bg-surface border-border text-text-muted hover:text-primary"
      >
        {open ? <X size={20} /> : <HelpCircle size={20} />}
      </button>
    </div>
  )
}
