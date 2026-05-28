'use client'

import { useState, useCallback, useRef } from 'react'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export const VALID_VOICES = ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'] as const
export type VoiceOption = typeof VALID_VOICES[number]

export const VOICE_LABELS: Record<VoiceOption, string> = {
  alloy:   'Alloy — neutral y versátil',
  echo:    'Echo — nítida y clara',
  fable:   'Fable — expresiva',
  nova:    'Nova — cálida',
  onyx:    'Onyx — grave y autoritaria',
  shimmer: 'Shimmer — suave y gentil',
}

// Tipos mínimos del Web Speech API
interface SpeechRecognitionResult { readonly 0: { readonly transcript: string } }
interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvt extends Event { readonly results: SpeechRecognitionResultList }
interface SpeechRecognitionInstance extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number
  start(): void; stop(): void; abort(): void
  onstart: ((ev: Event) => void) | null
  onend: ((ev: Event) => void) | null
  onresult: ((ev: SpeechRecognitionEvt) => void) | null
  onerror: ((ev: Event) => void) | null
}
interface SpeechRecognitionConstructor { new(): SpeechRecognitionInstance }
type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

const VOZ_REGEX = /\[VOZ:([a-z]+)\]/

// Abreviaturas comunes en español que no deben cortar la oración
const ABBR = /(?:Dr|Dra|Sr|Sra|Srta|Prof|Lic|Ing|Arq|etc|vs|núm|pág|aprox|ej|fig)\.\s*$/i

function extractSentences(text: string): { sentences: string[]; remaining: string } {
  const sentences: string[] = []
  // Busca fin de oración: punto/signo seguido de espacio y mayúscula, o fin de string
  const regex = /[^.!?]*[.!?]+(?=\s+[A-ZÁÉÍÓÚÑ¿¡]|\s*$)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const s = match[0].trim()
    // Ignorar si es una abreviatura conocida o si es muy corta
    if (s.length < 12 || ABBR.test(s)) continue
    sentences.push(s)
    lastIndex = match.index + match[0].length
  }
  return { sentences, remaining: text.slice(lastIndex) }
}

function cleanForTTS(text: string): { clean: string; voiceChange: VoiceOption | null } {
  const match = text.match(VOZ_REGEX)
  const clean = text.replace(VOZ_REGEX, '').trim()
  const voiceChange = match && (VALID_VOICES as readonly string[]).includes(match[1])
    ? (match[1] as VoiceOption) : null
  return { clean, voiceChange }
}

function getSavedVoice(): VoiceOption {
  if (typeof window === 'undefined') return 'shimmer'
  const saved = localStorage.getItem('lumus-voice')
  return (VALID_VOICES as readonly string[]).includes(saved ?? '') ? (saved as VoiceOption) : 'shimmer'
}

interface DrainSignal { resolve: (() => void) | null }

// Cada item del queue: texto limpio a mostrar + promesa del buffer de audio
interface AudioQueueItem {
  displayText: string
  bufferPromise: Promise<AudioBuffer | null>
}

export interface UseVoiceLumusReturn {
  voiceState: VoiceState
  transcript: string
  spokenText: string
  currentVoice: VoiceOption
  isSupported: boolean
  start: () => void
  stop: () => void
  sendMessage: (text: string) => void
}

