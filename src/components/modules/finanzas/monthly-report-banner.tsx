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
    <div className="relative mb-6 flex flex-col gap-3 rounded-xl border border-[var(--accent-lumus)]/20 bg-[var(--accent-muted)] py-3 pr-12 pl-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pr-3">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-lumus)]/20">
          <Sparkles size={15} className="text-[var(--accent-lumus)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Tu informe de {monthLabel} está listo para generar
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Lumus analiza tus finanzas del mes y genera recomendaciones personalizadas
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 pl-11 sm:pl-0">
        <button
          onClick={onOpen}
          className="rounded-lg bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] sm:px-3 sm:py-1.5 sm:text-xs"
        >
          Generar informe
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-1.5 right-1.5 flex size-10 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-secondary)] sm:static sm:size-8"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
