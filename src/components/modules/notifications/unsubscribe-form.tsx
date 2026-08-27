'use client'

import { useState } from 'react'
import { Check, Loader2, BellOff } from 'lucide-react'

const LABELS = {
  title: 'Dejar de recibir avisos',
  description: 'Vas a dejar de recibir los mails de vencimientos. Los avisos van a seguir apareciendo dentro de la app.',
  confirm: 'Confirmar la baja',
  sending: 'Guardando...',
  doneTitle: 'Listo, no te escribimos más',
  doneDescription: 'Podés volver a activarlos cuando quieras desde tu perfil en Lumus.',
  error: 'No se pudo guardar la baja. Probá de nuevo.',
  back: 'Ir a Lumus',
} as const

export function UnsubscribeForm({ token }: { token: string }) {
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSaving(true)
    setError(null)

    const res = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => null)

    if (!res?.ok) {
      setError(LABELS.error)
      setSaving(false)
      return
    }

    setDone(true)
    setSaving(false)
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-muted)]">
          <Check className="h-6 w-6 text-[var(--success)]" />
        </div>
        <h1 className="lumus-heading mt-5 text-2xl font-bold text-[var(--text-primary)]">{LABELS.doneTitle}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{LABELS.doneDescription}</p>
        <a
          href="/dashboard"
          className="mt-7 inline-block rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
        >
          {LABELS.back}
        </a>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
        <BellOff className="h-6 w-6 text-[var(--text-secondary)]" />
      </div>
      <h1 className="lumus-heading mt-5 text-2xl font-bold text-[var(--text-primary)]">{LABELS.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{LABELS.description}</p>

      <button
        onClick={handleConfirm}
        disabled={saving}
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saving ? LABELS.sending : LABELS.confirm}
      </button>

      {error ? <p className="mt-4 text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  )
}