export function useVoiceLumus(): UseVoiceLumusReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [spokenText, setSpokenText] = useState('')
  const [currentVoice, setCurrentVoice] = useState<VoiceOption>(getSavedVoice)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const transcriptRef = useRef('')
  const currentVoiceRef = useRef<VoiceOption>(getSavedVoice())
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // true mientras el usuario quiere seguir escuchando; false = parar de verdad
  const listeningActiveRef = useRef(false)

  const SILENCE_TIMEOUT_MS = 3000

  const audioQueueRef = useRef<AudioQueueItem[]>([])
  const drainActiveRef = useRef(false)
  const streamFinishedRef = useRef(false)
  const signal = useRef<DrainSignal>({ resolve: null })

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function getAudioCtx() {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    return audioCtxRef.current
  }

  function unlockAudioContext() {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') void ctx.resume()
  }

  function applyVoiceChange(voice: VoiceOption) {
    currentVoiceRef.current = voice
    setCurrentVoice(voice)
    localStorage.setItem('lumus-voice', voice)
  }

  function wakeupDrain() {
    const fn = signal.current.resolve
    signal.current.resolve = null
    if (fn) fn()
  }

  const playBuffer = useCallback((buffer: AudioBuffer): Promise<void> => {
    return new Promise(resolve => {
      const ctx = getAudioCtx()
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      currentSourceRef.current = source
      source.onended = () => { currentSourceRef.current = null; resolve() }
      source.start(0)
    })
  }, [])

  const fetchAudioBuffer = useCallback(
    async (text: string, voice: VoiceOption): Promise<AudioBuffer | null> => {
      const clean = text.trim()
      if (!clean) return null
      try {
        const res = await fetch('/api/ai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean, voice }),
        })
        if (!res.ok) return null
        const arr = await res.arrayBuffer()
        const ctx = getAudioCtx()
        if (ctx.state === 'suspended') await ctx.resume()
        return await ctx.decodeAudioData(arr)
      } catch { return null }
    },
    []
  )

  // Drain: reproduce el queue en orden; muestra cada oración cuando empieza a sonar
  const drainQueue = useCallback(async () => {
    if (drainActiveRef.current) return
    drainActiveRef.current = true
    setVoiceState('speaking')

    while (true) {
      if (audioQueueRef.current.length > 0) {
        const { displayText, bufferPromise } = audioQueueRef.current.shift()!
        const buffer = await bufferPromise
        // El texto aparece cuando empieza a sonar (o si el audio falló, igual se muestra)
        setSpokenText(prev => prev ? `${prev} ${displayText}` : displayText)
        if (buffer) await playBuffer(buffer)
      } else if (streamFinishedRef.current) {
        break
      } else {
        await new Promise<void>(resolve => { signal.current.resolve = resolve })
      }
    }

    drainActiveRef.current = false
    setVoiceState('idle')
  }, [playBuffer])

  const enqueueAudio = useCallback(
    (text: string, voice: VoiceOption) => {
      // text ya llega limpio (sin [VOZ:xxx]) desde processTranscript
      audioQueueRef.current.push({
        displayText: text,
        bufferPromise: fetchAudioBuffer(text, voice),
      })
      wakeupDrain()
      void drainQueue()
    },
    [fetchAudioBuffer, drainQueue]
  )

  const stop = useCallback(() => {
    listeningActiveRef.current = false
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    recognitionRef.current?.abort()
    recognitionRef.current = null
    try { currentSourceRef.current?.stop() } catch { /* ya terminó */ }
    currentSourceRef.current = null
    audioQueueRef.current = []
    drainActiveRef.current = false
    streamFinishedRef.current = true
    wakeupDrain()
    signal.current.resolve = null
    setVoiceState('idle')
    setTranscript('')
    setSpokenText('')
    transcriptRef.current = ''
  }, [])

  const processTranscript = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) { setVoiceState('idle'); return }

    setVoiceState('processing')
    setSpokenText('')
    audioQueueRef.current = []
    drainActiveRef.current = false
    streamFinishedRef.current = false
    signal.current.resolve = null

    const voice = currentVoiceRef.current

    try {
      const res = await fetch('/api/ai/voice-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, currentVoice: voice }),
      })
      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let ttsBuffer = ''

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const raw = decoder.decode(value, { stream: true })
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()

          if (payload === '[DONE]' || payload === '[ERROR]') {
            if (ttsBuffer.trim()) {
              const { clean, voiceChange } = cleanForTTS(ttsBuffer)
              if (voiceChange) applyVoiceChange(voiceChange)
              if (clean) enqueueAudio(clean, voiceChange ?? currentVoiceRef.current)
            }
            streamFinishedRef.current = true
            wakeupDrain()
            break outer
          }

          try {
            const { text: chunk } = JSON.parse(payload) as { text: string }
            ttsBuffer += chunk

            const { sentences, remaining } = extractSentences(ttsBuffer)
            ttsBuffer = remaining
            for (const sentence of sentences) {
              const { clean, voiceChange } = cleanForTTS(sentence)
              if (voiceChange) applyVoiceChange(voiceChange)
              if (clean) enqueueAudio(clean, voiceChange ?? currentVoiceRef.current)
            }
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch {
      streamFinishedRef.current = true
      wakeupDrain()
      setVoiceState('idle')
    }
  }, [enqueueAudio])

  const start = useCallback(() => {
    if (voiceState !== 'idle') { stop(); return }

    unlockAudioContext()

    const win = window as WindowWithSpeech
    const Impl = win.SpeechRecognition ?? win.webkitSpeechRecognition
    if (!Impl) return

    const recognition = new Impl()
    recognitionRef.current = recognition
    listeningActiveRef.current = true
    transcriptRef.current = ''
    setVoiceState('listening')
    setTranscript('')
    setSpokenText('')
    recognition.lang = 'es-AR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null
        listeningActiveRef.current = false
        recognition.stop()
      }, SILENCE_TIMEOUT_MS)
    }

    recognition.onstart = () => {
      // Solo limpiar UI en el primer arranque, no en reinicios automáticos
      if (!transcriptRef.current) {
        setVoiceState('listening')
        setTranscript('')
        setSpokenText('')
      }
      resetSilenceTimer()
    }
    recognition.onresult = (event: SpeechRecognitionEvt) => {
      const text = Array.from({ length: event.results.length })
        .map((_, i) => event.results[i][0].transcript)
        .join('')
      setTranscript(text)
      transcriptRef.current = text
      resetSilenceTimer()
    }
    recognition.onend = () => {
      if (listeningActiveRef.current) {
        // El browser cortó antes del timer — reiniciar para seguir escuchando
        try { recognition.start() } catch { /* ignorar si ya está corriendo */ }
        return
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      recognitionRef.current = null
      void processTranscript(transcriptRef.current)
    }
    recognition.onerror = (ev: Event) => {
      const errorEv = ev as Event & { error?: string }
      // 'aborted' no es un error real, lo maneja onend
      if (errorEv.error === 'aborted') return
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      listeningActiveRef.current = false
      recognitionRef.current = null
      setVoiceState('idle')
    }
    recognition.start()
  }, [voiceState, stop, processTranscript])

  const sendMessage = useCallback((text: string) => {
    void processTranscript(text)
  }, [processTranscript])

  return { voiceState, transcript, spokenText, currentVoice, isSupported, start, stop, sendMessage }
}
