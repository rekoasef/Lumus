import type { DailyRate } from './purchasing-power'
import { rateOn } from './purchasing-power'

/**
 * Posición, valuación y rendimiento de una especie, como funciones puras.
 *
 * ── Qué cambió con `E2` ──
 *
 * Una tenencia ya no guarda cantidad ni precio de compra: es **la especie
 * dentro de una billetera** (GGAL en la cuenta del broker), y lo que se tiene
 * sale de sus operaciones (`holding_trades`). Es la misma regla que lo pendiente
 * de un préstamo: se calcula desde lo que pasó, no desde un contador que se
 * desincroniza el día que alguien borra una operación.
 *
 * ── La regla que no cambió ──
 *
 * **El costo se lleva a dólares con la cotización del día de cada compra**, no
 * con la de hoy. Si pagaste 500.000 pesos por algo en 2024, comparar esos pesos
 * con los de hoy no dice nada: una acción parecería rendir lo que en realidad
 * se devaluó el peso. Es la trampa que `D1` vino a resolver.
 */

export type HoldingKind = 'cripto' | 'accion' | 'cedear' | 'otro'
export type TradeSide = 'compra' | 'venta'
export type TradeCurrency = 'ARS' | 'USD'

export interface Holding {
  id: string
  wallet_id: string
  name: string
  kind: HoldingKind
  /** Cripto: id de CoinGecko. Acción/CEDEAR: ticker de data912. Null = precio manual. */
  price_source: string | null
  /** Precio actual por unidad en USD, para lo que no tiene fuente automática. */
  manual_price: number | null
}

export interface HoldingTrade {
  id: string
  holding_id: string
  side: TradeSide
  quantity: number
  /** Por unidad, en `currency`. */
  price: number
  currency: TradeCurrency
  trade_date: string
  created_at?: string
}

/** En qué moneda cotiza cada tipo: las acciones y los CEDEARs en pesos, lo demás en dólares. */
export function quoteCurrencyOf(kind: HoldingKind): TradeCurrency {
  return kind === 'accion' || kind === 'cedear' ? 'ARS' : 'USD'
}

export interface Position {
  quantity: number
  /** Lo que costó lo que queda, en dólares de cada día de compra. Null si falta una cotización. */
  costUsd: number | null
  /** Lo mismo en pesos de cada día. Null si una compra en dólares no tiene cotización. */
  costArs: number | null
  /** Ganancia o pérdida de lo ya vendido, en dólares. 0 sin ventas. */
  realizedUsd: number | null
  trades: number
}

function byDate(a: HoldingTrade, b: HoldingTrade): number {
  if (a.trade_date !== b.trade_date) return a.trade_date < b.trade_date ? -1 : 1
  return (a.created_at ?? '') < (b.created_at ?? '') ? -1 : (a.created_at ?? '') > (b.created_at ?? '') ? 1 : 0
}

/**
 * Lo que se tiene de una especie, reconstruido desde sus operaciones.
 *
 * Las ventas salen a **precio promedio ponderado**: vender la mitad se lleva la
 * mitad del costo, y la diferencia con lo cobrado es la ganancia realizada. Es
 * el criterio con el que los brokers argentinos muestran la tenencia, y el que
 * la persona va a comparar contra su pantalla.
 *
 * Una venta por más de lo que hay se recorta a lo que hay: dejar la cantidad
 * negativa haría que el valor de la billetera reste.
 */
export function positionFromTrades(trades: readonly HoldingTrade[], rates: readonly DailyRate[]): Position {
  let quantity = 0
  let costUsd = 0
  let costArs = 0
  let realizedUsd = 0
  let usdKnown = true
  let arsKnown = true

  for (const trade of [...trades].sort(byDate)) {
    const rate = rateOn(rates, trade.trade_date)
    const gross = trade.quantity * trade.price
    const grossUsd = trade.currency === 'USD' ? gross : rate ? gross / rate : null
    const grossArs = trade.currency === 'ARS' ? gross : rate ? gross * rate : null

    if (trade.side === 'compra') {
      quantity += trade.quantity
      if (grossUsd === null) usdKnown = false
      else costUsd += grossUsd
      if (grossArs === null) arsKnown = false
      else costArs += grossArs
      continue
    }

    if (quantity <= 0) continue
    const sold = Math.min(trade.quantity, quantity)
    const fraction = sold / quantity
    const soldCostUsd = costUsd * fraction

    if (grossUsd === null) usdKnown = false
    else realizedUsd += grossUsd * (sold / trade.quantity) - soldCostUsd

    costUsd -= soldCostUsd
    costArs -= costArs * fraction
    quantity -= sold
  }

  return {
    quantity,
    costUsd: usdKnown ? costUsd : null,
    costArs: arsKnown ? costArs : null,
    realizedUsd: usdKnown ? realizedUsd : null,
    trades: trades.length,
  }
}

