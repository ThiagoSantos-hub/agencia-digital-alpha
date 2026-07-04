// components/ai/AlphaChatInput.tsx
// Campo de entrada com botão enviar e botão de voz

'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Mic, Loader2 } from 'lucide-react'

interface AlphaChatInputProps {
  loading:     boolean
  onSend:      (texto: string) => void
  onSendVoice: (texto: string) => void
}

export function AlphaChatInput({ loading, onSend, onSendVoice }: AlphaChatInputProps) {
  const [texto, setTexto] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const t = texto.trim()
    if (!t || loading) return
    onSend(t)
    setTexto('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleSendVoice() {
    const t = texto.trim()
    if (!t || loading) return
    onSendVoice(t)
    setTexto('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTexto(e.target.value)
    // Auto-resize
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  return (
    <div className="flex items-end gap-2 bg-[#0f1a14] border border-[#1a3a24] rounded-2xl px-4 py-3">
      <textarea
        ref={textareaRef}
        value={texto}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Pergunte algo para a Alpha..."
        rows={1}
        disabled={loading}
        className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
        style={{ maxHeight: '160px' }}
      />

      {/* Botão voz */}
      <button
        onClick={handleSendVoice}
        disabled={!texto.trim() || loading}
        title="Enviar com resposta em voz"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-[#00ff88] hover:bg-[#00ff88]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
      >
        <Mic size={17} />
      </button>

      {/* Botão enviar */}
      <button
        onClick={handleSend}
        disabled={!texto.trim() || loading}
        className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#00ff88] text-[#0a0f0c] hover:bg-[#00e87a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
      >
        {loading
          ? <Loader2 size={16} className="animate-spin" />
          : <Send size={16} />
        }
      </button>
    </div>
  )
}
