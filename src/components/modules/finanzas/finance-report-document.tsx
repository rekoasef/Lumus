'use client'

import Image from 'next/image'
import type { FinanceReport } from '@/types/finance.types'
import {
  isMetricsSection,
  isSummarySection,
  parseFinanceReportContent,
  type ParsedReportSection,
} from '@/lib/finance/report-parser'

interface FinanceReportDocumentProps {
  report: FinanceReport
  compact?: boolean
}

function getRowTone(label: string) {
  const normalized = label.toLowerCase()
  if (normalized.includes('gasto')) return 'text-[var(--danger)]'
  if (normalized.includes('ingreso') || normalized.includes('balance') || normalized.includes('ahorro')) {
    return 'text-[var(--success)]'
  }
  return 'text-[var(--text-primary)]'
}

function SectionBlock({ section }: { section: ParsedReportSection }) {
  return (
    <section className="border-t border-white/[0.07] pt-4 first:border-t-0 first:pt-0">
      <h3 className="lumus-heading text-sm font-semibold text-[var(--accent-lumus)]">
        {section.title}
      </h3>

      {section.paragraphs.length > 0 && (
        <div className="mt-2 space-y-2">
          {section.paragraphs.map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {section.rows.length > 0 && (
        <div className="mt-3 divide-y divide-white/[0.06] rounded-lg border border-white/[0.07] bg-white/[0.025]">
          {section.rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="flex items-start justify-between gap-4 px-3 py-2.5">
              <span className="text-xs text-[var(--text-muted)]">{row.label}</span>
              <span className={`max-w-[58%] text-right text-xs font-semibold leading-relaxed ${getRowTone(row.label)}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {section.items.length > 0 && (
        <div className="mt-3 space-y-2">
          {section.items.map((item, index) => (
            <div key={index} className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function FinanceReportDocument({ report, compact = false }: FinanceReportDocumentProps) {
  const parsed = parseFinanceReportContent(report)
  const summary = parsed.sections.find(isSummarySection)
  const metrics = parsed.sections.find(isMetricsSection)
  const detailSections = parsed.sections.filter(section => !isSummarySection(section) && !isMetricsSection(section))

  return (
    <article className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111018]">
      <header className="border-b border-white/[0.08] bg-[linear-gradient(135deg,rgba(189,180,255,0.16),rgba(255,255,255,0.025))] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#bdb4ff]/25 bg-white/[0.04]">
              <Image
                src="/logoLumus.png"
                alt="Lumus"
                width={96}
                height={96}
                className="h-full w-full scale-[2.55] object-cover object-center opacity-80 mix-blend-screen"
              />
            </div>
            <div className="min-w-0">
              <p className="lumus-label text-[0.58rem] text-[var(--accent-lumus)]">LUMUS</p>
              <h2 className="lumus-heading mt-1 text-lg font-semibold text-[var(--text-primary)]">
                Informe financiero
              </h2>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm capitalize text-[var(--text-primary)]">{parsed.monthLabel}</p>
            <p className="mt-1 text-[0.65rem] text-[var(--text-muted)]">Generado el {parsed.createdLabel}</p>
          </div>
        </div>
      </header>

      <div className={compact ? 'space-y-4 p-4' : 'space-y-5 p-4 sm:p-5'}>
        {summary && summary.paragraphs.length > 0 && (
          <section>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {summary.paragraphs.join(' ')}
            </p>
          </section>
        )}

        {metrics && metrics.rows.length > 0 && (
          <section className="grid gap-2 sm:grid-cols-2">
            {metrics.rows.slice(0, 4).map((row, index) => (
              <div key={`${row.label}-${index}`} className="rounded-lg border border-white/[0.07] bg-white/[0.035] p-3">
                <p className="lumus-label text-[0.55rem] text-[var(--text-muted)]">{row.label}</p>
                <p className={`lumus-heading mt-1 text-base font-bold ${getRowTone(row.label)}`}>
                  {row.value}
                </p>
              </div>
            ))}
          </section>
        )}

        {detailSections.map((section, index) => (
          <SectionBlock key={`${section.title}-${index}`} section={section} />
        ))}
      </div>
    </article>
  )
}
