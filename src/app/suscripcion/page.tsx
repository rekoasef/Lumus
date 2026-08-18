import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { SubscribeButton } from '@/components/modules/billing/subscribe-button'
import { SUBSCRIPTION_PRICE_ARS } from '@/lib/billing/plan'

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Tu pago está pendiente de confirmación. Si ya pagaste, puede tardar unos minutos en reflejarse.',
  paused: 'Tu suscripción está pausada. Reactivala para volver a usar Lumus.',
  cancelled: 'Tu suscripción fue cancelada. Suscribite de nuevo para volver a entrar.',
}

export default async function SuscripcionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (subscription?.status === 'authorized') redirect('/dashboard')

  const isPending = subscription?.status === 'pending'
  const statusMessage = subscription?.status && !isPending ? STATUS_MESSAGES[subscription.status] : null

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
            <p className="lumus-label text-[#cfc6ff]">Activá tu cuenta</p>
            <h1 className="lumus-heading mt-4 text-3xl font-bold text-[var(--text-primary)]">
              Suscribite a Lumus
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Acceso completo por{' '}
              <span className="text-[var(--text-primary)]">${SUBSCRIPTION_PRICE_ARS} ARS/mes</span>.
            </p>
          </div>

          {statusMessage && (
            <div className="mb-6 rounded-lg border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] px-3 py-2.5 text-sm text-[var(--accent-lumus)]">
              {statusMessage}
            </div>
          )}

          <SubscribeButton pendingCheck={isPending} />
        </div>
      </div>
    </div>
  )
}
