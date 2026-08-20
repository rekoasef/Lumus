'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquarePlus, Bug, Lightbulb, MessageCircle, X, Check, Loader2 } from 'lucide-react'
import { FEEDBACK_KINDS } from '@/lib/validations/feedback'
import type { FeedbackKind } from '@/types'

const LABELS = {
  trigger: 'Enviar feedback',
  title: 'Contanos algo',
  subtitle: 'Estamos puliendo Lumus. Todo lo que reportes se lee.',
  placeholder: '¿Qué pasó? Si es un bug, contá qué estabas haciendo justo antes.',
  submit: 'Enviar',
  sending: 'Enviando...',
  success: '¡Gracias! Lo recibimos.',
  error: 'No se pudo enviar. Probá de nuevo.',
  close: 'Cerrar',
} as const

const KIND_CONFIG: Record<FeedbackKind, { label: string; icon: typeof Bug; color: string }> = {
  bug:    { label: 'Bug',    icon: Bug,           color: '#f87171' },
  mejora: { label: 'Mejora', icon: Lightbulb,     color: '#fbbf24' },
  otro:   { label: 'Otro',   icon: MessageCircle, color: '#a78bfa' },
}

const MAX_LENGTH = 2000
const SUCCESS_CLOSE_MS = 1600

export function FeedbackButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<FeedbackKind>('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cerrar con Escape, como el resto de los diálogos de la app.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // El formulario se resetea al cerrar, no al abrir: si el envío falla y el
  // usuario cierra sin querer, no pierde lo que escribió hasta ese momento.
  function close() {
    setOpen(false)
    setTimeout(() => {
      setMessage('')
      setKind('bug')
      setSent(false)
      setError(null)
    }, 200)
  }

  async function handleSubmit() {
    const trimmed = message.trim()
    if (!trimmed || sending) return

    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, message: trimmed, path: pathname }),
      })
      if (!res.ok) throw new Error('request failed')
      setSent(true)
      setTimeout(close, SUCCESS_CLOSE_MS)
    } catch {
      setError(LABELS.error)
    } finally {
      setSending(false)
    }
  }

  const remaining = MAX_LENGTH - message.length
  const canSubmit = message.trim().length > 0 && !sending

  return (
    <>
      {/* Trigger: sobre la bottom-nav en mobile, esquina libre en desktop */}
      <button
        onClick={() => setOpen(true)}
        aria-label={LABELS.trigger}
        title={LABELS.trigger}
        className="fixed bottom-28 right-4 z-40 flex size-11 items-center justify-center rounded-full border border-white/10 bg-[#13121c]/90 text-[var(--text-secondary)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all hover:scale-105 hover:border-[var(--accent-lumus)]/40 hover:text-[var(--accent-lumus)] lg:bottom-6 lg:right-6"
      >
        <MessageSquarePlus size={18} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="feedback-backdrop"
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={close}
            />

            <motion.div
              key="feedback-dialog"
              className="fixed inset-x-4 bottom-4 z-[201] mx-auto max-w-md sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div
                className="rounded-2xl p-5"
                style={{
                  background: '#13121c',
                  border: '1px solid rgba(124,109,250,0.2)',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                }}
              >
                {sent ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                      className="flex size-11 items-center justify-center rounded-full"
                      style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success)' }}
                    >
                      <Check size={20} />
                    </motion.div>
                    <p className="text-sm font-medium text-white">{LABELS.success}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{LABELS.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-white/45">{LABELS.subtitle}</p>
                      </div>
                      <button
                        onClick={close}
                        aria-label={LABELS.close}
                        className="flex-shrink-0 rounded-lg p-1 text-white/30 transition-colors hover:text-white/60"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {FEEDBACK_KINDS.map(k => {
                        const config = KIND_CONFIG[k]
                        const Icon = config.icon
                        const active = kind === k
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setKind(k)}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-all ${
                              active
                                ? 'border-white/20 bg-white/[0.07] text-white'
                                : 'border-white/[0.07] bg-white/[0.02] text-white/45 hover:border-white/15'
                            }`}
                          >
                            <Icon size={13} style={{ color: active ? config.color : undefined }} />
                            {config.label}
                          </button>
                        )
                      })}
                    </div>

                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                      placeholder={LABELS.placeholder}
                      rows={4}
                      autoFocus
                      className="mt-3 w-full resize-none rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-sm text-white placeholder:text-white/25 focus:border-[var(--accent-lumus)]/40 focus:outline-none"
                    />

                    {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-[0.65rem] tabular-nums text-white/25">
                        {remaining}
                      </span>
                      <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2 text-xs font-medium text-white transition-opacity hover:bg-[var(--accent-hover)] disabled:opacity-40"
                      >
                        {sending && <Loader2 size={13} className="animate-spin" />}
                        {sending ? LABELS.sending : LABELS.submit}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
