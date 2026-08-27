// ARS por 1 unidad de cada moneda (cuántos pesos vale 1 USD / 1 EUR)
export interface ExchangeRates {
  USD: number
  EUR: number
  updatedAt: string
  source: 'live' | 'fallback'
}

/** Último recurso si bluelytics no contesta. Se actualiza a mano, cada tanto. */
const FALLBACK_RATES = { USD: 1500, EUR: 1650 } as const

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
    blue_euro?: { value_buy: number; value_sell: number }
    oficial: { value_buy: number; value_sell: number }
    last_update: string
  }

  // Promedio entre compra y venta del blue
  const usdBlue = (data.blue.value_buy + data.blue.value_sell) / 2

  // El euro sale de la misma respuesta. Antes se estimaba como `usdBlue * 1.08`
  // con el 1,08 clavado en el código, mientras `blue_euro` venía en el JSON y
  // se tiraba. El estimado erraba poco de casualidad — el 2026-08-27 daba
  // 1.661,6 contra 1.672 reales — y el día que la relación se moviera iba a
  // mentir en silencio.
  //
  // Y no se deriva del EUR/USD internacional a propósito: ese mismo día la
  // paridad del BCE era 1,1645 y el euro argentino cotizaba a 1,0868 del
  // dólar, o sea un 7% de diferencia. El euro de acá no sigue la paridad de
  // afuera, y mezclar dos fuentes es cómo se terminan teniendo números que no
  // cierran entre sí.
  const eurBlue = data.blue_euro
    ? (data.blue_euro.value_buy + data.blue_euro.value_sell) / 2
    : null

  return {
    USD: Math.round(usdBlue),
    // Si la fuente no trae el euro, no se inventa: se cae al fallback.
    EUR: eurBlue ? Math.round(eurBlue) : FALLBACK_RATES.EUR,
    updatedAt: data.last_update,
    source: 'live',
  }
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const now = Date.now()

    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.rates
    }

    const rates = await fetchRates()
    cache = { rates, fetchedAt: now }
    return rates
  } catch {
    // Fallback si la API externa falla. Los valores quedan viejos rápido, por
    // eso `source: 'fallback'` — la UI puede avisar que no es la de hoy.
    return {
      ...FALLBACK_RATES,
      updatedAt: new Date().toISOString(),
      source: 'fallback',
    }
  }
}

export function convertToARS(amount: number, currency: string, rates: ExchangeRates): number {
  if (currency === 'ARS') return amount
  const rate = rates[currency as keyof Pick<ExchangeRates, 'USD' | 'EUR'>]
  return rate ? amount * rate : amount
}
