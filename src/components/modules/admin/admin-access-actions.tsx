'use client'

import { toast } from 'sonner'
import { confirm } from '@/components/shared/confirm-dialog'
import { useAdminActions } from '@/hooks/use-admin-actions'
import { daysUntil, extendedExpiry, EXTENSION_OPTIONS } from '@/lib/admin/grants'
import type { AccessKind } from '@/lib/billing/access'

const DEFAULT_REASON = 'beta tester'

interface AdminAccessActionsProps {
  userId: string
  email: string
  access: AccessKind
  grantReason: string | null
  grantExpiresAt: string | null
  /** El dueño entra por cortesía: revocársela lo deja afuera de su propia app. */
  isSelf: boolean
  /** Viene del server: calcular "ahora" en el render del cliente daría otro número en cada pasada. */
  nowIso: string
}

const pillClass =
  'rounded-md border border-white/10 px-2 py-1 text-[0.65rem] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-lumus)]/50 hover:text-[var(--accent-lumus)] disabled:opacity-50'

export function AdminAccessActions({
  userId, email, access, grantReason, grantExpiresAt, isSelf, nowIso,
}: AdminAccessActionsProps) {
  const { pending, setGrant, revokeGrant } = useAdminActions()
  const busy = pending === `grant:${userId}`
  const now = new Date(nowIso)

  // Quien paga (o todavía tiene días pagos) no necesita nada de acá, y tocarle
  // una cortesía encima confunde.
  if (access === 'subscription' || access === 'paid_period') return null

  async function apply(expiresAt: string | null, success: string) {
    try {
      await setGrant(userId, { reason: grantReason ?? DEFAULT_REASON, expiresAt })
      toast.success(success)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    }
  }

  async function handleRevoke() {
    const ok = await confirm({
      title: 'Revocar cortesía',
      description: `${email} va a caer en el paywall la próxima vez que navegue. Sus datos no se tocan.`,
      confirmLabel: 'Revocar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await revokeGrant(userId)
      toast.success('Cortesía revocada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo revocar')
    }
  }

  if (access === 'none') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[0.65rem] text-[var(--danger)]">Frenado en el paywall</span>
        {EXTENSION_OPTIONS.map(option => (
          <button
            key={option.days}
            type="button"
            disabled={busy}
            onClick={() => void apply(extendedExpiry(nowIso, option.days, now), `Le diste acceso a ${email}`)}
            className={pillClass}
          >
            Dar {option.label.replace('+', '')}
          </button>
        ))}
      </div>
    )
  }

  const remaining = grantExpiresAt ? daysUntil(grantExpiresAt, now) : null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`mr-1 text-[0.65rem] ${remaining !== null && remaining <= 14 ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>
        {remaining === null ? 'Cortesía sin vencimiento' : `Cortesía: vence en ${remaining} ${remaining === 1 ? 'día' : 'días'}`}
      </span>
      {grantExpiresAt && EXTENSION_OPTIONS.map(option => (
        <button
          key={option.days}
          type="button"
          disabled={busy}
          onClick={() => void apply(extendedExpiry(grantExpiresAt, option.days, now), `Cortesía de ${email} extendida`)}
          className={pillClass}
        >
          {option.label}
        </button>
      ))}
      {!isSelf && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRevoke()}
          className="rounded-md px-2 py-1 text-[0.65rem] font-medium text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
        >
          Revocar
        </button>
      )}
    </div>
  )
}
