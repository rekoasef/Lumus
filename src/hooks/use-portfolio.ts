'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CreatePurchaseInput } from '@/lib/validations/finance'

async function send(url: string, method: string, body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null) as { error?: unknown } | null
    throw new Error(typeof data?.error === 'string' ? data.error : 'No se pudo guardar')
  }
}

/**
 * Compras y bajas de la cartera.
 *
 * No guarda especies ni operaciones en estado propio: después de cada cambio
 * refresca la página, porque **el precio de una especie nueva lo busca el
 * server** (CoinGecko y data912 no se llaman desde el navegador) y una cartera
 * mitad local y mitad del server es la forma de mostrar un total viejo.
 */
export function usePortfolio() {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [refreshing, startRefresh] = useTransition()

  const run = useCallback(async (key: string, action: () => Promise<void>) => {
    setPending(key)
    try {
      await action()
      startRefresh(() => router.refresh())
    } finally {
      setPending(null)
    }
  }, [router])

  const addPurchase = useCallback((input: CreatePurchaseInput) =>
    run('purchase', () => send('/api/finance/holdings', 'POST', input)), [run])

  const removeTrade = useCallback((id: string) =>
    run(`trade:${id}`, () => send(`/api/finance/holdings/trades/${id}`, 'DELETE')), [run])

  const removeHolding = useCallback((id: string) =>
    run(`holding:${id}`, () => send(`/api/finance/holdings/${id}`, 'DELETE')), [run])

  const updateManualPrice = useCallback((id: string, manualPrice: number) =>
    run(`holding:${id}`, () => send(`/api/finance/holdings/${id}`, 'PATCH', { manual_price: manualPrice })), [run])

  return { pending, refreshing, addPurchase, removeTrade, removeHolding, updateManualPrice }
}
