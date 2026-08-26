'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DateRange, Transaction, TransactionType } from '@/types/finance.types'

/** Coincide con `MAX_LIMIT` de `/api/finance/transactions`. */
const ROWS_LIMIT = 500

interface RowsQuery {
  range: DateRange
  type: TransactionType
  /** `null` pide los movimientos sin categoría. */
  categoryId: string | null
}

interface RowsState {
  key: string
  token: number
  rows: Transaction[]
  truncated: boolean
}

/**
 * Los movimientos de una categoría dentro de un rango, traídos on-demand.
 *
 * Solo se piden filas cuando el usuario entra al detalle de una categoría: la
 * vista principal (donut y lista de categorías) se dibuja entera con el
 * agregado, sin transferir una sola transacción.
 */
export function useTransactionRows(query: RowsQuery | null) {
  const from = query?.range.from ?? null
  const to = query?.range.to ?? null
  const type = query?.type ?? null
  // La API espera `none` para los movimientos sin categoría.
  const categoryId = query ? (query.categoryId ?? 'none') : null
  const key = query ? `${from ?? ''}|${to ?? ''}|${type}|${categoryId}` : null

  const [state, setState] = useState<RowsState | null>(null)
  const [failure, setFailure] = useState<{ key: string; token: number; message: string } | null>(null)
  const [token, setToken] = useState(0)

  const error = key !== null && failure?.key === key && failure.token === token ? failure.message : null
  const isCurrent = key !== null && state?.key === key && state.token === token
  const needsFetch = key !== null && !isCurrent && !error

  useEffect(() => {
    if (!needsFetch || !key || !type || !categoryId) return

    let cancelled = false
    const params = new URLSearchParams({ type, category_id: categoryId, limit: String(ROWS_LIMIT) })
    if (from) params.set('date_from', from)
    if (to) params.set('date_to', to)

    fetch(`/api/finance/transactions?${params.toString()}`)
      .then(async res => {
        const body = await res.json() as { transactions?: Transaction[]; truncated?: boolean; error?: unknown }
        if (!res.ok) {
          throw new Error(typeof body.error === 'string' ? body.error : 'No se pudieron cargar los movimientos')
        }
        return { rows: body.transactions ?? [], truncated: Boolean(body.truncated) }
      })
      .then(({ rows, truncated }) => {
        if (!cancelled) setState({ key, token, rows, truncated })
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setFailure({ key, token, message: e instanceof Error ? e.message : 'Error desconocido' })
        }
      })

    return () => { cancelled = true }
  }, [needsFetch, key, token, from, to, type, categoryId])

  const refresh = useCallback(() => setToken(t => t + 1), [])
  const isShowing = key !== null && state?.key === key

  return {
    rows: isShowing ? state.rows : [],
    loading: key !== null && !isShowing && !error,
    truncated: isShowing ? state.truncated : false,
    error,
    limit: ROWS_LIMIT,
    refresh,
  }
}
