'use client'
import { useAlphaVoice, VoiceState } from '@/hooks/useAlphaVoice'

// ── Ícones inline (sem dependência extra) ────────────────────────────────────
function IconMic() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="9"  y1="22" x2="15" y2="22"/>
    </svg>
  )
}

function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6"  y1="6" x2="18" y2="18"/>
    </svg>
  )
}

// ── Etiqueta de estado ───────────────────────────────────────────────────────
const LABELS: Record<VoiceState, string> = {
  idle:       '',
  listening:  'Ouvindo...',
  processing: 'Pensando...',
  speaking:   'Alpha falando...',
}

// ── Ondas animadas (estado "speaking") ───────────────────────────────────────
function WaveIcon() {
  return (
    <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <span
          key={i}
          style={{
            display:         'block',
            width:           3,
            borderRadius:    2,
            background:      '#0a0f0c',
            animationName:   'alphaWave',
            animationDuration:'0.9s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay:  `${i * 0.12}s`,
          }}
          className="alpha-wave-bar"
        />
      ))}
    </span>
  )
}

// ── Spinner (estado "processing") ────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      width: 22, height: 22, border: '2.5px solid #0a0f0c',
      borderTopColor: 'transparent', borderRadius: '50%',
      display: 'inline-block',
      animation: 'alphaSpin 0.7s linear infinite',
    }} />
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export function AlphaVoiceButton() {
  const { voiceState, transcript, lastResponse, error, startListening, stopListening } = useAlphaVoice()

  const isActive = voiceState !== 'idle'
  const label    = LABELS[voiceState]

  // cores do botão por estado
  const btnColor: Record<VoiceState, string> = {
    idle:       '#00ff88',
    listening:  '#ef4444',
    processing: '#f59e0b',
    speaking:   '#00ff88',
  }

  const iconColor: Record<VoiceState, string> = {
    idle:       '#0a0f0c',
    listening:  '#ffffff',
    processing: '#0a0f0c',
    speaking:   '#0a0f0c',
  }

  function handleClick() {
    if (!isActive) startListening()
    else stopListening()
  }

  return (
    <>
      {/* Estilos globais das animações */}
      <style>{`
        @keyframes alphaWave {
          0%, 100% { height: 6px;  }
          50%       { height: 20px; }
        }
        @keyframes alphaSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes alphaPulse {
          0%, 100% { box-shadow: 0 0 0 0   rgba(239,68,68,0.5); }
          50%       { box-shadow: 0 0 0 10px rgba(239,68,68,0);   }
        }
        .alpha-wave-bar { height: 6px; }
      `}</style>

      {/* Painel de informação (exibido quando ativo) */}
      {isActive && (
        <div style={{
          position:     'fixed',
          bottom:       96,
          right:        24,
          zIndex:       49,
          background:   '#0f1a14',
          border:       '1px solid #1a3a24',
          borderRadius: 16,
          padding:      '12px 16px',
          maxWidth:     280,
          display:      'flex',
          flexDirection:'column',
          gap:          6,
        }}>
          {/* status */}
          <span style={{ fontSize: 12, color: '#00ff88', fontWeight: 500 }}>{label}</span>

          {/* transcrição do usuário */}
          {transcript && (
            <span style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.5 }}>
              <span style={{ color: '#6b7280', fontSize: 11 }}>Você: </span>
              {transcript}
            </span>
          )}

          {/* última resposta da Alpha */}
          {lastResponse && (
            <span style={{ fontSize: 13, color: '#d1fae5', lineHeight: 1.5 }}>
              <span style={{ color: '#00ff88', fontSize: 11 }}>Alpha: </span>
              {lastResponse.slice(0, 120)}{lastResponse.length > 120 ? '…' : ''}
            </span>
          )}

          {/* erro */}
          {error && (
            <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>
          )}
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={handleClick}
        title={isActive ? 'Parar conversa' : 'Falar com a Alpha'}
        style={{
          position:        'fixed',
          bottom:          24,
          right:           24,
          zIndex:          50,
          width:           56,
          height:          56,
          borderRadius:    '50%',
          border:          'none',
          cursor:          'pointer',
          background:      btnColor[voiceState],
          color:           iconColor[voiceState],
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          transition:      'background 0.25s, transform 0.15s',
          animation:       voiceState === 'listening' ? 'alphaPulse 1.4s ease-in-out infinite' : 'none',
          boxShadow:       '0 4px 20px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
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
