// components/ai/AlphaChatInput.tsx
// Campo de entrada com botão enviar e botão de voz (gravação real)
'use client'
import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { Send, Mic, Loader2, Square } from 'lucide-react'

interface AlphaChatInputProps {
  loading:      boolean
  onSend:       (texto: string) => void
  onSendVoice:  (texto: string) => void
  onSendAudio:  (blob: Blob, mimeType: string) => Promise<void>
}

export function AlphaChatInput({ loading, onSend, onSendVoice, onSendAudio }: AlphaChatInputProps) {
  const [texto, setTexto]         = useState('')
  const [gravando, setGravando]   = useState(false)
  const [segundos, setSegundos]   = useState(0)
  const textareaRef   = useRef<HTMLTextAreaElement>(null)
  const mediaRef      = useRef<MediaRecorder | null>(null)
  const chunksRef     = useRef<Blob[]>([])
  const timerRef      = useRef<NodeJS.Timeout | null>(null)

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function handleSend() {
    const t = texto.trim()
    if (!t || loading) return
    onSend(t)
    setTexto('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTexto(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size > 0) await onSendAudio(blob, mimeType)
        setGravando(false)
        setSegundos(0)
        if (timerRef.current) clearInterval(timerRef.current)
      }

      recorder.start()
      mediaRef.current = recorder
      setGravando(true)
      setSegundos(0)
      timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000)

    } catch (err) {
      alert('Permissão de microfone negada ou não disponível.')
    }
  }

  function pararGravacao() {
    mediaRef.current?.stop()
  }

  const fmtTempo = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className={`flex items-end gap-2 bg-white border rounded-2xl px-4 py-3 transition-colors shadow-sm ${gravando ? 'border-red-500/50' : 'border-[#E2E8F0]'}`}>
      {gravando ? (
        // Estado de gravação
        <div className="flex-1 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-red-600 text-sm font-medium">Gravando {fmtTempo(segundos)}</span>
          <span className="text-[#64748B] text-xs">Fale sua pergunta para a Alpha...</span>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo para a Alpha..."
          rows={1}
          disabled={loading}
          className="flex-1 bg-transparent text-[#1E293B] text-sm placeholder-[#94A3B8] resize-none focus:outline-none leading-relaxed disabled:opacity-50"
          style={{ maxHeight: '160px' }}
        />
      )}

      {/* Botão microfone — grava ou para */}
      <button
        onClick={gravando ? pararGravacao : iniciarGravacao}
        disabled={loading}
        title={gravando ? 'Parar gravação' : 'Gravar pergunta com resposta em voz'}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 ${
          gravando
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'text-[#64748B] hover:text-[#1A56DB] hover:bg-[#EFF6FF]'
        }`}
      >
        {gravando ? <Square size={15} fill="currentColor" /> : <Mic size={17} />}
      </button>

      {/* Botão enviar texto */}
      {!gravando && (
        <button
          onClick={handleSend}
          disabled={!texto.trim() || loading}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#1A56DB] text-white hover:bg-[#1E40AF] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      )}
    </div>
  )
}
