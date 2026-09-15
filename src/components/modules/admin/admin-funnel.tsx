import type { FunnelStep } from '@/types/admin.types'

export function AdminFunnel({ steps }: { steps: FunnelStep[] }) {
  const total = steps[0]?.count ?? 0

  return (
    <section className="lumus-glass rounded-3xl p-5 sm:p-7">
      <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Activación</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Dónde se traba la gente</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Cada paso cuenta solo a quien pasó los anteriores.
      </p>

      <ol className="mt-6 space-y-3.5">
        {steps.map((step, index) => {
          const pct = total > 0 ? Math.round((step.count / total) * 100) : 0
          const lost = index > 0 ? steps[index - 1].count - step.count : 0
          return (
            <li key={step.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="text-[var(--text-secondary)]">{step.label}</span>
                <span className="flex items-baseline gap-2">
                  {lost > 0 && (
                    <span className="text-[0.65rem] font-medium text-[var(--danger)]">−{lost}</span>
                  )}
                  <span className="font-semibold tabular-nums text-[var(--text-primary)]">{step.count}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.055]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, var(--accent-lumus), var(--accent-hover))',
                  }}
                />
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
