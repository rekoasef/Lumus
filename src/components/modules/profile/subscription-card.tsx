'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { confirm } from '@/components/shared/confirm-dialog'
import { useSubscriptionCancel } from '@/hooks/use-profile'
import { CHECKOUT_ENABLED, SUBSCRIPTION_PRICE_ARS, SUBSCRIPTION_CURRENCY } from '@/lib/billing/plan'
import { accessDaysLeft, accessEndingPhrase } from '@/lib/billing/access-ending'
import { paidAccessEndsAt } from '@/lib/billing/access'
import { formatCurrency } from '@/lib/utils/format-currency'
import { SectionHeading } from './section-heading'
import type { BillingSubscription } from '@/types'
import type { AccessStatus } from '@/lib/billing/access'

const COURTESY_LABEL = 'Cortesía'
const COURTESY_TITLE = 'Acceso de cortesía'
const COURTESY_DESCRIPTION = 'Tenés Lumus completo, sin costo y sin suscripción asociada.'
const FREE_LABEL = 'Gratis'
const FREE_TITLE = 'Acceso gratis'
const FREE_DESCRIPTION = 'Tenés Lumus completo, sin costo. Cuando termine, tus datos quedan guardados.'
const ENDING_LABEL = 'No se renueva'
const ENDING_DESCRIPTION = 'Tu suscripción no está activa, pero seguís entrando hasta que termine lo que pagaste. Tus datos quedan guardados.'
const RESUBSCRIBE = 'Volver a suscribirme'

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
      description: 'No se te va a volver a cobrar. Seguís entrando hasta que termine lo que ya pagaste, y podés volver a suscribirte cuando quieras.',
      confirmLabel: 'Cancelar suscripción',
      variant: 'danger',
    })
    if (!confirmed) return

    const status = await cancelSubscription()
    if (status === 'cancelled') {
      // Sigue entrando hasta que termine lo pagado: no hay que mandarlo a
      // ningún lado, solo volver a leer el acceso para mostrar hasta cuándo.
      setCancelled(true)
      setTimeout(() => router.refresh(), 1500)
    }
  }

  if (access.kind === 'free_grant') {
    // Con fecha es una prueba (o una cortesía que vence): lo importante es
    // cuándo termina. Sin fecha, es una cortesía permanente.
    const expires = access.grantExpiresAt
    return (
      <section>
        <SectionHeading
          index="02"
          label="Suscripción"
          action={
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent-lumus)]">
              <span className="size-1.5 rounded-full bg-[var(--accent-lumus)]" />
              {expires ? FREE_LABEL : COURTESY_LABEL}
            </span>
          }
        />

        <div className="mt-6">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">
            {expires ? FREE_TITLE : COURTESY_TITLE}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {expires ? FREE_DESCRIPTION : COURTESY_DESCRIPTION}
          </p>
          {expires && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Vigente hasta el {formatDate(expires)} · {accessEndingPhrase(accessDaysLeft(expires))}
            </p>
          )}
        </div>
      </section>
    )
  }

  if (access.kind === 'paid_period' && access.paidUntil) {
    const endsAt = paidAccessEndsAt(access.paidUntil)
    return (
      <section>
        <SectionHeading
          index="02"
          label="Suscripción"
          action={
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--warning)]">
              <span className="size-1.5 rounded-full bg-[var(--warning)]" />
              {ENDING_LABEL}
            </span>
          }
        />

        <div className="mt-6">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">Hasta el {formatDate(endsAt)}</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{ENDING_DESCRIPTION}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{accessEndingPhrase(accessDaysLeft(endsAt))}</p>
          {CHECKOUT_ENABLED && (
            <Link
              href="/suscripcion"
              className="mt-4 inline-block text-xs font-medium text-[var(--accent-lumus)] hover:underline"
            >
              {RESUBSCRIBE}
            </Link>
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
          {formatCurrency(SUBSCRIPTION_PRICE_ARS, SUBSCRIPTION_CURRENCY, 'rounded')}
          <span className="text-sm font-normal text-[var(--text-muted)]"> por mes</span>
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
            Listo, cancelaste la suscripción. No se te va a volver a cobrar.
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
