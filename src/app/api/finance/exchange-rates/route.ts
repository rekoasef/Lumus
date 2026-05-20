import { NextResponse } from 'next/server'

// ARS por 1 unidad de cada moneda (cuántos pesos vale 1 USD / 1 EUR)
export interface ExchangeRates {
  USD: number
  EUR: number
  updatedAt: string
  source: 'live' | 'fallback'
}

// Caché en memoria por proceso (Next.js server) — evita llamadas repetidas
let cache: { rates: ExchangeRates; fetchedAt: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hora

async function fetchRates(): Promise<ExchangeRates> {
  // bluelytics.com.ar — dólar blue argentino
  const res = await fetch('https://api.bluelytics.com.ar/v2/latest', {
    next: { revalidate: 3600 },
  })

  if (!res.ok) throw new Error('bluelytics error')

  const data = await res.json() as {
    blue: { value_buy: number; value_sell: number }
    oficial: { value_buy: number; value_sell: number }
    last_update: string
  }

  // Promedio entre compra y venta del blue
  const usdBlue = (data.blue.value_buy + data.blue.value_sell) / 2

  // EUR: estimamos usando la relación EUR/USD global (~1.08) sobre el blue
  // No hay fuente oficial argentina de EUR, este es el comportamiento real del mercado
  const EUR_USD_RATIO = 1.08
  const eurBlue = usdBlue * EUR_USD_RATIO

  return {
    USD: Math.round(usdBlue),
    EUR: Math.round(eurBlue),
    updatedAt: data.last_update,
    source: 'live',
  }
}

export async function GET() {
  try {
    const now = Date.now()

    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json(cache.rates)
    }

    const rates = await fetchRates()
    cache = { rates, fetchedAt: now }
    return NextResponse.json(rates)
  } catch {
    // Fallback con valores aproximados si la API externa falla
    const fallback: ExchangeRates = {
      USD: 1200,
      EUR: 1300,
      updatedAt: new Date().toISOString(),
      source: 'fallback',
    }
    return NextResponse.json(fallback)
  }
}
