'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DateRange, FinanceSummaryRow } from '@/types/finance.types'

interface UseFinanceSummaryOptions {
  /** Agregado ya calculado en el server para el rango inicial. Evita el fetch del primer render. */
  initialSummary?: FinanceSummaryRow[]
}

interface SummaryState {
  key: string
  token: number
  summary: FinanceSummaryRow[]
}

function rangeKey(range: DateRange): string {
  return `${range.from ?? ''}|${range.to ?? ''}`
}

/**
 * Totales agregados del rango pedido.
 *
 * Vuelve a pedirlos cuando cambia el rango: los totales de un período siempre
 * salen de la base para ese período, nunca de filtrar en memoria un array
 * traído con otro criterio.
 *
 * `loading` es derivado —"lo que tengo es de otro rango"— en vez de un estado
 * propio, así que nunca se muestran los totales del período anterior como si
 * fueran los del nuevo. Un `refresh()` (después de cargar o borrar un
 * movimiento) no borra lo que hay: actualiza en el lugar.
 */
export function useFinanceSummary(range: DateRange, options: UseFinanceSummaryOptions = {}) {
  const { initialSummary } = options
  const key = rangeKey(range)
  const { from, to } = range

  const [state, setState] = useState<SummaryState | null>(() =>
    initialSummary ? { key: rangeKey(range), token: 0, summary: initialSummary } : null,
  )
  const [failure, setFailure] = useState<{ key: string; token: number; message: string } | null>(null)
  const [token, setToken] = useState(0)

  const error = failure && failure.key === key && failure.token === token ? failure.message : null
  const isCurrent = state?.key === key && state.token === token
  const needsFetch = !isCurrent && !error

  useEffect(() => {
    if (!needsFetch) return

    let cancelled = false
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    fetch(`/api/finance/summary?${params.toString()}`)
      .then(async res => {
        const body = await res.json() as { summary?: FinanceSummaryRow[]; error?: unknown }
        if (!res.ok) {
          throw new Error(typeof body.error === 'string' ? body.error : 'No se pudieron calcular los totales')
        }
        return body.summary ?? []
      })
      .then(summary => {
        if (!cancelled) setState({ key, token, summary })
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setFailure({ key, token, message: e instanceof Error ? e.message : 'Error desconocido' })
        }
      })

    // Al cambiar de rango, la respuesta del rango viejo se descarta
    return () => { cancelled = true }
  }, [needsFetch, key, token, from, to])

  const refresh = useCallback(() => setToken(t => t + 1), [])

  return {
    summary: state?.key === key ? state.summary : [],
    // Solo es "cargando" si lo que hay en pantalla no es de este rango
    loading: state?.key !== key && !error,
    error,
    refresh,
  }
}
