'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, Loader2 } from 'lucide-react'
import { WeatherIcon, getConditionFromCode } from './weather-icon'
import type { WeatherCondition } from './weather-icon'

const GREETING_KEY = 'lumus_greeted'
const DISMISS_AFTER_MS = 14000

type AudioState = 'idle' | 'loading' | 'playing' | 'blocked'

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function wasGreetedToday(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(GREETING_KEY) === getTodayKey()
}

function markGreetedToday() {
  localStorage.setItem(GREETING_KEY, getTodayKey())
}

function getSavedVoice(): string {
  if (typeof window === 'undefined') return 'shimmer'
  return localStorage.getItem('lumus-voice') ?? 'shimmer'
}

interface WeatherSnap {
  condition: WeatherCondition
  temp: number
  city: string
}

interface OpenMeteoCurrentResponse {
  current: {
    temperature_2m: number
    weather_code: number
  }
}

interface NominatimAddress {
  city?: string
  town?: string
  municipality?: string
  county?: string
}

interface NominatimResponse {
  address?: NominatimAddress
}

async function fetchWeatherSnap(): Promise<WeatherSnap> {
  const FALLBACK_LAT = -32.9468
  const FALLBACK_LON = -60.6393

  const getPosition = (): Promise<{ lat: number; lon: number }> =>
    new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve({ lat: FALLBACK_LAT, lon: FALLBACK_LON })
        return
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve({ lat: FALLBACK_LAT, lon: FALLBACK_LON }),
        { timeout: 4000 }
      )
    })

  const { lat, lon } = await getPosition()

  const [weatherRes, geoRes] = await Promise.allSettled([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto&forecast_days=1`
    ).then(r => r.json() as Promise<OpenMeteoCurrentResponse>),
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`,
      { headers: { 'User-Agent': 'Lumus Personal OS (radevelopment02@gmail.com)' } }
    ).then(r => r.json() as Promise<NominatimResponse>),
  ])

  if (weatherRes.status === 'rejected') throw new Error('Weather failed')

  const w = weatherRes.value
  const geo = geoRes.status === 'fulfilled' ? geoRes.value : null
  const city =
    geo?.address?.city ??
    geo?.address?.town ??
    geo?.address?.municipality ??
    geo?.address?.county ??
    'tu ciudad'

  return {
    condition: getConditionFromCode(w.current.weather_code),
    temp: Math.round(w.current.temperature_2m),
    city,
  }
}

function buildGreeting(firstName: string, weather: WeatherSnap | null): string {
  const hour = new Date().getHours()

  if (!weather) {
    if (hour < 12) return `Buenos días, ${firstName}. Revisemos tus gastos antes de arrancar.`
    if (hour < 18) return `Buenas tardes, ${firstName}. Buen momento para mirar cómo viene el mes.`
    return `Buenas noches, ${firstName}. Cerrá el día con tus finanzas claras.`
  }

  const { condition, temp, city } = weather

  if (hour < 12) {
    if (condition === 'sunny') return `Buenos días, ${firstName}. ${temp}° y sol en ${city}. Revisemos el presupuesto del día.`
    if (condition === 'rainy' || condition === 'drizzle') return `Buenos días, ${firstName}. Llueve con ${temp}° en ${city}. Buen momento para ordenar gastos.`
    if (condition === 'stormy') return `Buenos días, ${firstName}. Tormenta en ${city} con ${temp}°. Cuidá también los gastos de salida.`
    if (condition === 'snowy') return `Buenos días, ${firstName}. ${temp}° y nevada en ${city}. Abrigáte bien.`
    if (condition === 'partly-cloudy') return `Buenos días, ${firstName}. ${temp}° y parcialmente nublado en ${city}. Veamos cómo viene tu mes.`
    return `Buenos días, ${firstName}. ${temp}° en ${city}. Veamos cómo vienen tus finanzas.`
  }

  if (hour < 18) {
    if (condition === 'sunny') return `Buenas tardes, ${firstName}. ${temp}° y sol en ${city}. Revisemos si el gasto sigue en rango.`
    if (condition === 'rainy' || condition === 'drizzle') return `Buenas tardes, ${firstName}. ${temp}° y lluvia en ${city}. Ideal para ordenar movimientos.`
    if (condition === 'stormy') return `Buenas tardes, ${firstName}. Tormenta con ${temp}° en ${city}. Quedáte al tanto de tus pagos fijos.`
    return `Buenas tardes, ${firstName}. ${temp}° en ${city}. Veamos el pulso del mes.`
  }

  if (condition === 'sunny') return `Buenas noches, ${firstName}. ${temp}° en ${city}. Buen momento para cerrar gastos.`
  if (condition === 'rainy' || condition === 'drizzle' || condition === 'stormy') return `Buenas noches, ${firstName}. Llueve afuera con ${temp}° en ${city}. Cerremos el día financiero.`
  return `Buenas noches, ${firstName}. ${temp}° afuera en ${city}. Cerremos el día financiero.`
}

