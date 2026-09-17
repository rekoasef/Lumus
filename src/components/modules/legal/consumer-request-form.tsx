'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Loader2 } from 'lucide-react'
import type { ConsumerRequestKind } from '@/lib/legal/consumer-requests'

const LABELS = {
  email: 'Mail de tu cuenta',
  emailPlaceholder: 'tu@email.com',
  reason: 'Motivo (opcional)',
  reasonPlaceholder: 'No hace falta que nos digas por qué.',
  submit: { arrepentimiento: 'Me arrepiento', baja: 'Darme de baja' },
  sending: 'Enviando...',
  doneTitle: 'Recibimos tu solicitud',
  codeLabel: 'Código de identificación',
  copy: 'Copiar código',
  copied: 'Copiado',
  doneBody:
    'Guardá este código. Si el mail corresponde a una cuenta de Lumus, te mandamos un link para confirmar la solicitud: así nadie puede hacerla en tu nombre. Revisá también la carpeta de spam.',
  genericError: 'No pudimos registrar la solicitud. Probá de nuevo.',
} as const

export function ConsumerRequestForm({ kind }: { kind: ConsumerRequestKind }) {
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/consumer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, email, reason: reason.trim() || null, website }),
      })
      const data = await res.json() as { code?: string; error?: string }
      if (!res.ok || !data.code) throw new Error(data.error ?? LABELS.genericError)
      setCode(data.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : LABELS.genericError)
    } finally {
      setSending(false)
    }
  }

  async function copyCode() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Sin permiso de portapapeles: el código queda a la vista igual.
    }
  }

  if (code) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
        className="rounded-2xl border border-[var(--accent-lumus)]/25 bg-[var(--accent-muted)] p-6"
        role="status"
      >
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <span className="grid size-7 place-items-center rounded-full bg-[var(--accent-lumus)] text-white">
            <Check size={15} strokeWidth={3} />
          </span>
          <h2 className="lumus-heading text-lg font-semibold">{LABELS.doneTitle}</h2>
        </div>

        <p className="lumus-label mt-6 text-[0.62rem] text-[var(--text-muted)]">{LABELS.codeLabel}</p>
        <div className="mt-2 flex items-center gap-3">
          <p className="font-mono text-2xl font-bold tracking-[0.12em] text-[var(--text-primary)] select-all sm:text-3xl">{code}</p>
          <button
            type="button"
            onClick={copyCode}
            aria-label={LABELS.copy}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-[var(--text-secondary)] transition-colors hover:bg-white/5"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? LABELS.copied : LABELS.copy}
          </button>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)]">{LABELS.doneBody}</p>
      </motion.div>
    )
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--accent-lumus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lumus)]/30 sm:text-sm'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="request-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          {LABELS.email}
        </label>
        <input
          id="request-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={LABELS.emailPlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="request-reason" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          {LABELS.reason}
        </label>
        <textarea
          id="request-reason"
          rows={3}
          maxLength={1000}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={LABELS.reasonPlaceholder}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Trampa para bots: fuera de la vista y del foco. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={website}
        onChange={e => setWebsite(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {error && (
        <p role="alert" className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-lumus)] text-sm font-bold text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {sending && <Loader2 size={16} className="animate-spin" />}
        {sending ? LABELS.sending : LABELS.submit[kind]}
      </button>
    </form>
  )
}
