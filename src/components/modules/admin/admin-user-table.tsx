import { timeAgo } from '@/lib/utils/format-date'
import type { AdminUserRow } from '@/types/admin.types'
import { ACCESS_LABELS, ENGAGEMENT_LABELS } from './admin-labels'
import { AdminAccessActions } from './admin-access-actions'

/** La ventana de `active_days_30d`: el medidor se dibuja sobre esto. */
const WINDOW_DAYS = 30

/** Las features que se listan por usuario, con el conteo que las prende. */
const FEATURES: { label: string; count: (r: AdminUserRow) => number }[] = [
  { label: 'Presupuestos', count: r => r.budgets },
  { label: 'Fijos', count: r => r.recurring },
  { label: 'Metas', count: r => r.goals },
  { label: 'Préstamos', count: r => r.loans },
  { label: 'Inversiones', count: r => r.holdings },
  { label: 'Reportes IA', count: r => r.reports },
  { label: 'Patrimonio IA', count: r => r.wealthAnalyses },
  { label: 'Feedback', count: r => r.feedback },
]

function ActiveDaysMeter({ days }: { days: number }) {
  const pct = Math.min(100, Math.round((days / WINDOW_DAYS) * 100))
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-[var(--accent-lumus)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--text-primary)]">
        {days}<span className="font-normal text-[var(--text-muted)]">/{WINDOW_DAYS}</span>
      </span>
    </div>
  )
}

export function AdminUserTable({ rows, now, adminId }: { rows: AdminUserRow[]; now: Date; adminId: string }) {
  return (
    <section className="lumus-glass rounded-3xl p-5 sm:p-7">
      <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Usuarios</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Quién la usa, y cuánto</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Ordenados por días con movimientos cargados en los últimos 30 días.
      </p>

      <ol className="mt-6 divide-y divide-white/[0.06]">
        {rows.map((row, index) => {
          const engagement = ENGAGEMENT_LABELS[row.engagement]
          const usedFeatures = FEATURES.filter(f => f.count(row) > 0)
          return (
            <li
              key={row.userId}
              className="grid gap-x-6 gap-y-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)] md:items-center"
            >
              {/* Quién */}
              <div className="flex min-w-0 items-start gap-3">
                <span className="lumus-heading w-5 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-[var(--accent-lumus)]/50">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {row.name || row.email}
                  </p>
                  {row.name && (
                    <p className="truncate text-[0.7rem] text-[var(--text-muted)]">{row.email}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem]">
                    <span className="flex items-center gap-1.5 font-medium" style={{ color: engagement.color }}>
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: engagement.color }} />
                      {engagement.label}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {row.lastSeenAt ? timeAgo(row.lastSeenAt, now) : 'nunca entró'}
                    </span>
                    <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[0.6rem] text-[var(--text-secondary)]">
                      {ACCESS_LABELS[row.access]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hábito */}
              <div className="pl-8 md:pl-0">
                <ActiveDaysMeter days={row.activeDays30d} />
                <p className="mt-1.5 text-[0.68rem] text-[var(--text-muted)]">
                  <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{row.transactions30d}</span>
                  {' '}movimientos este mes · {row.transactions} en total · {row.wallets} billeteras
                </p>
              </div>

              {/* Qué usa */}
              <div className="flex flex-wrap gap-1.5 pl-8 md:pl-0">
                {usedFeatures.length === 0 ? (
                  <span className="text-[0.68rem] text-[var(--text-muted)]">Solo movimientos</span>
                ) : (
                  usedFeatures.map(f => (
                    <span
                      key={f.label}
                      className="rounded-md bg-white/[0.05] px-2 py-1 text-[0.65rem] text-[var(--text-secondary)]"
                    >
                      {f.label} <span className="tabular-nums text-[var(--text-muted)]">{f.count(row)}</span>
                    </span>
                  ))
                )}
              </div>

              {/* Acceso */}
              <div className="pl-8 md:col-span-3">
                <AdminAccessActions
                  userId={row.userId}
                  email={row.email}
                  access={row.access}
                  grantReason={row.grantReason}
                  grantExpiresAt={row.grantExpiresAt}
                  isSelf={row.userId === adminId}
                  nowIso={now.toISOString()}
                />
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
