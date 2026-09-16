import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Holding, PriceQuotes } from './holdings'
import { getPriceQuotes } from './portfolio-data'

/**
 * El precio de cada especie en cartera, una vez por día (`E2`).
 *
 * data912 da el precio del momento y no la historia, así que el gráfico de
 * "cómo viene" cada acción solo puede salir de lo que Lumus guarde. Es la
 * lección de `D1` con el dólar: **la historia que no se empieza a guardar hoy
 * no se reconstruye después**.
 *
 * El cron corre a las 8 de Argentina, antes de que abra el mercado: lo que se
 * guarda con la fecha de hoy es el último cierre conocido. Para una curva de
 * meses esa diferencia no se ve, y para cripto, que no cierra, da igual.
 */

export interface PriceHistoryRow {
  kind: 'cripto' | 'accion' | 'cedear'
  symbol: string
  date: string
  price: number
  currency: 'ARS' | 'USD'
}

/** Las filas a guardar: una por especie con precio automático, sin repetir. */
export function priceHistoryRows(
  holdings: readonly Pick<Holding, 'kind' | 'price_source'>[],
  quotes: PriceQuotes,
  date: string,
): PriceHistoryRow[] {
  const rows = new Map<string, PriceHistoryRow>()

  for (const { kind, price_source: symbol } of holdings) {
    if (!symbol) continue
    const key = `${kind}:${symbol}`
    if (rows.has(key)) continue

    if (kind === 'cripto') {
      const quote = quotes.cripto[symbol]
      if (quote && quote.priceUsd > 0) rows.set(key, { kind, symbol, date, price: quote.priceUsd, currency: 'USD' })
    } else if (kind === 'accion' || kind === 'cedear') {
      const quote = quotes[kind][symbol]
      if (quote && quote.priceArs > 0) rows.set(key, { kind, symbol, date, price: quote.priceArs, currency: 'ARS' })
    }
  }

  return [...rows.values()]
}

/**
 * Guarda los precios de hoy. Corre con `service_role` desde el cron, que es el
 * único que puede escribir `holding_price_history`.
 *
 * Devuelve cuántos guardó. No tira: el cron manda los avisos de todos, y que
 * data912 no conteste no puede dejar a nadie sin su vencimiento.
 */
export async function recordHoldingPrices(supabase: SupabaseClient<Database>, date: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('holdings')
      .select('kind, price_source')
      .not('price_source', 'is', null)

    if (error) throw error
    const holdings: Pick<Holding, 'kind' | 'price_source'>[] = []
    for (const h of data ?? []) {
      if (h.kind === 'cripto' || h.kind === 'accion' || h.kind === 'cedear') {
        holdings.push({ kind: h.kind, price_source: h.price_source })
      }
    }
    if (holdings.length === 0) return 0

    const { quotes } = await getPriceQuotes(holdings)
    const rows = priceHistoryRows(holdings, quotes, date)
    if (rows.length === 0) return 0

    // Upsert: si el cron se reintenta el mismo día, pisa en vez de duplicar.
    const { error: upsertError } = await supabase
      .from('holding_price_history')
      .upsert(rows, { onConflict: 'kind,symbol,date' })

    if (upsertError) throw upsertError
    return rows.length
  } catch (error) {
    console.error('[precios] no se pudo guardar la historia de precios', error)
    return 0
  }
}
