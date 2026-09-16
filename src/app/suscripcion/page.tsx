import Link from 'next/link'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { SubscribeButton } from '@/components/modules/billing/subscribe-button'
import { CHECKOUT_ENABLED, SUBSCRIPTION_CURRENCY, SUBSCRIPTION_PRICE_ARS } from '@/lib/billing/plan'
import { firstChargeDate, paidAccessEndsAt, resolveAccessKind } from '@/lib/billing/access'
import { accessDaysLeft, accessEndingPhrase, formatAccessDate } from '@/lib/billing/access-ending'
import { SUPPORT_EMAIL } from '@/lib/contact'
import { formatCurrency } from '@/lib/utils/format-currency'

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Tu pago está pendiente de confirmación. Si ya pagaste, puede tardar unos minutos en reflejarse.',
  paused: 'Tu suscripción está pausada. Reactivala para volver a usar Lumus.',
  cancelled: 'Tu suscripción fue cancelada. Suscribite de nuevo para volver a entrar.',
}

const COPY = {
  eyebrowNew: 'Activá tu cuenta',
  eyebrowAccount: 'Tu cuenta',
  titleNew: 'Suscribite a Lumus',
  titleEnded: 'Tu acceso gratis terminó',
  titlePaid: 'Tu suscripción no está activa',
  keptData: 'Todo lo que cargaste sigue guardado.',
  chargeToday: 'El primer cobro es hoy, y después cada mes.',
  chargeLater: (date: string) => `No perdés lo que te queda: el primer cobro es el ${date}, y después cada mes.`,
  back: 'Volver a Lumus',
}

export default async function SuscripcionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Se lee el grant aunque esté vencido: es lo que distingue "tu prueba
  // terminó" de alguien que nunca tuvo acceso.
  const [{ data: subscription }, { data: grant }] = await Promise.all([
    supabase.from('billing_subscriptions').select('status, paid_until').eq('user_id', user.id).maybeSingle(),
    supabase.from('free_access_grants').select('expires_at').eq('user_id', user.id).maybeSingle(),
  ])

  const access = resolveAccessKind({
    subscriptionStatus: subscription?.status ?? null,
    paidUntil: subscription?.paid_until ?? null,
    hasGrant: grant !== null,
    grantExpiresAt: grant?.expires_at ?? null,
  })

  // Con una suscripción, o una cortesía sin fecha, no hay nada que pagar: sin
  // esto alguien con acceso gratis podría pagar una suscripción que no necesita.
  if (access === 'subscription') redirect('/dashboard')
  if (access === 'free_grant' && !grant?.expires_at) redirect('/dashboard')

  const activeGrantEnds = access === 'free_grant' ? grant?.expires_at ?? null : null
  const paidEnds = access === 'paid_period' && subscription?.paid_until
    ? paidAccessEndsAt(subscription.paid_until)
    : null
  const endedGrant = access === 'none' && grant?.expires_at ? grant.expires_at : null
  const hasAccessNow = activeGrantEnds !== null || paidEnds !== null

  // La misma cuenta que usa `create-subscription` para decirle a Mercado Pago
  // cuándo empezar a cobrar.
  const firstCharge = firstChargeDate({
    grantExpiresAt: grant?.expires_at ?? null,
    paidUntil: subscription?.paid_until ?? null,
  })

  const isPending = subscription?.status === 'pending'
  // Con días por delante, "suscribite para volver a entrar" no es cierto: ya entra.
  const statusMessage = subscription?.status && !isPending && !hasAccessNow
    ? STATUS_MESSAGES[subscription.status]
    : null
  const price = formatCurrency(SUBSCRIPTION_PRICE_ARS, SUBSCRIPTION_CURRENCY, 'rounded')

  const title = paidEnds
    ? COPY.titlePaid
    : activeGrantEnds
      ? `Tu acceso gratis ${accessEndingPhrase(accessDaysLeft(activeGrantEnds))}`
      : endedGrant
        ? COPY.titleEnded
        : COPY.titleNew

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-base)] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 lumus-panel-grid opacity-50" />
      <div className="pointer-events-none absolute -top-60 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-[#bdb4ff]/[0.07] blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="lumus-glass rounded-3xl p-8">
          <div className="mb-8 text-center">
            <div className="mb-5 inline-flex items-center gap-3">
              <div className="relative grid size-11 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
                <Image
                  src="/logoLumus.png"
                  alt="Lumus"
                  width={96}
                  height={96}
                  className="h-full w-full scale-[2.7] object-cover opacity-80 mix-blend-screen"
                  priority
                />
              </div>
              <span className="lumus-heading text-2xl font-semibold text-[#d8d1ff]">LUMUS</span>
            </div>
            <p className="lumus-label text-[#cfc6ff]">
              {hasAccessNow || endedGrant ? COPY.eyebrowAccount : COPY.eyebrowNew}
            </p>
            <h1 className="lumus-heading mt-4 text-3xl font-bold text-[var(--text-primary)]">
              {title}
            </h1>

            {activeGrantEnds && (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Vence el {formatAccessDate(activeGrantEnds)}. {COPY.keptData}
              </p>
            )}
            {paidEnds && (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Tenés acceso hasta el {formatAccessDate(paidEnds)}. {COPY.keptData}
              </p>
            )}
            {endedGrant && (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Terminó el {formatAccessDate(endedGrant)}. {COPY.keptData}
              </p>
            )}
            {CHECKOUT_ENABLED && (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Acceso completo por{' '}
                <span className="text-[var(--text-primary)]">{price} por mes</span>.
              </p>
            )}
          </div>

          {statusMessage && (
            <div className="mb-6 rounded-lg border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] px-3 py-2.5 text-sm text-[var(--accent-lumus)]">
              {statusMessage}
            </div>
          )}

          {CHECKOUT_ENABLED && !isPending && (
            <p className="mb-4 text-center text-xs leading-relaxed text-[var(--text-muted)]">
              {firstCharge ? COPY.chargeLater(formatAccessDate(firstCharge)) : COPY.chargeToday}
            </p>
          )}

          {!CHECKOUT_ENABLED && (
            <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Las suscripciones todavía no están abiertas. Escribinos a{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium text-[var(--accent-lumus)] hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              {endedGrant ? ' y te extendemos el acceso.' : ' si tenés cualquier duda.'}
            </div>
          )}

          <SubscribeButton pendingCheck={isPending} showSubscribe={CHECKOUT_ENABLED} />

          {hasAccessNow && (
            <Link
              href="/dashboard"
              className="mt-2 block text-center text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
            >
              {COPY.back}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
