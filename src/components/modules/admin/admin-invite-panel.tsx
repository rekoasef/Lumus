'use client'

import { useState } from 'react'
import { Copy, Mail, X } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/components/shared/confirm-dialog'
import { useAdminActions } from '@/hooks/use-admin-actions'
import { ACCESS_DURATIONS, DEFAULT_ACCESS_DAYS } from '@/lib/admin/grants'
import { inviteSchema } from '@/lib/validations/admin'
import type { AdminInvite } from '@/types/admin.types'

const REGISTER_PATH = '/register'
const DEFAULT_REASON = 'beta tester'

function durationLabel(days: number | null): string {
  return ACCESS_DURATIONS.find(d => d.days === days)?.label ?? (days === null ? 'Sin vencimiento' : `${days} días`)
}

async function copyRegisterLink() {
  const link = `${window.location.origin}${REGISTER_PATH}`
  try {
    await navigator.clipboard.writeText(link)
    toast.success('Link de registro copiado')
  } catch {
    toast.message(link)
  }
}

export function AdminInvitePanel({ invites }: { invites: AdminInvite[] }) {
  const { pending, invite, cancelInvite } = useAdminActions()
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState(DEFAULT_REASON)
  const [accessDays, setAccessDays] = useState<number | null>(DEFAULT_ACCESS_DAYS)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = inviteSchema.safeParse({ email, reason, accessDays })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá los datos')
      return
    }
    setError(null)

    try {
      const outcome = await invite(parsed.data)
      setEmail('')
      if (outcome === 'granted_existing') {
        toast.success(`${parsed.data.email} ya tenía cuenta: le diste acceso ahora mismo`)
      } else {
        toast.success('Invitación guardada. Pasale el link de registro', {
          action: { label: 'Copiar link', onClick: () => void copyRegisterLink() },
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo invitar')
    }
  }

  async function handleCancel(item: AdminInvite) {
    const ok = await confirm({
      title: 'Cancelar invitación',
      description: `Si ${item.email} se registra después, va a quedar frenado en el paywall como cualquier otro.`,
      confirmLabel: 'Cancelar invitación',
      variant: 'warning',
    })
    if (!ok) return
    try {
      await cancelInvite(item.id)
      toast.success('Invitación cancelada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar')
    }
  }

  return (
    <section className="lumus-glass rounded-3xl p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Testers</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Invitar a alguien</h2>
        </div>
        <button
          type="button"
          onClick={() => void copyRegisterLink()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-[var(--text-muted)] transition-colors hover:border-white/20 hover:text-[var(--text-secondary)]"
        >
          <Copy size={12} /> Link de registro
        </button>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
        Se registra con su propia contraseña y, si usa este mail, entra sin pasar por el paywall.
        Si ya tiene cuenta, el acceso se le da en el momento.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <label className="block">
            <span className="lumus-label text-[0.56rem] text-[var(--text-muted)]">Mail</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="amigo@mail.com"
              autoComplete="off"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/60"
            />
          </label>
          <label className="block">
            <span className="lumus-label text-[0.56rem] text-[var(--text-muted)]">Motivo</span>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-lumus)]/60"
            />
          </label>
        </div>

        <div>
          <span className="lumus-label text-[0.56rem] text-[var(--text-muted)]">Acceso gratis por</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ACCESS_DURATIONS.map(option => {
              const active = option.days === accessDays
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setAccessDays(option.days)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'border-[var(--accent-lumus)] bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                      : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:border-white/20'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-[0.65rem] text-[var(--text-muted)]">Cuenta desde el día que se registra, no desde hoy.</p>
        </div>

        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

        <button
          type="submit"
          disabled={pending === 'invite'}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          <Mail size={14} />
          {pending === 'invite' ? 'Guardando...' : 'Invitar'}
        </button>
      </form>

      {invites.length > 0 && (
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <p className="lumus-label text-[0.56rem] text-[var(--text-muted)]">Esperando que se registren</p>
          <ul className="mt-3 space-y-2">
            {invites.map(item => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--text-primary)]">{item.email}</p>
                  <p className="text-[0.65rem] text-[var(--text-muted)]">
                    {item.reason} · {durationLabel(item.accessDays)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCancel(item)}
                  disabled={pending === `invite:${item.id}`}
                  title="Cancelar invitación"
                  className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
