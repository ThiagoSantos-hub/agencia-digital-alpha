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
  const [voiceState,    setVoiceState]    = useState<VoiceState>('idle')
  const [transcript,    setTranscript]    = useState<string>('')
  const [lastResponse,  setLastResponse]  = useState<string>('')
  const [error,         setError]         = useState<string | null>(null)

  const mediaRecorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef         = useRef<Blob[]>([])
  const audioCtxRef       = useRef<AudioContext | null>(null)
  const analyserRef       = useRef<AnalyserNode | null>(null)
  const silenceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef            = useRef<number | null>(null)
  const audioRef          = useRef<HTMLAudioElement | null>(null)
  const streamRef         = useRef<MediaStream | null>(null)

  // ─── parar monitoramento de silêncio ───────────────────────────────────────
  const pararMonitoramento = useCallback(() => {
    if (rafRef.current)        { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (silenceTimerRef.current){ clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null }
    if (audioCtxRef.current)   { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null }
    analyserRef.current = null
  }, [])

  // ─── parar stream de microfone ─────────────────────────────────────────────
  const pararStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  // ─── processar áudio gravado ───────────────────────────────────────────────
  const processarAudio = useCallback(async (blob: Blob, mimeType: string) => {
    setVoiceState('processing')
    setError(null)

    try {
      // 1. Transcrever via Whisper
      const formData = new FormData()
      formData.append('audio', blob, `gravacao.${mimeType.includes('webm') ? 'webm' : 'mp4'}`)
      formData.append('mimeType', mimeType)

      const transRes = await fetch('/api/ai/transcribe', { method: 'POST', body: formData })
      if (!transRes.ok) throw new Error('Erro na transcrição')
      const { texto } = await transRes.json()
      if (!texto?.trim()) throw new Error('Não entendi. Tente novamente.')
      setTranscript(texto.trim())

      // 2. Enviar para Alpha com voz
      const aiRes = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mensagem: texto.trim(), incluirVoz: true }),
      })
      if (!aiRes.ok) throw new Error('Erro ao consultar a Alpha')
      const data = await aiRes.json()
      setLastResponse(data.resposta ?? '')

      // 3. Reproduzir áudio da resposta
      if (data.audio) {
        setVoiceState('speaking')
        const audioBlob = base64ToBlob(data.audio, 'audio/mpeg')
        const url       = URL.createObjectURL(audioBlob)
        if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src) }
        audioRef.current = new Audio(url)
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url)
          setVoiceState('listening')
          iniciarEscuta()          // loop: volta a ouvir
        }
        audioRef.current.onerror = () => setVoiceState('idle')
        await audioRef.current.play().catch(() => setVoiceState('idle'))
      } else {
        setVoiceState('idle')
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro desconhecido')
      setVoiceState('idle')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── iniciar escuta com detecção de silêncio ───────────────────────────────
  const iniciarEscuta = useCallback(async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
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

      // ── detecção de silêncio via AudioContext ──────────────────────────────
      const ctx      = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      const source   = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser

      const dataArr    = new Uint8Array(analyser.frequencyBinCount)
      const THRESHOLD  = 10        // amplitude mínima para "fala"
      const SILENCE_MS = 1500      // ms de silêncio para parar

      let silenceStart: number | null = null

      const verificar = () => {
        analyser.getByteFrequencyData(dataArr)
        const media = dataArr.reduce((a, b) => a + b, 0) / dataArr.length

        if (media < THRESHOLD) {
          if (silenceStart === null) silenceStart = Date.now()
          else if (Date.now() - silenceStart >= SILENCE_MS) {
            // silêncio detectado → para a gravação
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop()
            }
            return   // sai do loop RAF
          }
        } else {
          silenceStart = null  // reset: o usuário voltou a falar
        }

        rafRef.current = requestAnimationFrame(verificar)
      }

      rafRef.current = requestAnimationFrame(verificar)

    } catch {
      setError('Permissão de microfone negada.')
      setVoiceState('idle')
    }
  }, [pararMonitoramento, pararStream, processarAudio])

  // ─── startListening: ponto de entrada público ──────────────────────────────
  const startListening = useCallback(() => {
    setError(null)
    setTranscript('')
    setLastResponse('')
    iniciarEscuta()
  }, [iniciarEscuta])

  // ─── stopListening: para manualmente ──────────────────────────────────────
  const stopListening = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    else {
      pararStream()
      pararMonitoramento()
      setVoiceState('idle')
    }
  }, [pararMonitoramento, pararStream])

  // ─── reset completo ────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopListening()
    setTranscript('')
    setLastResponse('')
    setError(null)
    setVoiceState('idle')
  }, [stopListening])

  return { voiceState, transcript, lastResponse, error, startListening, stopListening, reset }
}
