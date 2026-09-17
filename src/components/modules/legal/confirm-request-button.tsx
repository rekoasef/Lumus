'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import type { ConsumerRequestKind } from '@/lib/legal/consumer-requests'

const LABELS = {
  confirm: { arrepentimiento: 'Confirmar el arrepentimiento', baja: 'Confirmar la baja' },
  sending: 'Confirmando...',
  doneTitle: 'Listo',
  alreadyTitle: 'Esta solicitud ya se había confirmado',
  expiredTitle: 'El link venció',
  expiredBody: 'Hacé la solicitud de nuevo desde el mismo botón: te damos un código y un link nuevos.',
  genericError: 'No pudimos completar la solicitud. Probá de nuevo en unos minutos.',
} as const

type Response =
  | { status: 'done'; outcome: string }
  | { status: 'already' | 'expired' | 'invalid' }
  | { error: string }

export function ConfirmRequestButton({ token, kind }: { token: string; kind: ConsumerRequestKind }) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ title: string; body?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/consumer-requests/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json() as Response
      if ('error' in data) throw new Error(data.error)
      if (data.status === 'done') setResult({ title: LABELS.doneTitle, body: data.outcome })
      else if (data.status === 'expired') setResult({ title: LABELS.expiredTitle, body: LABELS.expiredBody })
      else setResult({ title: LABELS.alreadyTitle })
    } catch (err) {
      setError(err instanceof Error ? err.message : LABELS.genericError)
    } finally {
      setSending(false)
    }
  }

  if (result) {
    return (
      <div role="status" className="rounded-2xl border border-[var(--accent-lumus)]/25 bg-[var(--accent-muted)] p-5">
        <p className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <Check size={16} className="text-[var(--accent-lumus)]" /> {result.title}
        </p>
        {result.body && <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{result.body}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={confirm}
        disabled={sending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-lumus)] text-sm font-bold text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {sending && <Loader2 size={16} className="animate-spin" />}
        {sending ? LABELS.sending : LABELS.confirm[kind]}
      </button>
    </div>
  )
}
