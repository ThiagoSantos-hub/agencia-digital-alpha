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
  const analyserRef      = useRef<AnalyserNode | null>(null)
  const rafRef           = useRef<number | null>(null)
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  // Guardamos uma referência para iniciarEscuta para o loop
  const iniciarEscutaRef = useRef<() => Promise<void>>()

  const pararMonitoramento = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null }
    analyserRef.current = null
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
      if (!texto?.trim()) throw new Error('Não entendi. Tente novamente.')
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

      // 3. Tocar áudio — usando Audio element já existente no DOM para contornar autoplay
      if (data.audio) {
        setVoiceState('speaking')
        const audioBlob = base64ToBlob(data.audio, 'audio/mpeg')
        const url = URL.createObjectURL(audioBlob)

        // Reutiliza ou cria elemento de áudio
        if (!audioRef.current) {
          audioRef.current = new Audio()
          audioRef.current.autoplay = true
        }

        audioRef.current.src = url
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url)
          // Loop: volta a ouvir automaticamente
          if (iniciarEscutaRef.current) {
            iniciarEscutaRef.current()
          }
        }
        audioRef.current.onerror = () => {
          URL.revokeObjectURL(url)
          setVoiceState('idle')
        }

        // Tenta tocar — se bloqueado pelo browser, vai para idle
        try {
          await audioRef.current.play()
        } catch {
          // Autoplay bloqueado: mostra resposta em texto e volta a ouvir
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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

      // Detecção de silêncio via AudioContext
      const ctx      = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser

      const dataArr    = new Uint8Array(analyser.frequencyBinCount)
      const THRESHOLD  = 10
      const SILENCE_MS = 1500
      let silenceStart: number | null = null

      const verificar = () => {
        analyser.getByteFrequencyData(dataArr)
        const media = dataArr.reduce((a, b) => a + b, 0) / dataArr.length

        if (media < THRESHOLD) {
          if (silenceStart === null) silenceStart = Date.now()
          else if (Date.now() - silenceStart >= SILENCE_MS) {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop()
            }
            return
          }
        } else {
          silenceStart = null
        }
        rafRef.current = requestAnimationFrame(verificar)
      }
      rafRef.current = requestAnimationFrame(verificar)

    } catch {
      setError('Permissão de microfone negada.')
      setVoiceState('idle')
    }
  }, [pararMonitoramento, pararStream, processarAudio])

  // Mantém ref atualizada para o loop funcionar
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
