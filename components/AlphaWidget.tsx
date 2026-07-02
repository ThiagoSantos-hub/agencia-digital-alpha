'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, X } from 'lucide-react'

export function AlphaWidget() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = true
    script.type = 'text/javascript'
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)
    return () => {
      const widget = document.querySelector('elevenlabs-convai')
      if (widget) widget.remove()
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    let widget = document.querySelector('elevenlabs-convai')
    if (open) {
      if (!widget) {
        widget = document.createElement('elevenlabs-convai')
        widget.setAttribute('agent-id', 'agent_0101kwhjn4ymf3warnf5k6ktfb4y')
        // Esconde o widget deles, só usamos o áudio
        ;(widget as HTMLElement).style.position = 'fixed'
        ;(widget as HTMLElement).style.bottom = '80px'
        ;(widget as HTMLElement).style.right = '24px'
        ;(widget as HTMLElement).style.zIndex = '9999'
        document.body.appendChild(widget)
      }
      ;(widget as HTMLElement).style.display = 'block'
    } else {
      if (widget) (widget as HTMLElement).style.display = 'none'
    }
  }, [open, loaded])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="bg-[#0f1a14] border border-[#00ff88]/30 rounded-2xl p-4 shadow-2xl shadow-[#00ff88]/10 w-56">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[#00ff88] text-sm font-semibold">Alpha</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
          <p className="text-gray-400 text-xs">Assistente de voz ativa. Use o widget abaixo para falar.</p>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all"
        style={{
          backgroundColor: open ? '#0f1a14' : '#00ff88',
          border: '2px solid #00ff88',
          boxShadow: open ? '0 0 20px rgba(0,255,136,0.4)' : '0 0 10px rgba(0,255,136,0.2)',
        }}
      >
        {open
          ? <MicOff size={22} color="#00ff88" />
          : <Mic size={22} color="#0a0f0c" />
        }
      </button>
    </div>
  )
}
