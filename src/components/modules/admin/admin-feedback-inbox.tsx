import { timeAgo } from '@/lib/utils/format-date'
import type { AdminFeedbackItem } from '@/types/admin.types'
import { FEEDBACK_KIND_LABELS } from './admin-labels'

const KIND_COLORS: Record<string, string> = {
  bug: 'var(--danger)',
  mejora: 'var(--accent-lumus)',
  otro: 'var(--text-muted)',
}

export function AdminFeedbackInbox({ items, now }: { items: AdminFeedbackItem[]; now: Date }) {
  return (
    <section className="lumus-glass rounded-3xl p-5 sm:p-7">
      <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Feedback</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Lo que te escribieron</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Por ahora se marca como resuelto desde el SQL editor — ver <code className="text-[var(--text-secondary)]">docs/ADMIN.md</code>.
      </p>

      {items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center text-sm text-[var(--text-secondary)]">
          Nadie mandó feedback todavía. Si no se pide, no escribe nadie.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map(item => {
            const resolved = item.status === 'resuelto'
            const color = KIND_COLORS[item.kind] ?? 'var(--text-muted)'
            return (
              <li
                key={item.id}
                className={`rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 ${resolved ? 'opacity-50' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem]">
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color }}>
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                    {FEEDBACK_KIND_LABELS[item.kind] ?? item.kind}
                  </span>
                  <span className="text-[var(--text-secondary)]">{item.email ?? '(cuenta borrada)'}</span>
                  <span className="text-[var(--text-muted)]">{timeAgo(item.createdAt, now)}</span>
                  <span className="ml-auto rounded-md border border-white/10 px-1.5 py-0.5 text-[0.6rem] text-[var(--text-muted)]">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--text-primary)]">
                  {item.message}
                </p>
                {item.path && (
                  <p className="mt-2 font-mono text-[0.62rem] text-[var(--text-muted)]">{item.path}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
