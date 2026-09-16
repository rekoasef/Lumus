import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getCryptoMarket } from './crypto-prices'
import { getArsQuotes } from './market'
import {
  EMPTY_QUOTES,
  portfolioTotals,
  valueHoldings,
  type Holding,
  type HoldingKind,
  type HoldingTrade,
  type PortfolioTotals,
  type PriceQuotes,
  type TradeCurrency,
  type TradeSide,
  type ValuedHolding,
} from './holdings'
import type { DailyRate } from './purchasing-power'

/**
 * Lecturas de la cartera: especies, operaciones y precios.
 *
 * Existe porque el patrimonio se calcula en tres lugares —el dashboard, el
 * análisis de patrimonio y la pantalla de inversiones— y la vez que cada uno
 * armó su propia cuenta, la misma meta mostró 62% en una pantalla y 0% en otra.
 *
 * Los precios se buscan **solo en el server** y solo de las fuentes que hacen
 * falta: CoinGecko y data912 limitan por rate, y alguien sin acciones no tiene
 * por qué gastar una consulta de la lista de CEDEARs.
 */

type Client = SupabaseClient<Database>

export const HOLDING_SELECT = 'id, wallet_id, name, kind, price_source, manual_price'
export const TRADE_SELECT = 'id, holding_id, side, quantity, price, currency, trade_date, created_at'

/** El techo de PostgREST: pedir más no lo levanta, hay que paginar (ver `rate-history.ts`). */
const PAGE_SIZE = 1000
const MAX_PAGES = 20

const KINDS: readonly HoldingKind[] = ['cripto', 'accion', 'cedear', 'otro']

function asKind(value: string): HoldingKind {
  return KINDS.find(k => k === value) ?? 'otro'
}

function asSide(value: string): TradeSide {
  return value === 'venta' ? 'venta' : 'compra'
}

function asCurrency(value: string): TradeCurrency {
  return value === 'USD' ? 'USD' : 'ARS'
}

export function toHolding(row: {
  id: string; wallet_id: string; name: string; kind: string; price_source: string | null; manual_price: number | null
}): Holding {
  return {
    id: row.id,
    wallet_id: row.wallet_id,
    name: row.name,
    kind: asKind(row.kind),
    price_source: row.price_source,
    manual_price: row.manual_price === null ? null : Number(row.manual_price),
  }
}

export function toTrade(row: {
  id: string; holding_id: string; side: string; quantity: number; price: number; currency: string; trade_date: string; created_at: string
}): HoldingTrade {
  return {
    id: row.id,
    holding_id: row.holding_id,
    side: asSide(row.side),
    // `numeric` puede llegar como string desde PostgREST.
    quantity: Number(row.quantity),
    price: Number(row.price),
    currency: asCurrency(row.currency),
    trade_date: row.trade_date,
    created_at: row.created_at,
  }
}

export async function loadHoldingsAndTrades(
  supabase: Client,
  userId: string,
  walletIds?: readonly string[],
): Promise<{ holdings: Holding[]; trades: HoldingTrade[] }> {
  let holdingsQuery = supabase
    .from('holdings')
    .select(HOLDING_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (walletIds) holdingsQuery = holdingsQuery.in('wallet_id', [...walletIds])

  const { data: holdingRows, error } = await holdingsQuery
  if (error) console.error('[cartera] no se pudieron leer las especies', error)

  const holdings = (holdingRows ?? []).map(toHolding)
  if (holdings.length === 0) return { holdings, trades: [] }

  const trades: HoldingTrade[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error: tradesError } = await supabase
      .from('holding_trades')
      .select(TRADE_SELECT)
      .eq('user_id', userId)
      .in('holding_id', holdings.map(h => h.id))
      .order('trade_date', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (tradesError) {
      console.error('[cartera] no se pudieron leer las operaciones', tradesError)
      break
    }
    const rows = data ?? []
    trades.push(...rows.map(toTrade))
    if (rows.length < PAGE_SIZE) break
  }

  return { holdings, trades }
}

/**
 * Los precios que necesitan estas especies, de las fuentes que hagan falta.
 *
 * `fetchedAt` es el del dato más viejo: la pantalla tiene que poder decir de
 * cuándo es, y si una fuente vino del caché, ese es el número honesto.
 */
export async function getPriceQuotes(
  holdings: readonly Pick<Holding, 'kind' | 'price_source'>[],
): Promise<{ quotes: PriceQuotes; fetchedAt: string | null }> {
  const needs = new Set(holdings.filter(h => h.price_source).map(h => h.kind))
  const quotes: PriceQuotes = { cripto: {}, accion: {}, cedear: {} }
  const stamps: string[] = []

  const [crypto, stocks, cedears] = await Promise.all([
    needs.has('cripto') ? getCryptoMarket() : Promise.resolve(null),
    needs.has('accion') ? getArsQuotes('accion') : Promise.resolve(null),
    needs.has('cedear') ? getArsQuotes('cedear') : Promise.resolve(null),
  ])

  if (crypto) {
    for (const q of crypto.quotes) quotes.cripto[q.id] = { priceUsd: q.priceUsd, changePercent: q.changePercent }
    stamps.push(crypto.fetchedAt)
  }
  if (stocks) {
    quotes.accion = stocks.data
    stamps.push(stocks.fetchedAt)
  }
  if (cedears) {
    quotes.cedear = cedears.data
    stamps.push(cedears.fetchedAt)
  }

  return { quotes: stamps.length ? quotes : EMPTY_QUOTES, fetchedAt: stamps.sort()[0] ?? null }
}

/** La compra más vieja: la serie de cotizaciones tiene que llegar hasta ahí para valuar su costo. */
export function oldestTradeDate(trades: readonly HoldingTrade[]): string | null {
  return trades.reduce<string | null>((oldest, t) => (!oldest || t.trade_date < oldest ? t.trade_date : oldest), null)
}

/** La cartera entera valuada, para el patrimonio. */
export async function getPortfolioValue(
  supabase: Client,
  userId: string,
  arsPerUsd: number,
  rates: readonly DailyRate[],
): Promise<{ valued: ValuedHolding[]; totals: PortfolioTotals }> {
  const { holdings, trades } = await loadHoldingsAndTrades(supabase, userId)
  if (holdings.length === 0) {
    return { valued: [], totals: portfolioTotals([]) }
  }
  const { quotes } = await getPriceQuotes(holdings)
  const valued = valueHoldings(holdings, trades, quotes, arsPerUsd, rates)
  return { valued, totals: portfolioTotals(valued.map(v => v.valuation)) }
}
