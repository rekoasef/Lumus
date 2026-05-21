'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff, Loader2 } from 'lucide-react'
import { LumusOrb } from './lumus-orb'
import { useVoiceLumus, VOICE_LABELS } from '@/hooks/use-voice-lumus'
import type { OrbState } from './lumus-orb'

interface VoiceModalProps {
  onClose: () => void
}

const STATE_LABELS: Record<string, string> = {
  idle:       'Tocá el micrófono para hablar',
  listening:  'Escuchándote...',
  processing: 'Procesando...',
  speaking:   'Hablando...',
}

export function VoiceModal({ onClose }: VoiceModalProps) {
  const { voiceState, transcript, spokenText, currentVoice, isSupported, start, stop } = useVoiceLumus()

  const orbState: OrbState =
    voiceState === 'listening'  ? 'listening'  :
    voiceState === 'processing' ? 'thinking'   :
    voiceState === 'speaking'   ? 'speaking'   : 'idle'

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { stop(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stop, onClose])

  // Detener al cerrar
  function handleClose() {
    stop()
    onClose()
  }

  if (!isSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="rounded-2xl bg-[#111118] p-8 text-center max-w-sm mx-4"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <MicOff size={40} className="mx-auto mb-4 text-[var(--text-muted)]" />
          <p className="font-semibold text-[var(--text-primary)]">Micrófono no disponible</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Tu navegador no soporta reconocimiento de voz. Usá Chrome o Edge.
          </p>
          <button onClick={handleClose}
            className="mt-6 rounded-full bg-white/10 px-6 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/15">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-[460px] -translate-x-1/2"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(10,10,18,0.96)',
          backdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(124,109,250,0.2)',
          borderLeft: '1px solid rgba(124,109,250,0.1)',
          borderRight: '1px solid rgba(124,109,250,0.1)',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -16px 60px rgba(124,109,250,0.15), 0 -4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute right-5 top-4 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center px-8 pb-10 pt-4 gap-5">

          {/* Orb */}
          <div className="relative">
            {/* Glow ring pulsante cuando escucha */}
            {voiceState === 'listening' && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
                  scale: 1.4,
                }}
                animate={{ scale: [1.4, 1.8, 1.4], opacity: [0.8, 0.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <LumusOrb state={orbState} size={180} />
          </div>

          {/* Estado + voz activa */}
          <div className="text-center space-y-1">
            <motion.p
              key={voiceState}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium text-[var(--text-muted)]"
            >
              {STATE_LABELS[voiceState]}
            </motion.p>
            <motion.p
              key={currentVoice}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[0.6rem] uppercase tracking-widest"
              style={{ color: 'rgba(124,109,250,0.7)' }}
            >
              {VOICE_LABELS[currentVoice]}
            </motion.p>
          </div>

          {/* Transcript en vivo */}
          <AnimatePresence>
            {transcript && voiceState === 'listening' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="w-full rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(124,109,250,0.08)', border: '1px solid rgba(124,109,250,0.18)' }}
              >
                <p className="text-sm text-[#bdb4ff] italic">&quot;{transcript}&quot;</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Respuesta de Lumus — oración por oración sincronizada con el audio */}
          <AnimatePresence>
            {spokenText && voiceState !== 'listening' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full rounded-2xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Lumus</p>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {spokenText}
                  {voiceState === 'speaking' && (
                    <span className="ml-1 inline-block h-2 w-0.5 animate-pulse bg-[var(--text-muted)] align-middle" />
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Indicador mientras Lumus procesa y todavía no habló nada */}
          <AnimatePresence>
            {voiceState === 'processing' && !spokenText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-1 items-center"
              >
                {[0, 0.15, 0.3].map((delay, i) => (
                  <motion.span
                    key={i}
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: 'rgba(124,109,250,0.6)' }}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay, ease: 'easeInOut' }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botón de micrófono */}
          <button
            onClick={start}
            disabled={voiceState === 'processing'}
            className="relative flex flex-col items-center gap-2 group"
          >
            <motion.div
              whileTap={{ scale: 0.92 }}
              className="flex h-16 w-16 items-center justify-center rounded-full transition-colors"
              style={{
                background: voiceState === 'listening'
                  ? 'rgba(34,197,94,0.2)'
                  : voiceState === 'processing'
                  ? 'rgba(124,109,250,0.15)'
                  : 'rgba(124,109,250,0.15)',
                border: voiceState === 'listening'
                  ? '2px solid rgba(34,197,94,0.6)'
                  : '2px solid rgba(124,109,250,0.35)',
                boxShadow: voiceState === 'listening'
                  ? '0 0 24px rgba(34,197,94,0.35)'
                  : '0 0 16px rgba(124,109,250,0.2)',
              }}
            >
              {voiceState === 'processing' ? (
                <Loader2 size={24} className="animate-spin text-[#bdb4ff]" />
              ) : voiceState === 'listening' ? (
                <MicOff size={24} className="text-[#22c55e]" />
              ) : (
                <Mic size={24} className="text-[#bdb4ff]" />
              )}
            </motion.div>
            <span className="text-[0.65rem] text-[var(--text-muted)]">
              {voiceState === 'listening' ? 'Detener' : voiceState === 'idle' ? 'Hablar' : ''}
            </span>
          </button>

        </div>
      </motion.div>
    </AnimatePresence>
  )
}
