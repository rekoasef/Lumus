/**
 * Precios de cripto, desde CoinGecko.
 *
 * Mismo molde que `exchange-rates.ts`: caché en memoria por proceso y fallback
 * silencioso. Un precio viejo o equivocado en una app de finanzas es peor que
 * no mostrar nada, así que si la fuente falla esto devuelve un mapa vacío y
 * quien llama decide — no inventa un número.
 *
 * Nunca se llama desde el navegador: el plan free tiene límite de rate y con
 * varios usuarios recargando la pantalla se agota en minutos.
 */

const ENDPOINT = 'https://api.coingecko.com/api/v3/simple/price'
const CACHE_TTL_MS = 5 * 60 * 1000

let cache: { prices: Map<string, number>; ids: string; fetchedAt: number } | null = null

/**
 * Las cripto que se ofrecen con precio automático.
 *
 * Es una lista corta a propósito: cada id tiene que existir en CoinGecko, y
 * dejar que el usuario escriba uno cualquiera es garantizar tenencias que no
 * se pueden valuar.
 */
export const CRYPTO_OPTIONS = [
  { id: 'bitcoin',      label: 'Bitcoin',   symbol: 'BTC' },
  { id: 'ethereum',     label: 'Ethereum',  symbol: 'ETH' },
  { id: 'tether',       label: 'Tether',    symbol: 'USDT' },
  { id: 'usd-coin',     label: 'USD Coin',  symbol: 'USDC' },
  { id: 'solana',       label: 'Solana',    symbol: 'SOL' },
  { id: 'binancecoin',  label: 'BNB',       symbol: 'BNB' },
  { id: 'cardano',      label: 'Cardano',   symbol: 'ADA' },
  { id: 'ripple',       label: 'XRP',       symbol: 'XRP' },
  { id: 'dogecoin',     label: 'Dogecoin',  symbol: 'DOGE' },
  { id: 'litecoin',     label: 'Litecoin',  symbol: 'LTC' },
] as const

export type CryptoId = (typeof CRYPTO_OPTIONS)[number]['id']

export const CRYPTO_IDS: readonly string[] = CRYPTO_OPTIONS.map(c => c.id)

export function isCryptoId(value: string): boolean {
  return CRYPTO_IDS.includes(value)
}

/** Precios en USD por id. Mapa vacío si la fuente no contestó. */
export async function getCryptoPrices(ids: readonly string[]): Promise<Map<string, number>> {
  const wanted = [...new Set(ids)].filter(isCryptoId).sort()
  if (wanted.length === 0) return new Map()

  const key = wanted.join(',')
  const now = Date.now()

  if (cache && cache.ids === key && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.prices
  }

  try {
    const res = await fetch(`${ENDPOINT}?ids=${encodeURIComponent(key)}&vs_currencies=usd`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`CoinGecko respondió ${res.status}`)

    const data = await res.json() as Record<string, { usd?: number }>
    const prices = new Map<string, number>()

    for (const [id, value] of Object.entries(data)) {
      if (typeof value.usd === 'number' && value.usd > 0) prices.set(id, value.usd)
    }

    cache = { prices, ids: key, fetchedAt: now }
    return prices
  } catch (error) {
    console.error('[cripto] no se pudieron traer los precios', error)
    // Un precio viejo sirve más que ninguno mientras siga siendo de hoy.
    if (cache && cache.ids === key) return cache.prices
    return new Map()
  }
}
