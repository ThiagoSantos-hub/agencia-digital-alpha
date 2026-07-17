'use client'
import { useEffect } from 'react'
import { useAlphaVoice, VoiceState } from '@/hooks/useAlphaVoice'

function IconMic() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="9"  y1="22" x2="15" y2="22"/>
    </svg>
  )
}
function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6"  y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function WaveIcon() {
  return (
    <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 20 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i} className="alpha-wave-bar" style={{
          display: 'block', width: 3, borderRadius: 2,
          background: '#4C3ABF',
          animationName: 'alphaWave',
          animationDuration: '0.9s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDelay: `${i * 0.12}s`,
        }} />
      ))}
    </span>
  )
}
function Spinner() {
  return (
    <span style={{
      width: 20, height: 20,
      border: '2.5px solid #4C3ABF',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'alphaSpin 0.7s linear infinite',
    }} />
  )
}

export function AlphaVoiceButton() {
  const { voiceState, startListening, stopListening } = useAlphaVoice()
  const isActive = voiceState !== 'idle'

  useEffect(() => {
    localStorage.setItem('alphaAtiva', isActive ? 'true' : 'false')
    window.dispatchEvent(new StorageEvent('storage', {
      key:      'alphaAtiva',
      newValue: isActive ? 'true' : 'false',
    }))
  }, [isActive])

  const handleClick = () => {
    if (isActive) stopListening()
    else startListening()
  }

  // idle = primary, listening/processing/speaking = Índigo IA
  const btnBg: Record<VoiceState, string> = {
    idle:       '#1A56DB',
    listening:  '#4C3ABF',
    processing: '#4C3ABF',
    speaking:   '#4C3ABF',
  }

  return (
    <>
      <style>{`
        @keyframes alphaWave {
          0%, 100% { height: 5px; }
          50%       { height: 18px; }
        }
        @keyframes alphaSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes alphaPulseAi {
          0%, 100% { box-shadow: 0 0 0 0   rgba(76,58,191,0.45), 0 4px 20px rgba(0,0,0,0.15); }
          50%       { box-shadow: 0 0 0 10px rgba(76,58,191,0),   0 4px 20px rgba(0,0,0,0.15); }
        }
        .alpha-wave-bar { height: 5px; }
      `}</style>
      <button
        onClick={handleClick}
        title={isActive ? 'Desativar Alpha AI' : 'Ativar Alpha AI'}
        style={{
          position:       'fixed',
          bottom:         100,
          right:          24,
          zIndex:         60,
          width:          48,
          height:         48,
          borderRadius:   '50%',
          border:         `2px solid ${btnBg[voiceState]}`,
          cursor:         'pointer',
          background:     btnBg[voiceState],
          color:          '#FFFFFF',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          transition:     'background 0.2s, transform 0.15s, border-color 0.2s',
          animation:      voiceState === 'listening'
            ? 'alphaPulseAi 1.4s ease-in-out infinite'
            : 'none',
          boxShadow:      '0 4px 20px rgba(0,0,0,0.15)',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {voiceState === 'idle'       && <IconMic />}
        {voiceState === 'listening'  && <IconX />}
        {voiceState === 'processing' && <Spinner />}
        {voiceState === 'speaking'   && <WaveIcon />}
      </button>
    </>
  )
}
