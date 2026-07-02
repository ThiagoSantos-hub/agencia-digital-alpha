'use client'

import { useState } from 'react'
import { ConversationProvider, useConversationControls, useConversationStatus } from '@elevenlabs/react'
import { Mic, MicOff } from 'lucide-react'

function AlphaButton() {
  const { startSession, endSession } = useConversationControls()
  const { status } = useConversationStatus()
  const [loading, setLoading] = useState(false)

  const active = status === 'connected'

  const handleClick = async () => {
    if (active) {
      await endSession()
    } else {
      setLoading(true)
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        await startSession({
          onConnect: () => setLoading(false),
          onError: () => setLoading(false),
        })
      } catch {
        setLoading(false)
      }
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {active && (
        <div className="bg-[#0f1a14] border border-[#00ff88]/30 rounded-2xl p-4 shadow-2xl w-48">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[#00ff88] text-sm font-semibold">Alpha ativa</span>
          </div>
          <p className="text-gray-400 text-xs">Pode falar!</p>
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-50"
        style={{
          backgroundColor: active ? '#0f1a14' : '#00ff88',
          border: '2px solid #00ff88',
          boxShadow: active ? '0 0 20px rgba(0,255,136,0.4)' : '0 0 10px rgba(0,255,136,0.2)',
        }}
      >
        {loading
          ? <div className="w-5 h-5 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          : active
            ? <MicOff size={22} color="#00ff88" />
            : <Mic size={22} color="#0a0f0c" />
        }
      </button>
    </div>
  )
}

export function AlphaWidget() {
  return (
    <ConversationProvider agentId="agent_0101kwhjn4ymf3warnf5k6ktfb4y">
      <AlphaButton />
    </ConversationProvider>
  )
}
