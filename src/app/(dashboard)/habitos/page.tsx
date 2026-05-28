import { BrainCircuit, CalendarCheck, Flame, PlusCircle, Sparkles } from 'lucide-react'

export default function HabitosPage() {
  return (
    <div className="min-h-screen px-3 py-5 sm:px-5 sm:py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[1120px]">
        <header className="mb-6 flex items-center justify-between gap-4 sm:mb-9">
          <div>
            <p className="lumus-label text-[#cfc6ff]">Hábitos</p>
            <h1 className="lumus-heading mt-2 text-3xl font-bold text-[var(--text-primary)] sm:mt-4 sm:text-4xl md:text-5xl">
              Seguimiento y rachas
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] sm:mt-4 sm:text-base sm:leading-7">
              Rutinas, rachas, recuperación y métricas diarias.
            </p>
          </div>
          <div className="hidden grid size-14 place-items-center rounded-2xl border border-[#bdb4ff]/20 bg-[#bdb4ff]/12 text-[#d8d1ff] sm:grid">
            <BrainCircuit size={28} />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {[
            { label: 'Rachas', value: 'Pronto', icon: Flame, color: '#ffb86e' },
            { label: 'Hábitos activos', value: 'Pronto', icon: CalendarCheck, color: '#bdb4ff' },
            { label: 'IA contextual', value: 'Pronto', icon: Sparkles, color: '#d8d1ff' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="lumus-glass rounded-2xl p-7">
              <Icon size={24} style={{ color }} />
              <p className="lumus-label mt-10 text-[var(--text-muted)]">{label}</p>
              <p className="lumus-heading mt-3 text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </section>

        <section className="lumus-glass mt-8 rounded-3xl p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-center">
            <div>
              <p className="lumus-label text-[#ffb86e]">Módulo en preparación</p>
              <h2 className="lumus-heading mt-5 text-3xl font-semibold text-[var(--text-primary)]">
                La estructura visual ya está lista.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
                Cuando avancemos con funcionalidades, este espacio va a mostrar hábitos reales,
                registros diarios, historial y recomendaciones de Lumus según tu contexto.
              </p>
            </div>
            <button className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-7 text-center text-[var(--text-secondary)]">
              <span>
                <PlusCircle className="mx-auto mb-4 text-[#bdb4ff]" size={32} />
                <span className="lumus-label">Agregar hábito</span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
