'use client'
import { useState, useRef, useCallback } from 'react'
import { loadNotes, stripAndApplySaves } from '@/lib/ai/secondBrain'
import { loadAlphaSettings } from '@/lib/ai/alphaSettings'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  return new Blob([buffer], { type: mimeType })
}

function contemWakeWord(texto: string): boolean {
  const normalizado = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return /\balfa\b|\balpha\b/.test(normalizado)
}

export function useAlphaVoice() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState<string>('')
  const [lastResponse, setLastResponse] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [brainFlashId, setBrainFlashId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const iniciarEscutaRef = useRef<() => Promise<void>>()

  // true enquanto o usuário manteve a Alpha ligada (só false no X / botão desligar)
  const enabledRef = useRef(false)
  // true quando o stop veio do usuário (X / botão)
  const userStoppedRef = useRef(false)

  const pararMonitoramento = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [])

  const pararStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  /** Continua ouvindo sempre — só para se o usuário apertou X */
  const maybeRestart = useCallback(() => {
    if (!enabledRef.current || userStoppedRef.current) {
      setVoiceState('idle')
      return
    }
    if (iniciarEscutaRef.current) {
      iniciarEscutaRef.current()
    }
  }, [])

  const processarAudio = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (userStoppedRef.current || !enabledRef.current) {
        setVoiceState('idle')
        return
      }

      setVoiceState('processing')
      setError(null)

      try {
        const formData = new FormData()
        formData.append('audio', blob, `gravacao.${mimeType.includes('webm') ? 'webm' : 'mp4'}`)
        formData.append('mimeType', mimeType)

        const transRes = await fetch('/api/ai/transcribe', { method: 'POST', body: formData })
        if (!transRes.ok) throw new Error('Erro na transcrição')
        const { texto } = await transRes.json()

        if (userStoppedRef.current || !enabledRef.current) {
          setVoiceState('idle')
          return
        }

        if (!texto?.trim()) {
          maybeRestart()
          return
        }

        setTranscript(texto.trim())

        if (!contemWakeWord(texto)) {
          maybeRestart()
          return
        }

        const notes = loadNotes()
        const settings = loadAlphaSettings()

        const aiRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mensagem: texto.trim(),
            incluirVoz: true,
            notes,
            voiceSpeed: settings.voiceSpeed,
            maxTokens: settings.maxTokens,
            temperature: settings.temperature,
          }),
        })

        if (userStoppedRef.current || !enabledRef.current) {
          setVoiceState('idle')
          return
        }

        if (!aiRes.ok) throw new Error('Erro ao consultar a Alpha')
        const data = await aiRes.json()

        const { clean, changed } = stripAndApplySaves(data.resposta ?? '')
        setLastResponse(clean)
        if (changed) {
          setBrainFlashId(`flash-${Date.now()}`)
          window.setTimeout(() => setBrainFlashId(null), 2000)
        }

        if (data.audio && enabledRef.current && !userStoppedRef.current) {
          setVoiceState('speaking')
          const audioBlob = base64ToBlob(data.audio, 'audio/mpeg')
          const url = URL.createObjectURL(audioBlob)

          if (!audioRef.current) {
            audioRef.current = new Audio()
            audioRef.current.autoplay = true
          }

          audioRef.current.src = url
          audioRef.current.onended = () => {
            URL.revokeObjectURL(url)
            maybeRestart()
          }
          audioRef.current.onerror = () => {
            URL.revokeObjectURL(url)
            maybeRestart()
          }

          try {
            await audioRef.current.play()
          } catch {
            maybeRestart()
          }
        } else {
          maybeRestart()
        }
      } catch (err: any) {
        if (!userStoppedRef.current) {
          setError(err.message ?? 'Erro desconhecido')
          // Erro não desliga de vez — tenta ouvir de novo se ainda estiver ativa
          maybeRestart()
        } else {
          setVoiceState('idle')
        }
      }
    },
    [maybeRestart]
  )

  const iniciarEscuta = useCallback(async () => {
    if (!enabledRef.current || userStoppedRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      })

      if (!enabledRef.current || userStoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        pararStream()
        pararMonitoramento()

        if (userStoppedRef.current || !enabledRef.current) {
          chunksRef.current = []
          setVoiceState('idle')
          return
        }

        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size > 500) processarAudio(blob, mimeType)
        else maybeRestart()
      }

      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      audioCtxRef.current = ctx

      const dataArr = new Uint8Array(analyser.frequencyBinCount)
      const nivelMedio = () => dataArr.reduce((a, b) => a + b, 0) / dataArr.length

      // Calibra o ruído ambiente (vento, ventilador, ar-condicionado) antes de
      // começar a gravar de verdade, sem isso um THRESHOLD fixo confundia
      // ruído de fundo constante com fala e nunca detectava silêncio, ficando
      // "escutando" pra sempre sem transcrever nada.
      let amostras: number[] = []
      let frames = 0
      const CALIBRACAO_FRAMES = 20

      const calibrar = () => {
        if (userStoppedRef.current || !enabledRef.current) return
        analyser.getByteFrequencyData(dataArr)
        amostras.push(nivelMedio())
        frames++
        if (frames < CALIBRACAO_FRAMES) {
          rafRef.current = requestAnimationFrame(calibrar)
          return
        }

        const ruidoAmbiente = amostras.reduce((a, b) => a + b, 0) / amostras.length
        const THRESHOLD = Math.max(25, ruidoAmbiente + 15)
        const settings = loadAlphaSettings()
        const SILENCE_MS = settings.silenceMs
        const MAX_GRAVACAO_MS = 15000
        let silenceStart: number | null = null
        let faleiAlgo = false
        const inicioGravacao = Date.now()

        recorder.start()
        mediaRecorderRef.current = recorder
        setVoiceState('listening')

        const verificar = () => {
          if (userStoppedRef.current || !enabledRef.current) return

          // Trava de segurança: se o silêncio nunca for detectado (ex: ruído
          // de fundo alto e instável), força o corte pra não ficar escutando
          // pra sempre.
          if (Date.now() - inicioGravacao >= MAX_GRAVACAO_MS) {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop()
            }
            return
          }

          analyser.getByteFrequencyData(dataArr)
          const media = nivelMedio()

          if (media >= THRESHOLD) {
            faleiAlgo = true
            silenceStart = null
          } else if (faleiAlgo) {
            if (silenceStart === null) silenceStart = Date.now()
            else if (Date.now() - silenceStart >= SILENCE_MS) {
              if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop()
              }
              return
            }
          }
          rafRef.current = requestAnimationFrame(verificar)
        }
        rafRef.current = requestAnimationFrame(verificar)
      }
      rafRef.current = requestAnimationFrame(calibrar)
    } catch {
      setError('Permissão de microfone negada.')
      enabledRef.current = false
      setVoiceState('idle')
    }
  }, [pararMonitoramento, pararStream, processarAudio, maybeRestart])

  iniciarEscutaRef.current = iniciarEscuta

  const startListening = useCallback(() => {
    userStoppedRef.current = false
    enabledRef.current = true
    setError(null)
    setTranscript('')
    setLastResponse('')
    iniciarEscuta()
  }, [iniciarEscuta])

  const stopListening = useCallback(() => {
    userStoppedRef.current = true
    enabledRef.current = false

    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current.src = ''
    }

    pararMonitoramento()

    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        /* ignore */
      }
    } else {
      pararStream()
    }

    setVoiceState('idle')
  }, [pararMonitoramento, pararStream])

  const reset = useCallback(() => {
    stopListening()
    setTranscript('')
    setLastResponse('')
    setError(null)
  }, [stopListening])

  return {
    voiceState,
    transcript,
    lastResponse,
    error,
    brainFlashId,
    startListening,
    stopListening,
    reset,
  }
}