interface DailyGreetingProps {
  firstName: string
}

export function DailyGreeting({ firstName }: DailyGreetingProps) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [weather, setWeather] = useState<WeatherSnap | null>(null)
  const [progress, setProgress] = useState(1)
  const [audioState, setAudioState] = useState<AudioState>('idle')

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioBufRef = useRef<AudioBuffer | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const pausedRef = useRef(false)

  function getAudioCtx() {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    return audioCtxRef.current
  }

  const startDismissTimer = useCallback(() => {
    pausedRef.current = false
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)

    const start = Date.now()
    setProgress(1)

    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return
      const elapsed = Date.now() - start
      const p = 1 - elapsed / DISMISS_AFTER_MS
      if (p <= 0) {
        clearInterval(intervalRef.current!)
        setVisible(false)
      } else {
        setProgress(p)
      }
    }, 50)

    timerRef.current = setTimeout(() => {
      if (!pausedRef.current) setVisible(false)
    }, DISMISS_AFTER_MS)
  }, [])

  const playBuffer = useCallback((buffer: AudioBuffer) => {
    const ctx = getAudioCtx()
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    sourceRef.current = source
    pausedRef.current = true

    source.onended = () => {
      sourceRef.current = null
      setAudioState('idle')
      pausedRef.current = false
    }

    source.start(0)
    setAudioState('playing')
  }, [])

  const triggerTTS = useCallback(async (text: string) => {
    setAudioState('loading')
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: getSavedVoice() }),
      })
      if (!res.ok) { setAudioState('blocked'); return }

      const arr = await res.arrayBuffer()
      const ctx = getAudioCtx()

      if (ctx.state === 'suspended') {
        try { await ctx.resume() } catch { /* no gesture yet */ }
      }

      const buffer = await ctx.decodeAudioData(arr)
      audioBufRef.current = buffer

      if (ctx.state === 'running') {
        playBuffer(buffer)
      } else {
        // autoplay blocked — guardamos el buffer y mostramos botón
        setAudioState('blocked')
      }
    } catch {
      setAudioState('blocked')
    }
  }, [playBuffer])

  function handleSpeakerClick() {
    if (audioState === 'playing') {
      // Silenciar
      try { sourceRef.current?.stop() } catch { /* ya terminó */ }
      sourceRef.current = null
      setAudioState('idle')
      pausedRef.current = false
      return
    }

    // Reproducir (o reintentar si bloqueado)
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') void ctx.resume()

    if (audioBufRef.current) {
      playBuffer(audioBufRef.current)
    } else if (message) {
      void triggerTTS(message)
    }
  }

  useEffect(() => {
    if (wasGreetedToday()) return

    let cancelled = false

    fetchWeatherSnap()
      .then(snap => {
        if (cancelled) return
        const msg = buildGreeting(firstName, snap)
        setWeather(snap)
        setMessage(msg)
        setVisible(true)
        markGreetedToday()
        void triggerTTS(msg)
      })
      .catch(() => {
        if (cancelled) return
        const msg = buildGreeting(firstName, null)
        setMessage(msg)
        setVisible(true)
        markGreetedToday()
        void triggerTTS(msg)
      })

    return () => { cancelled = true }
  }, [firstName, triggerTTS])

  useEffect(() => {
    if (!visible) return
    const kickoffTimer = setTimeout(startDismissTimer, 0)
    return () => {
      clearTimeout(kickoffTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [visible, startDismissTimer])

  function handleClose() {
    try { sourceRef.current?.stop() } catch { /* ya terminó */ }
    sourceRef.current = null
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="mx-auto mb-4 sm:mb-6 max-w-[1120px] relative overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(124,109,250,0.09) 0%, rgba(17,17,24,0.97) 100%)',
            border: '1px solid rgba(124,109,250,0.18)',
            boxShadow: '0 8px 32px rgba(124,109,250,0.07), 0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {/* Barra de progreso */}
          {audioState !== 'playing' && (
            <div
              className="absolute bottom-0 left-0 h-[2px] rounded-full"
              style={{
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, rgba(124,109,250,0.7), rgba(189,180,255,0.35))',
              }}
            />
          )}

          <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
            {/* Indicador Lumus — anima cuando habla */}
            <div className="relative flex-shrink-0">
              <motion.div
                className="size-8 rounded-full"
                animate={audioState === 'playing'
                  ? { boxShadow: ['0 0 14px rgba(124,109,250,0.3)', '0 0 28px rgba(124,109,250,0.7)', '0 0 14px rgba(124,109,250,0.3)'] }
                  : { boxShadow: '0 0 14px rgba(124,109,250,0.3)' }
                }
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  background: 'radial-gradient(circle, rgba(124,109,250,0.35) 0%, rgba(124,109,250,0.06) 70%)',
                  border: '1px solid rgba(124,109,250,0.28)',
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center">
                {audioState === 'playing' ? (
                  /* Barras animadas mientras habla */
                  <span className="flex items-end gap-[2px]">
                    {[0, 0.15, 0.3].map((delay) => (
                      <motion.span
                        key={delay}
                        className="w-[2px] rounded-full bg-[#bdb4ff]"
                        animate={{ height: ['4px', '10px', '4px'] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay, ease: 'easeInOut' }}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="size-2 rounded-full bg-[#bdb4ff] shadow-[0_0_8px_rgba(189,180,255,0.9)]" />
                )}
              </span>
            </div>

            {/* Mensaje */}
            <p className="flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Lumus</span>
              <span className="mx-1.5 text-[var(--text-muted)]">·</span>
              {message}
            </p>

            {/* Badge de clima */}
            {weather && (
              <div
                className="flex-shrink-0 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:gap-2 sm:px-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <WeatherIcon condition={weather.condition} size={22} />
                <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                  {weather.temp}°
                </span>
                <span className="hidden text-xs text-[var(--text-muted)] sm:block">
                  {weather.city}
                </span>
              </div>
            )}

            {/* Botón de voz */}
            <button
              onClick={handleSpeakerClick}
              disabled={audioState === 'loading'}
              className="flex-shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-40"
              style={{
                color: audioState === 'playing' ? '#bdb4ff' : 'var(--text-muted)',
                background: audioState === 'playing' ? 'rgba(124,109,250,0.12)' : 'transparent',
              }}
              aria-label={audioState === 'playing' ? 'Silenciar' : 'Escuchar'}
            >
              {audioState === 'loading' ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Volume2 size={15} />
              )}
            </button>

            {/* Cerrar */}
            <button
              onClick={handleClose}
              className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
              aria-label="Cerrar saludo"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
