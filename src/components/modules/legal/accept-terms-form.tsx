'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { LEGAL_PATHS } from '@/lib/legal/owner'

const LABELS = {
  checkboxBefore: 'Leí y acepto los ',
  terms: 'términos y condiciones',
  and: ' y la ',
  privacy: 'política de privacidad',
  submit: 'Aceptar y seguir',
  sending: 'Guardando...',
  genericError: 'No se pudo guardar. Probá de nuevo.',
} as const

export function AcceptTermsForm({ version }: { version: string }) {
  const [checked, setChecked] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/legal/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? LABELS.genericError)
      // Navegación completa y no `router.replace`: en producción el router del
      // cliente tenía cacheado que /dashboard redirigía acá (de antes de
      // aceptar), y la persona quedaba en esta pantalla aunque ya había aceptado.
      window.location.assign('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : LABELS.genericError)
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <TermsCheckbox checked={checked} onChange={setChecked} />

      {error && (
        <p role="alert" className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={accept}
        disabled={!checked || sending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-lumus)] text-sm font-bold text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        {sending && <Loader2 size={16} className="animate-spin" />}
        {sending ? LABELS.sending : LABELS.submit}
      </button>
    </div>
  )
}

/** El checkbox con los dos links. Lo usan el registro y esta pantalla. */
export function TermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[var(--text-secondary)]">
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--accent-lumus)]"
      />
      <span>
        {LABELS.checkboxBefore}
        <Link href={LEGAL_PATHS.terms} target="_blank" className="text-[var(--accent-lumus)] underline-offset-2 hover:underline">{LABELS.terms}</Link>
        {LABELS.and}
        <Link href={LEGAL_PATHS.privacy} target="_blank" className="text-[var(--accent-lumus)] underline-offset-2 hover:underline">{LABELS.privacy}</Link>
        .
      </span>
    </label>
  )
}
