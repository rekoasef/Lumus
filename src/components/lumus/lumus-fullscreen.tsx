'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard, Mic, MicOff, Loader2 } from 'lucide-react'
import { LumusOrb } from './lumus-orb'
import { useVoiceLumus } from '@/hooks/use-voice-lumus'
import type { OrbState } from './lumus-orb'

const SUGGESTIONS = [
  '¿Cómo fue mi día?',
  'Revisa mi agenda',
  'Necesito enfocarme',
  '¿Cómo estoy durmiendo?',
]

const WAVE = [3, 6, 4, 9, 5, 8, 3]

interface LumusFullscreenProps {
  onClose: () => void
}

export function LumusFullscreen({ onClose }: LumusFullscreenProps) {
  const { voiceState, transcript, spokenText, isSupported, start, stop, sendMessage } = useVoiceLumus()

  const orbState: OrbState =
    voiceState === 'listening'  ? 'listening'  :
    voiceState === 'processing' ? 'thinking'   :
    voiceState === 'speaking'   ? 'speaking'   : 'idle'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { stop(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stop, onClose])

  const handleClose = () => { stop(); onClose() }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex h-screen flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ backgroundColor: '#07000f' }}
    >
      {/* Glow violeta detrás del orbe — solo lado izquierdo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 55% 65% at 26% 50%, rgba(90,40,180,0.32) 0%, rgba(60,20,120,0.12) 45%, transparent 70%)',
        }}
      />

      {/* ── TOP BAR ── */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-7">
        {/* Botón X */}
        <motion.button
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <X size={16} className="text-white/60" />
        </motion.button>

        {/* Badge ✦ Lumus */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span className="text-[11px]" style={{ color: '#a78bfa' }}>✦</span>
          <span className="text-sm font-medium text-white/70">Lumus</span>
        </motion.div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-10 flex flex-1 items-center overflow-hidden">

        {/* IZQUIERDA — Orbe */}
        <div className="relative flex h-full w-[52%] items-center justify-center">
          {/* Listening ring */}
          <AnimatePresence>
            {voiceState === 'listening' && (
              <motion.div
                className="pointer-events-none absolute rounded-full"
                initial={{ opacity: 0 }}
                animate={{ scale: [1.1, 1.55, 1.1], opacity: [0.35, 0.04, 0.35] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '540px', height: '540px',
                  background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
                }}
              />
            )}
          </AnimatePresence>

          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 22, stiffness: 170 }}
          >
            <LumusOrb state={orbState} size={500} />
          </motion.div>
        </div>

        {/* DERECHA — Texto y chips */}
        <motion.div
          className="flex w-[48%] flex-col justify-center gap-9 pr-20"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.32 }}
        >
          {/* Heading / estado */}
          <AnimatePresence mode="wait">
            {voiceState === 'speaking' && spokenText ? (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <p className="mb-2.5 text-[0.6rem] uppercase tracking-[0.22em]" style={{ color: 'rgba(167,139,250,0.65)' }}>
                  Lumus
                </p>
                <p className="text-[1.8rem] font-light leading-relaxed text-white/88">
                  {spokenText}
                  <motion.span
                    className="ml-1.5 inline-block h-3.5 w-[2px] rounded-full align-middle"
                    style={{ background: 'rgba(255,255,255,0.4)' }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.78, repeat: Infinity }}
                  />
                </p>
              </motion.div>

            ) : voiceState === 'listening' && transcript ? (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <p className="text-4xl font-semibold leading-snug text-white">
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>&quot;</span>
                  {transcript}
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>&quot;</span>
                </p>
              </motion.div>

            ) : voiceState === 'processing' ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <p className="mb-3 text-[0.6rem] uppercase tracking-[0.22em]" style={{ color: 'rgba(167,139,250,0.5)' }}>
                  Pensando
                </p>
                <div className="flex items-center gap-3">
                  <h1 className="text-5xl font-semibold leading-[1.18]" style={{ color: 'rgba(196,181,253,0.9)' }}>
                    Un momento...
                  </h1>
                  <div className="flex items-end gap-1.5 pb-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 rounded-full"
                        style={{ background: 'rgba(167,139,250,0.6)' }}
                        animate={{ height: ['6px', '18px', '6px'] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>

            ) : voiceState === 'listening' ? (
              <motion.div
                key="listening"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <h1 className="text-5xl font-semibold leading-[1.18] text-white">
                  Te escucho...
                </h1>
              </motion.div>

            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <h1 className="text-5xl font-semibold leading-[1.18] text-white">
                  Estoy aquí,<br />¿qué necesitás?
                </h1>
                <p className="mt-4 text-[1.05rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Podés hablar conmigo sobre cualquier<br />
                  área de tu vida. Estoy aquí para ayudarte.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chips 2×2 — solo en idle */}
          <AnimatePresence>
            {voiceState === 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    onClick={() => sendMessage(s)}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-full px-4 py-2.5 text-center text-sm text-white/58 transition-colors hover:text-white/82"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {s}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="relative z-10 flex flex-col items-center gap-3 pb-8 pt-5">

        {/* Fila de controles */}
        <div className="flex items-center gap-16">

          {/* Escribir */}
          <button
            className="flex items-center gap-2 text-sm transition-colors hover:text-white/60"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <Keyboard size={17} />
            <span>Escribir</span>
          </button>

          {/* Micrófono principal */}
          <div className="relative">
            {/* Anillo exterior */}
            <motion.div
              className="pointer-events-none absolute rounded-full"
              style={{
                inset: '-14px',
                border: voiceState === 'listening'
                  ? '1.5px solid rgba(34,197,94,0.45)'
                  : '1.5px solid rgba(140,90,240,0.45)',
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.button
              onClick={start}
              disabled={voiceState === 'processing'}
              whileTap={{ scale: 0.9 }}
              className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full disabled:opacity-50"
              style={{
                background: voiceState === 'listening'
                  ? 'rgba(34,197,94,0.15)'
                  : 'rgba(110,60,220,0.28)',
                border: voiceState === 'listening'
                  ? '1px solid rgba(34,197,94,0.45)'
                  : '1px solid rgba(150,100,250,0.5)',
                boxShadow: voiceState === 'listening'
                  ? '0 0 30px rgba(34,197,94,0.18), inset 0 0 12px rgba(34,197,94,0.08)'
                  : '0 0 30px rgba(120,70,240,0.2), inset 0 0 12px rgba(120,70,240,0.08)',
              }}
            >
              {voiceState === 'processing' ? (
                <Loader2 size={24} className="animate-spin" style={{ color: '#c4b5fd' }} />
              ) : voiceState === 'listening' ? (
                <MicOff size={24} style={{ color: '#4ade80' }} />
              ) : (
                <Mic size={24} style={{ color: '#c4b5fd' }} />
              )}
            </motion.button>
          </div>

          {/* Waveform + Hablar con Lumus */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-end gap-[3px]" style={{ height: '16px' }}>
              {WAVE.map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[2.5px] rounded-full"
                  style={{
                    background: voiceState === 'speaking'
                      ? 'rgba(167,139,250,0.9)'
                      : 'rgba(255,255,255,0.2)',
                  }}
                  animate={voiceState === 'speaking'
                    ? { height: [`${h}px`, `${h * 2.3}px`, `${h}px`] }
                    : { height: `${h * 0.42}px` }
                  }
                  transition={{
                    duration: 0.42 + i * 0.08,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.04,
                  }}
                />
              ))}
            </div>
            <span
              className="text-sm transition-colors"
              style={{ color: voiceState === 'speaking' ? '#c4b5fd' : 'rgba(255,255,255,0.35)' }}
            >
              Hablar con Lumus
            </span>
          </div>

        </div>

        {/* Status text */}
        <motion.p
          key={voiceState}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          {voiceState === 'listening'  ? 'Lumus está escuchando...'    :
           voiceState === 'processing' ? 'Analizando tu mensaje...'   :
           voiceState === 'speaking'   ? 'Lumus está hablando...'     :
           'Presioná el micrófono para hablar'}
        </motion.p>

        {/* Línea punteada */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 32 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-px w-2 rounded-full"
              style={{ background: 'rgba(140,90,240,0.22)' }}
              animate={voiceState === 'listening' || voiceState === 'speaking'
                ? { opacity: [0.2, 0.8, 0.2] }
                : { opacity: 0.4 }
              }
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.03 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
