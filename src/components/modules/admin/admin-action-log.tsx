import { describeAdminAction } from '@/lib/admin/action-log'
import { timeAgo } from '@/lib/utils/format-date'
import type { AdminActionItem } from '@/types/admin.types'

export function AdminActionLog({ actions, now }: { actions: AdminActionItem[]; now: Date }) {
  return (
    <section className="lumus-glass rounded-3xl p-5 sm:p-7">
      <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Historial</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Lo que se hizo desde el panel</h2>

      {actions.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center text-sm text-[var(--text-secondary)]">
          Todavía no se tocó nada. Cada invitación, acceso y feedback que cambies va a quedar anotado acá.
        </p>
      ) : (
        <ol className="mt-5 space-y-3 border-l border-white/[0.08] pl-4">
          {actions.map(item => (
            <li key={item.id} className="relative">
              <span className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-[var(--accent-lumus)]/60" />
              <p className="text-sm leading-snug text-[var(--text-secondary)]">
                {describeAdminAction(item.action, item.targetEmail, item.details)}
              </p>
              <p className="mt-0.5 text-[0.65rem] text-[var(--text-muted)]">{timeAgo(item.createdAt, now)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
