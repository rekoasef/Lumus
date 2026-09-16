import Link from 'next/link'
import { accessEndingPhrase, type AccessBannerState } from '@/lib/billing/access-ending'
import { CHECKOUT_ENABLED } from '@/lib/billing/plan'
import { SUPPORT_EMAIL } from '@/lib/contact'
import { cn } from '@/lib/utils'

const LABELS = {
  calm: 'Acceso gratis',
  subscribe: 'Suscribirme',
  write: 'Escribinos',
}

interface AccessEndingBannerProps {
  state: AccessBannerState
}

/**
 * El aviso de que el acceso gratis tiene fecha.
 *
 * Dos tonos a propósito: con más de una semana es una línea que se lee y se
 * olvida, y en la última semana se nota y ofrece el paso siguiente. Un cartel
 * que grita desde el día uno es un cartel que se aprende a ignorar.
 */
export function AccessEndingBanner({ state }: AccessEndingBannerProps) {
  const { daysLeft, endsOn, urgent } = state

  if (!urgent) {
    return (
      <div className="px-3 pt-3 sm:px-5 lg:px-12">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
          <span className="size-1.5 rounded-full bg-[var(--accent-lumus)]" aria-hidden />
          <span className="font-medium text-[var(--text-secondary)]">{LABELS.calm}</span>
          <span>· te quedan {daysLeft} días, hasta el {endsOn}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="px-3 pt-3 sm:px-5 lg:px-12">
      <div
        role="status"
        className={cn(
          'flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
          'border-[var(--accent-lumus)]/25 bg-[var(--accent-muted)]',
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Tu acceso gratis {accessEndingPhrase(daysLeft)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Vence el {endsOn}. Todo lo que cargaste queda guardado.
          </p>
        </div>

        {CHECKOUT_ENABLED ? (
          <Link
            href="/suscripcion"
            className="shrink-0 self-start rounded-full bg-[var(--accent-lumus)] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#190f5d] transition-colors hover:bg-[var(--accent-hover)] sm:self-auto"
          >
            {LABELS.subscribe}
          </Link>
        ) : (
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="shrink-0 self-start rounded-full border border-[var(--accent-lumus)]/30 px-4 py-2 text-xs font-semibold text-[var(--accent-lumus)] transition-colors hover:bg-[var(--accent-lumus)]/10 sm:self-auto"
          >
            {LABELS.write}
          </a>
        )}
      </div>
    </div>
  )
}