/** Precio promedio de lo que queda, en la moneda en la que cotiza la especie. */
export function averagePrice(position: Position, kind: HoldingKind): number | null {
  if (position.quantity <= 0) return null
  const cost = quoteCurrencyOf(kind) === 'ARS' ? position.costArs : position.costUsd
  return cost === null ? null : cost / position.quantity
}

// ── Precios ──────────────────────────────────────────────────────────────

export interface CryptoQuoteValue {
  priceUsd: number
  changePercent: number | null
}

export interface ArsQuoteValue {
  priceArs: number
  changePercent: number | null
}

/**
 * Los precios de mercado disponibles, por fuente. Van como objetos y no como
 * `Map` porque viajan del server al cliente.
 */
export interface PriceQuotes {
  cripto: Record<string, CryptoQuoteValue>
  accion: Record<string, ArsQuoteValue>
  cedear: Record<string, ArsQuoteValue>
}

export const EMPTY_QUOTES: PriceQuotes = { cripto: {}, accion: {}, cedear: {} }

export interface HoldingPrice {
  priceUsd: number
  priceArs: number
  /** Variación del día según la fuente. Null en un precio manual. */
  changePercent: number | null
  /** False si es el precio cargado a mano. */
  automatic: boolean
}

/**
 * El precio de hoy de una especie.
 *
 * Si la fuente automática no lo trae, el precio manual sirve de red antes que no
 * mostrar nada. Sin ninguno de los dos devuelve `null` y la especie se muestra
 * **sin precio**: inventar uno en una app de finanzas es peor que no tenerlo.
 *
 * Sin cotización del dólar tampoco hay precio, porque las dos monedas se usan
 * juntas y un valor en una sola a medias es el tipo de número que confunde.
 */
export function resolveHoldingPrice(
  holding: Pick<Holding, 'kind' | 'price_source' | 'manual_price'>,
  quotes: PriceQuotes,
  arsPerUsd: number,
): HoldingPrice | null {
  if (arsPerUsd <= 0) return null

  if (holding.price_source) {
    if (holding.kind === 'cripto') {
      const quote = quotes.cripto[holding.price_source]
      if (quote) {
        return {
          priceUsd: quote.priceUsd,
          priceArs: quote.priceUsd * arsPerUsd,
          changePercent: quote.changePercent,
          automatic: true,
        }
      }
    } else if (holding.kind === 'accion' || holding.kind === 'cedear') {
      const quote = quotes[holding.kind][holding.price_source]
      if (quote) {
        return {
          priceUsd: quote.priceArs / arsPerUsd,
          priceArs: quote.priceArs,
          changePercent: quote.changePercent,
          automatic: true,
        }
      }
    }
  }

  if (holding.manual_price !== null && holding.manual_price !== undefined) {
    const manual = Number(holding.manual_price)
    return { priceUsd: manual, priceArs: manual * arsPerUsd, changePercent: null, automatic: false }
  }

  return null
}

// ── Valuación ────────────────────────────────────────────────────────────

export interface PositionValuation {
  valueUsd: number
  valueArs: number
  costUsd: number
  /** Ganancia o pérdida en dólares, contra lo que se pagó en dólares de cada día. */
  returnUsd: number
  returnPercent: number
  hasReturn: boolean
  /** En pesos nominales. Se muestra, pero el que dice la verdad es el de dólares. */
  returnArs: number
  returnArsPercent: number
  hasReturnArs: boolean
}

