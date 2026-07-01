'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FinanceReport } from '@/types/finance.types'

function getPrevMonth(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })
}

export function useFinanceReport() {
  // undefined = cargando, null = no existe, FinanceReport = existe
  const [report, setReport] = useState<FinanceReport | null | undefined>(undefined)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prevMonth = useMemo(() => getPrevMonth(), [])
  const prevMonthLabel = useMemo(() => getMonthLabel(prevMonth), [prevMonth])

  useEffect(() => {
    fetch(`/api/finance/ai-report?month=${prevMonth}`)
      .then(r => r.json() as Promise<{ report: FinanceReport | null }>)
      .then(({ report: r }) => setReport(r ?? null))
      .catch(() => setReport(null))
  }, [prevMonth])

  const generate = useCallback(async (options?: { regenerate?: boolean }) => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: prevMonth, regenerate: options?.regenerate ?? false }),
      })
      if (!res.ok) throw new Error('Error al generar el informe')
      const { report: r } = await res.json() as { report: FinanceReport }
      setReport(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setGenerating(false)
    }
  }, [prevMonth])

  return { report, generating, error, prevMonth, prevMonthLabel, generate }
}
