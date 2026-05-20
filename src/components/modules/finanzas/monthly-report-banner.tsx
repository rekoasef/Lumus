'use client'

import { Sparkles, X } from 'lucide-react'
import { useState } from 'react'

interface MonthlyReportBannerProps {
  monthLabel: string
  onOpen: () => void
}

export function MonthlyReportBanner({ monthLabel, onOpen }: MonthlyReportBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-lumus)]/20">
          <Sparkles size={15} className="text-[var(--accent-lumus)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Tu informe de <span className="capitalize">{monthLabel}</span> está listo para generar
          </p>
          <p className="text-[0.65rem] text-[var(--text-muted)]">
            Lumus analiza tus finanzas del mes y genera recomendaciones personalizadas
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          onClick={onOpen}
          className="rounded-lg bg-[var(--accent-lumus)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          Generar informe
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-secondary)]"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
