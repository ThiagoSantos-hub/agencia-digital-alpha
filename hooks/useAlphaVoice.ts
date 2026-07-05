'use client'
import { useState, useRef, useCallback } from 'react'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes  = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  return new Blob([buffer], { type: mimeType })
}

export function useAlphaVoice() {
  const [voiceState,   setVoiceState]   = useState<VoiceState>('idle')
  const [transcript,   setTranscript]   = useState<string>('')
  const [lastResponse, setLastResponse] = useState<string>('')
  const [error,        setError]        = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const audioCtxRef      = useRef<AudioContext | null>(null)
  const rafRef           = useRef<number | null>(null)
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const iniciarEscutaRef = useRef<() => Promise<void>>()

  const pararMonitoramento = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null }
  }, [])

  const pararStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const processarAudio = useCallback(async (blob: Blob, mimeType: string) => {
    setVoiceState('processing')
    setError(null)

    try {
      // 1. Transcrever
      const formData = new FormData()
      formData.append('audio', blob, `gravacao.${mimeType.includes('webm') ? 'webm' : 'mp4'}`)
      formData.append('mimeType', mimeType)

      const transRes = await fetch('/api/ai/transcribe', { method: 'POST', body: formData })
      if (!transRes.ok) throw new Error('Erro na transcrição')
      const { texto } = await transRes.json()
      if (!texto?.trim()) {
        // Ruído sem fala — volta a ouvir sem processar
        if (iniciarEscutaRef.current) iniciarEscutaRef.current()
        return
      }
      setTranscript(texto.trim())

      // 2. Consultar Alpha
      const aiRes = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mensagem: texto.trim(), incluirVoz: true }),
      })
      if (!aiRes.ok) throw new Error('Erro ao consultar a Alpha')
      const data = await aiRes.json()
      setLastResponse(data.resposta ?? '')

      // 3. Tocar áudio
      if (data.audio) {
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
          if (iniciarEscutaRef.current) iniciarEscutaRef.current()
        }
        audioRef.current.onerror = () => {
          URL.revokeObjectURL(url)
          setVoiceState('idle')
        }

        try {
          await audioRef.current.play()
        } catch {
          setVoiceState('listening')
          if (iniciarEscutaRef.current) iniciarEscutaRef.current()
        }
      } else {
        setVoiceState('idle')
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro desconhecido')
      setVoiceState('idle')
    }
  }, [])

  const iniciarEscuta = useCallback(async () => {
    try {
      // Pede microfone com filtros de ruído nativos do browser
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation:     true,  // cancela eco
          noiseSuppression:     true,  // suprime ruído de fundo
          autoGainControl:      true,  // ajusta volume da voz automaticamente
          sampleRate:           16000, // 16kHz — ideal para Whisper
        }
      })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        pararStream()
        pararMonitoramento()
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size > 500) processarAudio(blob, mimeType)
        else setVoiceState('idle')
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setVoiceState('listening')

      // Detecção de silêncio
      const ctx      = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      audioCtxRef.current = ctx

      const dataArr = new Uint8Array(analyser.frequencyBinCount)

      // THRESHOLD alto (25) → ignora ruídos leves, só captura voz próxima
      // SILENCE_MS baixo (800ms) → para rápido quando você termina de falar
      const THRESHOLD  = 25
      const SILENCE_MS = 800

      let silenceStart: number | null = null
      let faleiAlgo = false  // garante que só processa se houve fala de verdade

      const verificar = () => {
        analyser.getByteFrequencyData(dataArr)
        const media = dataArr.reduce((a, b) => a + b, 0) / dataArr.length

        if (media >= THRESHOLD) {
          faleiAlgo = true
          silenceStart = null
        } else {
          if (faleiAlgo) {
            // Só conta silêncio se já houve fala antes
            if (silenceStart === null) silenceStart = Date.now()
            else if (Date.now() - silenceStart >= SILENCE_MS) {
              if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop()
              }
              return
            }
          }
        }
        rafRef.current = requestAnimationFrame(verificar)
      }
      rafRef.current = requestAnimationFrame(verificar)

    } catch {
      setError('Permissão de microfone negada.')
      setVoiceState('idle')
    }
  }, [pararMonitoramento, pararStream, processarAudio])

  iniciarEscutaRef.current = iniciarEscuta

  const startListening = useCallback(() => {
    setError(null)
    setTranscript('')
    setLastResponse('')
    iniciarEscuta()
  }, [iniciarEscuta])

  const stopListening = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    else {
      pararStream()
      pararMonitoramento()
      setVoiceState('idle')
    }
  }, [pararMonitoramento, pararStream])

  const reset = useCallback(() => {
    stopListening()
    setTranscript('')
    setLastResponse('')
    setError(null)
    setVoiceState('idle')
  }, [stopListening])

  return { voiceState, transcript, lastResponse, error, startListening, stopListening, reset }
}
