'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Loader2, Trash2 } from 'lucide-react'
import { DELETE_ACCOUNT_PHRASE } from '@/lib/validations/profile'
import { SectionHeading } from './section-heading'

const LABELS = {
  heading: 'Eliminar cuenta',
  toggle: 'Eliminar mi cuenta y mis datos',
  toggleHint: 'Se da de baja la suscripción y se borra todo',
  warning:
    'Se cancela tu suscripción (no hay más cobros) y se borran para siempre tus billeteras, movimientos, presupuestos, metas, préstamos, informes y tu perfil. No se puede deshacer.',
  password: 'Tu contraseña',
  phrase: `Escribí ${DELETE_ACCOUNT_PHRASE} para confirmar`,
  submit: 'Eliminar la cuenta',
  sending: 'Eliminando...',
  adminNote: 'Las cuentas de administrador no se eliminan desde acá.',
  doneTitle: 'Tu cuenta fue eliminada',
  doneBody: 'Te mandamos la constancia por mail. Código:',
  goodbye: 'Volver al inicio',
  genericError: 'No pudimos eliminar la cuenta. Probá de nuevo.',
} as const

export function DeleteAccountSection({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [phrase, setPhrase] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)

  const canSubmit = password.length > 0 && phrase === DELETE_ACCOUNT_PHRASE && !sending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmation: phrase }),
      })
      const data = await res.json() as { code?: string; error?: string }
      if (!res.ok || !data.code) throw new Error(data.error ?? LABELS.genericError)
      setCode(data.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : LABELS.genericError)
      setSending(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-base text-[var(--text-primary)] focus:border-[var(--danger)] focus:outline-none sm:text-sm'

  if (code) {
    return (
      <section role="status" className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">{LABELS.doneTitle}</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{LABELS.doneBody}</p>
        <p className="mt-2 font-mono text-xl font-bold tracking-[0.12em] text-[var(--text-primary)] select-all">{code}</p>
        {/* Navegación completa: la sesión ya no existe y el router del cliente no lo sabe. */}
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="mt-6 inline-block rounded-full border border-white/10 px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/5"
        >
          {LABELS.goodbye}
        </button>
      </section>
    )
  }

  return (
    <section>
      <SectionHeading index="06" label={LABELS.heading} />

      {isAdmin ? (
        <p className="mt-6 text-sm text-[var(--text-muted)]">{LABELS.adminNote}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            className="mt-6 flex w-full items-center justify-between rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.04] px-4 py-3 text-left transition-colors hover:border-[var(--danger)]/40"
          >
            <span>
              <span className="block text-sm text-[var(--danger)]">{LABELS.toggle}</span>
              <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{LABELS.toggleHint}</span>
            </span>
            <ChevronDown size={15} className={`shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="delete-form"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{LABELS.warning}</p>

                  <div>
                    <label htmlFor="delete-password" className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">{LABELS.password}</label>
                    <input
                      id="delete-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="delete-phrase" className="lumus-label mb-1.5 block text-[0.65rem] text-[var(--text-muted)]">{LABELS.phrase}</label>
                    <input
                      id="delete-phrase"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      value={phrase}
                      onChange={e => setPhrase(e.target.value.toUpperCase())}
                      placeholder={DELETE_ACCOUNT_PHRASE}
                      className={`${inputClass} font-mono tracking-[0.12em] placeholder:text-[var(--text-muted)]/50`}
                    />
                  </div>

                  {error && (
                    <p role="alert" className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--danger)] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto sm:px-5"
                  >
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    {sending ? LABELS.sending : LABELS.submit}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </section>
  )
}
