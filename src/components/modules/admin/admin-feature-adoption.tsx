import type { FeatureAdoption } from '@/types/admin.types'

export function AdminFeatureAdoption({ base, features }: { base: number; features: FeatureAdoption[] }) {
  return (
    <section className="lumus-glass rounded-3xl p-5 sm:p-7">
      <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Uso por feature</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Qué se usa y qué no toca nadie</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Sobre {base} {base === 1 ? 'persona que ya cargó' : 'personas que ya cargaron'} algún movimiento.
      </p>

      {base === 0 ? (
        <p className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center text-sm text-[var(--text-secondary)]">
          Todavía nadie cargó un movimiento.
        </p>
      ) : (
        <ul className="mt-6 space-y-3.5">
          {features.map(feature => {
            const pct = Math.round((feature.users / base) * 100)
            const unused = feature.users === 0
            return (
              <li key={feature.key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className={unused ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}>
                    {feature.label}
                  </span>
                  <span className="text-xs tabular-nums">
                    {unused ? (
                      <span className="font-medium text-[var(--warning)]">nadie</span>
                    ) : (
                      <span className="font-semibold text-[var(--text-primary)]">
                        {feature.users}<span className="font-normal text-[var(--text-muted)]">/{base}</span>
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.055]">
                  <div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
