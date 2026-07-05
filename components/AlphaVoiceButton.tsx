'use client'
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
          background: '#0a0f0c',
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
      border: '2.5px solid #0a0f0c',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'alphaSpin 0.7s linear infinite',
    }} />
  )
}

const LABELS: Record<VoiceState, string> = {
  idle:       '',
  listening:  'Ouvindo...',
  processing: 'Pensando...',
  speaking:   'Alpha falando...',
}

export function AlphaVoiceButton() {
  const { voiceState, transcript, lastResponse, error, startListening, stopListening } = useAlphaVoice()

  const isActive = voiceState !== 'idle'

  const btnBg: Record<VoiceState, string> = {
    idle:       '#0f1a14',
    listening:  '#ef4444',
    processing: '#f59e0b',
    speaking:   '#0f1a14',
  }

  const iconColor: Record<VoiceState, string> = {
    idle:       '#00ff88',
    listening:  '#ffffff',
    processing: '#0a0f0c',
    speaking:   '#00ff88',
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
        @keyframes alphaPulseRed {
          0%, 100% { box-shadow: 0 0 0 0   rgba(239,68,68,0.5), 0 4px 20px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 0 10px rgba(239,68,68,0),   0 4px 20px rgba(0,0,0,0.4); }
        }
        .alpha-wave-bar { height: 5px; }
      `}</style>

      {/* Painel de info — aparece quando ativo, à esquerda do botão */}
      {isActive && (
        <div style={{
          position:      'fixed',
          bottom:        100,
          right:         24,
          zIndex:        59,
          background:    '#0f1a14',
          border:        '1px solid #1a3a24',
          borderRadius:  14,
          padding:       '10px 14px',
          maxWidth:      260,
          display:       'flex',
          flexDirection: 'column',
          gap:           5,
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 11, color: '#00ff88', fontWeight: 600, letterSpacing: '0.05em' }}>
            {LABELS[voiceState]}
          </span>
          {transcript && (
            <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
              <span style={{ color: '#6b7280' }}>Você: </span>{transcript}
            </span>
          )}
          {lastResponse && (
            <span style={{ fontSize: 12, color: '#d1fae5', lineHeight: 1.5 }}>
              <span style={{ color: '#00ff88' }}>Alpha: </span>
              {lastResponse.slice(0, 100)}{lastResponse.length > 100 ? '…' : ''}
            </span>
          )}
          {error && (
            <span style={{ fontSize: 11, color: '#f87171' }}>{error}</span>
          )}
        </div>
      )}

      {/* Botão — fica ACIMA do botão do ElevenLabs (bottom: 100) */}
      <button
        onClick={() => isActive ? stopListening() : startListening()}
        title={isActive ? 'Parar Alpha AI' : 'Alpha AI (texto → voz)'}
        style={{
          position:       'fixed',
          bottom:         100,   // ← acima do ElevenLabs que fica em bottom: 24
          right:          24,
          zIndex:         60,
          width:          48,
          height:         48,
          borderRadius:   '50%',
          border:         '2px solid #00ff88',
          cursor:         'pointer',
          background:     btnBg[voiceState],
          color:          iconColor[voiceState],
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          transition:     'background 0.2s, transform 0.15s',
          animation:      voiceState === 'listening'
            ? 'alphaPulseRed 1.4s ease-in-out infinite'
            : 'none',
          boxShadow:      '0 4px 20px rgba(0,0,0,0.4)',
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
