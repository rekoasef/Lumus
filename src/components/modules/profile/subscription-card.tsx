'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirm } from '@/components/shared/confirm-dialog'
import { useSubscriptionCancel } from '@/hooks/use-profile'
import { SUBSCRIPTION_PRICE_ARS, SUBSCRIPTION_CURRENCY } from '@/lib/billing/plan'
import type { BillingSubscription } from '@/types'

interface SubscriptionCardProps {
  subscription: BillingSubscription | null
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const router = useRouter()
  const { cancelling, error, cancelSubscription } = useSubscriptionCancel()
  const [cancelled, setCancelled] = useState(false)

  const isInternal = !subscription?.mp_preapproval_id

  async function handleCancel() {
    const confirmed = await confirm({
      title: 'Cancelar suscripción',
      description: 'Vas a perder el acceso a Lumus. Podés volver a suscribirte cuando quieras.',
      confirmLabel: 'Cancelar suscripción',
      variant: 'danger',
    })
    if (!confirmed) return

    const status = await cancelSubscription()
    if (status === 'cancelled') {
      setCancelled(true)
      setTimeout(() => {
        router.push('/suscripcion')
        router.refresh()
      }, 2500)
    }
  }

  return (
    <section className="lumus-glass rounded-3xl p-8">
      <p className="lumus-label text-[#ffb86e]">Suscripción</p>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-[var(--text-primary)]">
            ${SUBSCRIPTION_PRICE_ARS.toLocaleString('es-AR')} {SUBSCRIPTION_CURRENCY}
            <span className="text-sm font-normal text-[var(--text-muted)]">/mes</span>
          </p>
          {subscription?.next_payment_date && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Próximo cobro:{' '}
              {new Date(`${subscription.next_payment_date}T12:00:00`).toLocaleDateString('es-AR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>

        <span className="rounded-full border border-[var(--success)]/25 bg-[var(--success-muted)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
          Activa
        </span>
      </div>

      {cancelled ? (
        <div className="mt-6 rounded-lg border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] px-3 py-2.5 text-sm text-[var(--accent-lumus)]">
          Tu suscripción fue cancelada. Te vamos a redirigir en un momento.
        </div>
      ) : isInternal ? (
        <p className="mt-6 text-sm text-[var(--text-muted)]">
          Cuenta interna, sin suscripción real de Mercado Pago asociada.
        </p>
      ) : (
        <>
          {error && (
            <div className="mt-6 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3 py-2.5 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="mt-6 rounded-lg border border-[var(--danger)]/25 px-4 py-2.5 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-muted)] disabled:opacity-50"
          >
            {cancelling ? 'Cancelando...' : 'Cancelar suscripción'}
          </button>
        </>
      )}
    </section>
  )
}
