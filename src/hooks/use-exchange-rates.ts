'use client'

import { useState, useEffect } from 'react'
import type { ExchangeRates } from '@/app/api/finance/exchange-rates/route'

// Caché en memoria por sesión del navegador
let sessionCache: ExchangeRates | null = null

export function useExchangeRates() {
  const [rates, setRates]   = useState<ExchangeRates | null>(sessionCache)
  const [loading, setLoading] = useState(!sessionCache)

  useEffect(() => {
    if (sessionCache) return

    let cancelled = false
    fetch('/api/finance/exchange-rates')
      .then(r => r.json() as Promise<ExchangeRates>)
      .then(data => {
        if (cancelled) return
        sessionCache = data
        setRates(data)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  function toARS(amount: number, currency: string): number {
    if (currency === 'ARS' || !rates) return amount
    const rate = rates[currency as keyof Pick<ExchangeRates, 'USD' | 'EUR'>]
    return rate ? amount * rate : amount
  }

  return { rates, loading, toARS }
}
