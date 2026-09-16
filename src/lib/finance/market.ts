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
const CEDEARS_ENDPOINT = 'https://data912.com/live/arg_cedears'
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

/** Una cotización en pesos de data912, para valuar tenencias. */
export interface ArsQuote {
  priceArs: number
  changePercent: number
}

/**
 * Todas las cotizaciones de una lista de data912, por ticker.
 *
 * Separado de `getArgentineStocks` a propósito: eso alimenta la pantalla de
 * mercado y se queda con las que más se movieron; esto valúa tenencias y
 * necesita **todas**, porque la acción que alguien tiene no tiene por qué ser
 * de las veinte del día.
 *
 * La lista de CEDEARs trae además variantes en dólares con sufijo (AAPLD,
 * AAPLC) que cotizan en otra moneda. Se guardan igual —el ticker que se busca
 * es exacto—, y quien carga una tenencia elige el de pesos.
 */
export async function getArsQuotes(
  kind: 'accion' | 'cedear',
): Promise<MarketSnapshot<Record<string, ArsQuote>> | null> {
  const endpoint = kind === 'accion' ? STOCKS_ENDPOINT : CEDEARS_ENDPOINT
  return cached(`quotes:${kind}`, async () => {
    const res = await fetch(endpoint, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error(`data912 respondió ${res.status}`)

    const rows = await res.json() as Data912Row[]
    const quotes: Record<string, ArsQuote> = {}
    for (const r of rows) {
      if (typeof r.symbol !== 'string' || typeof r.c !== 'number' || r.c <= 0) continue
      quotes[r.symbol] = {
        priceArs: r.c,
        changePercent: typeof r.pct_change === 'number' ? r.pct_change : 0,
      }
    }
    return quotes
  })
}

/**
 * Los tickers que cotizan en pesos, para ofrecer al cargar una tenencia.
 *
 * La lista de CEDEARs de data912 trae casi cada especie tres veces: en pesos
 * (AAPL), en dólar MEP (AAPLD) y en cable (AAPLC). Ofrecer las tres invita a
 * cargar un precio en dólares como si fueran pesos.
 *
 * No alcanza con mirar el sufijo: BBD (Bradesco) termina en D y existe BB
 * (Banco do Brasil), y las dos cotizan en pesos. Lo que distingue a una
 * variante en dólares es el precio: vale **cientos de veces menos** que la de
 * pesos. Se saca solo si pasan las dos cosas.
 */
const DOLLAR_VARIANT_RATIO = 100

export function pesoTickers(quotes: Readonly<Record<string, ArsQuote>>): string[] {
  return Object.keys(quotes)
    .filter(symbol => {
      const last = symbol.at(-1)
      if (symbol.length < 2 || (last !== 'D' && last !== 'C')) return true
      const base = quotes[symbol.slice(0, -1)]
      if (!base) return true
      return base.priceArs / quotes[symbol].priceArs < DOLLAR_VARIANT_RATIO
    })
    .sort()
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