export function valuatePosition(position: Position, price: HoldingPrice): PositionValuation {
  const valueUsd = position.quantity * price.priceUsd
  const valueArs = position.quantity * price.priceArs

  const hasReturn = position.costUsd !== null && position.costUsd > 0
  const returnUsd = hasReturn ? valueUsd - position.costUsd! : 0

  const hasReturnArs = position.costArs !== null && position.costArs > 0
  const returnArs = hasReturnArs ? valueArs - position.costArs! : 0

  return {
    valueUsd,
    valueArs,
    costUsd: position.costUsd ?? 0,
    returnUsd,
    returnPercent: hasReturn ? (returnUsd / position.costUsd!) * 100 : 0,
    hasReturn,
    returnArs,
    returnArsPercent: hasReturnArs ? (returnArs / position.costArs!) * 100 : 0,
    hasReturnArs,
  }
}

export interface PortfolioTotals {
  valueUsd: number
  valueArs: number
  costUsd: number
  returnUsd: number
  returnPercent: number
  /** Cuántas especies no se pudieron valuar por falta de precio. */
  unpriced: number
}

export function portfolioTotals(valuations: readonly (PositionValuation | null)[]): PortfolioTotals {
  let valueUsd = 0
  let valueArs = 0
  let costUsd = 0
  let comparableValue = 0
  let unpriced = 0

  for (const v of valuations) {
    if (!v) {
      unpriced++
      continue
    }
    valueUsd += v.valueUsd
    valueArs += v.valueArs
    // Solo entra al costo lo que tiene costo conocido: si no, el rendimiento
    // del total saldría inflado por las que no se pudieron convertir.
    if (v.hasReturn) {
      costUsd += v.costUsd
      comparableValue += v.valueUsd
    }
  }

  const returnUsd = costUsd > 0 ? comparableValue - costUsd : 0

  return {
    valueUsd,
    valueArs,
    costUsd,
    returnUsd,
    returnPercent: costUsd > 0 ? (returnUsd / costUsd) * 100 : 0,
    unpriced,
  }
}

export interface ValuedHolding {
  holding: Holding
  position: Position
  price: HoldingPrice | null
  valuation: PositionValuation | null
}

/**
 * Cada especie con su posición y su valuación, en una pasada. Es lo que usan el
 * dashboard, el análisis de patrimonio y la pantalla de inversiones: si cada uno
 * lo armara a mano, el patrimonio podría dar distinto en cada pantalla.
 *
 * Una especie sin nada en cartera (todo vendido) queda afuera: vale cero y no
 * tiene precio que buscar.
 */
export function valueHoldings(
  holdings: readonly Holding[],
  trades: readonly HoldingTrade[],
  quotes: PriceQuotes,
  arsPerUsd: number,
  rates: readonly DailyRate[],
): ValuedHolding[] {
  const tradesByHolding = new Map<string, HoldingTrade[]>()
  for (const trade of trades) {
    const list = tradesByHolding.get(trade.holding_id) ?? []
    list.push(trade)
    tradesByHolding.set(trade.holding_id, list)
  }

  return holdings
    .map(holding => {
      const position = positionFromTrades(tradesByHolding.get(holding.id) ?? [], rates)
      const price = resolveHoldingPrice(holding, quotes, arsPerUsd)
      const valuation = price ? valuatePosition(position, price) : null
      return { holding, position, price, valuation }
    })
    .filter(v => v.position.quantity > 0)
}

export interface PortfolioWalletSummary extends PortfolioTotals {
  /** Efectivo de la billetera, en pesos. */
  cashArs: number
  /** Lo que vale la billetera entera: efectivo más especies. */
  totalArs: number
}

/**
 * Lo que vale una cartera. **El efectivo y las especies se suman una sola vez,
 * acá**: el saldo de la billetera no incluye lo que valen sus acciones, y el
 * patrimonio del dashboard suma billeteras y especies por separado. Si alguna
 * pantalla sumara el valor de la cartera *además* de sus especies, la misma
 * plata contaría dos veces — el riesgo que `E2` anota.
 */
export function portfolioWalletSummary(
  valued: readonly ValuedHolding[],
  cashArs: number,
): PortfolioWalletSummary {
  const totals = portfolioTotals(valued.map(v => v.valuation))
  return { ...totals, cashArs, totalArs: totals.valueArs + cashArs }
}
