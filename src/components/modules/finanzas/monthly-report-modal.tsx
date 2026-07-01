'use client'

import { X, Sparkles, Loader2, RefreshCw, Download } from 'lucide-react'
import type { FinanceReport } from '@/types/finance.types'
import { FinanceReportDocument } from './finance-report-document'
import { downloadFinanceReportPdf } from '@/lib/finance/report-pdf'

interface MonthlyReportModalProps {
  report: FinanceReport | null
  generating: boolean
  error: string | null
  monthLabel: string
  onGenerate: (options?: { regenerate?: boolean }) => void
  onClose: () => void
}

export function MonthlyReportModal({
  report,
  generating,
  error,
  monthLabel,
  onGenerate,
  onClose,
}: MonthlyReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="lumus-glass flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl">

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.07] p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <Sparkles size={15} className="text-[var(--accent-lumus)]" />
            </div>
            <div>
              <h2 className="lumus-heading text-base font-semibold text-[var(--text-primary)]">
                Informe financiero
              </h2>
              <p className="lumus-label text-[0.6rem] capitalize text-[var(--text-muted)]">{monthLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Estado: generando */}
          {generating && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 size={28} className="animate-spin text-[var(--accent-lumus)]" />
              <p className="text-sm text-[var(--text-muted)]">Analizando tus finanzas...</p>
              <p className="text-[0.65rem] text-[var(--text-muted)]">Esto puede tardar unos segundos</p>
            </div>
          )}

          {/* Estado: error */}
          {!generating && error && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <p className="text-sm text-[var(--danger)]">{error}</p>
              <button
                onClick={() => onGenerate()}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5"
              >
                <RefreshCw size={12} />
                Reintentar
              </button>
            </div>
          )}

          {/* Estado: sin informe, prompt para generar */}
          {!generating && !error && !report && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
                <Sparkles size={24} className="text-[var(--accent-lumus)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Generá tu informe de <span className="capitalize">{monthLabel}</span>
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Lumus analiza tus transacciones, presupuestos y metas para darte un resumen y recomendaciones personalizadas.
                </p>
              </div>
              <button
                onClick={() => onGenerate()}
                className="rounded-lg bg-[var(--accent-lumus)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                Generar informe mensual
              </button>
            </div>
          )}

          {/* Estado: informe generado */}
          {!generating && !error && report && (
            <div>
              <FinanceReportDocument report={report} compact />
              <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] pt-4">
                <p className="text-[0.6rem] text-[var(--text-muted)]">
                  Generado el {new Date(report.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadFinanceReportPdf(report)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[0.65rem] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)]"
                  >
                    <Download size={10} />
                    PDF
                  </button>
                  <button
                    onClick={() => onGenerate({ regenerate: true })}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[0.65rem] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)]"
                  >
                    <RefreshCw size={10} />
                    Regenerar
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
