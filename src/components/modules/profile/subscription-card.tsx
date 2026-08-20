'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirm } from '@/components/shared/confirm-dialog'
import { useSubscriptionCancel } from '@/hooks/use-profile'
import { SUBSCRIPTION_PRICE_ARS, SUBSCRIPTION_CURRENCY } from '@/lib/billing/plan'
import { SectionHeading } from './section-heading'
import type { BillingSubscription } from '@/types'
import type { AccessStatus } from '@/lib/billing/access'

const COURTESY_LABEL = 'Cortesía'
const COURTESY_TITLE = 'Acceso de cortesía'
const COURTESY_DESCRIPTION = 'Tenés Lumus completo, sin costo y sin suscripción asociada.'

interface SubscriptionCardProps {
  subscription: BillingSubscription | null
  access: AccessStatus
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function SubscriptionCard({ subscription, access }: SubscriptionCardProps) {
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

  if (access.kind === 'free_grant') {
    return (
      <section>
        <SectionHeading
          index="02"
          label="Suscripción"
          action={
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent-lumus)]">
              <span className="size-1.5 rounded-full bg-[var(--accent-lumus)]" />
              {COURTESY_LABEL}
            </span>
          }
        />

        <div className="mt-6">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{COURTESY_TITLE}</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {COURTESY_DESCRIPTION}
          </p>
          {access.grantExpiresAt && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Vigente hasta el {formatDate(access.grantExpiresAt)}
            </p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section>
      <SectionHeading
        index="02"
        label="Suscripción"
        action={
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--success)]">
            <span className="size-1.5 rounded-full bg-[var(--success)]" />
            Activa
          </span>
        }
      />

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-2xl font-semibold text-[var(--text-primary)]">
          ${SUBSCRIPTION_PRICE_ARS.toLocaleString('es-AR')}
          <span className="text-sm font-normal text-[var(--text-muted)]"> {SUBSCRIPTION_CURRENCY}/mes</span>
        </p>
        {subscription?.next_payment_date && (
          <p className="text-xs text-[var(--text-secondary)]">
            Próximo cobro el{' '}
            {new Date(`${subscription.next_payment_date}T12:00:00`).toLocaleDateString('es-AR', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        )}
      </div>

      <div className="mt-5">
        {cancelled ? (
          <p className="text-xs leading-relaxed text-[var(--accent-lumus)]">
            Tu suscripción fue cancelada. Te vamos a redirigir en un momento.
          </p>
        ) : isInternal ? (
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Cuenta interna, sin suscripción real de Mercado Pago asociada.
          </p>
        ) : (
          <>
            {error && <p className="mb-2 text-xs text-[var(--danger)]">{error}</p>}
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-xs font-medium text-[var(--danger)] transition-opacity hover:opacity-75 disabled:opacity-50"
            >
              {cancelling ? 'Cancelando...' : 'Cancelar suscripción'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}
