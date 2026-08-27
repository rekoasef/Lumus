import { readUnsubscribeToken } from '@/lib/notifications/unsubscribe-token'
import { UnsubscribeForm } from '@/components/modules/notifications/unsubscribe-form'

const LABELS = {
  invalidTitle: 'Este link no sirve',
  invalidDescription: 'Puede estar cortado por el cliente de correo. Probá copiarlo entero, o cambiá tus avisos desde el perfil en Lumus.',
  back: 'Ir a Lumus',
} as const

/**
 * Baja de avisos por mail. Fuera de `(dashboard)` a propósito: la abre alguien
 * que puede no tener sesión — ver la lista de rutas abiertas en
 * `lib/supabase/middleware.ts`.
 */
export default async function BajaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  // Se valida acá para no dibujar un botón que va a fallar igual.
  const userId = token ? readUnsubscribeToken(token) : null

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="lumus-glass w-full max-w-md rounded-3xl p-8">
        {userId && token ? (
          <UnsubscribeForm token={token} />
        ) : (
          <div className="text-center">
            <h1 className="lumus-heading text-2xl font-bold text-[var(--text-primary)]">{LABELS.invalidTitle}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{LABELS.invalidDescription}</p>
            <a
              href="/dashboard"
              className="mt-7 inline-block rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              {LABELS.back}
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
