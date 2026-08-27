/**
 * Datos de mercado: acciones argentinas y series de cripto.
 *
 * Todo esto se pide **solo desde el server**, con caché en memoria por proceso.
 * Las APIs de mercado se rompen: cambian, limitan por rate y algunas se vuelven
 * pagas de un día para el otro. Un precio viejo o equivocado en una app de
 * finanzas es peor que no mostrar nada, así que cada función devuelve `null`
 * cuando la fuente falla y la pantalla lo dice.
 *
 * Cada resultado viaja con `fetchedAt`: la pantalla tiene que poder mostrar de
 * cuándo es el dato, no dibujarlo como si fuera de recién.
 */

const STOCKS_ENDPOINT = 'https://data912.com/live/arg_stocks'
const COINGECKO_CHART = 'https://api.coingecko.com/api/v3/coins'
const CACHE_TTL_MS = 5 * 60 * 1000

export interface MarketQuote {
  symbol: string
  price: number
  changePercent: number
}

export interface MarketSnapshot<T> {
  data: T
  /** ISO del momento en que se trajo. La UI muestra cuánto hace. */
  fetchedAt: string
}

type CacheEntry = { value: unknown; fetchedAt: number }
const cache = new Map<string, CacheEntry>()

async function cached<T>(key: string, load: () => Promise<T>): Promise<MarketSnapshot<T> | null> {
  const hit = cache.get(key)
  const now = Date.now()

  if (hit && now - hit.fetchedAt < CACHE_TTL_MS) {
    return { data: hit.value as T, fetchedAt: new Date(hit.fetchedAt).toISOString() }
  }

  try {
    const value = await load()
    cache.set(key, { value, fetchedAt: now })
    return { data: value, fetchedAt: new Date(now).toISOString() }
  } catch (error) {
    console.error(`[mercado] falló ${key}`, error)
    // Un dato viejo sirve más que ninguno, **siempre que se muestre su edad**.
    if (hit) return { data: hit.value as T, fetchedAt: new Date(hit.fetchedAt).toISOString() }
    return null
  }
}

interface Data912Row {
  symbol: string
  c: number
  pct_change: number
}

/** Acciones del panel argentino, ordenadas por variación del día. */
export async function getArgentineStocks(limit = 20): Promise<MarketSnapshot<MarketQuote[]> | null> {
  return cached(`stocks:${limit}`, async () => {
    const res = await fetch(STOCKS_ENDPOINT, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error(`data912 respondió ${res.status}`)

    const rows = await res.json() as Data912Row[]

    return rows
      .filter(r => typeof r.c === 'number' && r.c > 0 && typeof r.pct_change === 'number')
      .map(r => ({ symbol: r.symbol, price: r.c, changePercent: r.pct_change }))
      // Las que más se movieron, para arriba o para abajo: es lo que alguien
      // mira cuando abre una pantalla de mercado.
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, limit)
  })
}

export interface ChartPoint {
  date: string
  value: number
}

/** Serie diaria de una cripto, en USD. */
export async function getCryptoChart(id: string, days = 30): Promise<MarketSnapshot<ChartPoint[]> | null> {
  return cached(`chart:${id}:${days}`, async () => {
    const url = `${COINGECKO_CHART}/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}&interval=daily`
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error(`CoinGecko respondió ${res.status}`)

    const data = await res.json() as { prices?: [number, number][] }

    return (data.prices ?? []).map(([ms, value]) => ({
      date: new Date(ms).toISOString().slice(0, 10),
      value,
    }))
  })
}
