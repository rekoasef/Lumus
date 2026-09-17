'use client'

import { useState, useEffect, useCallback } from 'react'
import type { FinanceReport } from '@/types/finance.types'
import type { ReportBlock } from '@/lib/finance/report-availability'

function getMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })
}

interface ReportResponse {
  month: string
  report: FinanceReport | null
  available: boolean
  reason: ReportBlock | null
}

/**
 * El informe del último mes cerrado.
 *
 * **Qué mes es lo decide el servidor**, no el reloj del navegador, y también si
 * se puede pedir: una cuenta nueva no tiene nada que analizar del mes pasado
 * (ver `lib/finance/report-availability.ts`).
 */
export function useFinanceReport() {
  // undefined = cargando, null = no existe, FinanceReport = existe
  const [report, setReport] = useState<FinanceReport | null | undefined>(undefined)
  const [month, setMonth] = useState<string | null>(null)
  const [available, setAvailable] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/finance/ai-report')
      .then(r => r.json() as Promise<ReportResponse>)
      .then(data => {
        setReport(data.report ?? null)
        setMonth(data.month ?? null)
        setAvailable(data.available ?? false)
      })
      .catch(() => setReport(null))
  }, [])

  const generate = useCallback(async (options?: { regenerate?: boolean }) => {
    if (!month) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, regenerate: options?.regenerate ?? false }),
      })
      const data = await res.json() as { report: FinanceReport } | { error: string }
      if (!res.ok) throw new Error('error' in data ? data.error : 'Error al generar el informe')
      setReport((data as { report: FinanceReport }).report)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setGenerating(false)
    }
  }, [month])

  return {
    report,
    generating,
    error,
    month,
    monthLabel: month ? getMonthLabel(month) : '',
    /** Si hoy tiene sentido ofrecer el informe de ese mes. */
    available,
    generate,
  }
}
