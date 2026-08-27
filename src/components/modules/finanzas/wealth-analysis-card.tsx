'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import { regenerationState } from '@/lib/finance/report-limits'
import { timeAgo } from '@/lib/utils/format-date'

const LABELS = {
  title: 'Análisis de patrimonio',
  subtitle: 'Qué le pasó a tu plata, no al mercado.',
  generate: 'Analizar mi patrimonio',
  generating: 'Analizando...',
  regenerate: 'Rehacer',
  regenerateDone: 'Ya lo rehiciste',
  spent: 'Se puede rehacer una sola vez por mes.',
  empty: 'Todavía no generaste el análisis de este mes.',
  emptyHint: 'Usa tu patrimonio, tus gastos y la cotización de los últimos doce meses.',
  disclaimer: 'Describe tu situación con tus datos. No es asesoramiento financiero ni recomienda inversiones.',
  updated: (iso: string) => `Generado ${timeAgo(iso)}`,
} as const

export interface WealthAnalysis {
  id: string
  month: string
  content: string
  regenerations: number
  created_at: string
}

/**
 * El análisis de patrimonio.
 *
 * Es la única pantalla de IA que habla de inversiones, así que lleva el
 * descargo a la vista: describe lo que tenés, no recomienda qué comprar. La
 * prohibición vive en el prompt (`lib/finance/wealth-prompt.ts`) y está
 * verificada contra intentos de sacarle una recomendación.
 */
export function WealthAnalysisCard({ initial }: { initial: WealthAnalysis | null }) {
  const [analysis, setAnalysis] = useState<WealthAnalysis | null>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { canRegenerate } = regenerationState(analysis?.regenerations ?? 0)

  async function run(regenerate: boolean) {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/finance/wealth-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regenerate }),
    }).catch(() => null)

    const data = await res?.json().catch(() => null)

    if (!res?.ok) {
      setError(data?.error ?? 'No se pudo generar el análisis.')
      setLoading(false)
      return
    }

    setAnalysis(data.analysis as WealthAnalysis)
    setLoading(false)
  }

  return (
    <section className="lumus-glass rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-[var(--accent-lumus)]" />
          <div>
            <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">{LABELS.title}</h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{LABELS.subtitle}</p>
          </div>
        </div>

        {analysis && (
          <button
            onClick={() => run(true)}
            disabled={loading || !canRegenerate}
            title={canRegenerate ? undefined : LABELS.spent}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-secondary)] disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {canRegenerate ? LABELS.regenerate : LABELS.regenerateDone}
          </button>
        )}
      </div>

      {analysis ? (
        <>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
            {analysis.content}
          </p>
          <p className="mt-4 text-[0.65rem] text-[var(--text-muted)]">{LABELS.updated(analysis.created_at)}</p>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">{LABELS.empty}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{LABELS.emptyHint}</p>
          <button
            onClick={() => run(false)}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-lumus)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? LABELS.generating : LABELS.generate}
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-xs text-[var(--danger)]">{error}</p>}

      <p className="mt-5 border-t border-white/[0.06] pt-4 text-[0.65rem] leading-relaxed text-[var(--text-muted)]">
        {LABELS.disclaimer}
      </p>
    </section>
  )
}
