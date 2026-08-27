import type { DailyRate } from './purchasing-power'
import { rateOn } from './purchasing-power'

/**
 * Valuación y rendimiento de una tenencia, como funciones puras.
 *
 * La regla que importa: **el costo se lleva a dólares con la cotización del día
 * que compraste**, no con la de hoy. Si pagaste 500.000 pesos por algo en 2024,
 * comparar esos pesos con los de hoy no dice absolutamente nada — es la misma
 * trampa que `D1` vino a resolver, aplicada a las inversiones.
 */

export type HoldingKind = 'cripto' | 'accion' | 'otro'

export interface Holding {
  id: string
  name: string
  kind: HoldingKind
  price_source: string | null
  quantity: number
  purchase_price: number
  purchase_currency: 'ARS' | 'USD'
  purchase_date: string
  manual_price: number | null
}

export interface HoldingValuation {
  /** Precio actual por unidad, en USD. */
  priceUsd: number
  /** Lo que vale hoy toda la tenencia, en USD. */
  valueUsd: number
  /** Lo mismo, en pesos de hoy. */
  valueArs: number
  /** Lo que pagaste, en dólares del día que compraste. */
  costUsd: number
  /** Ganancia o pérdida en dólares. */
  returnUsd: number
  returnPercent: number
  /** Si el costo no se pudo llevar a dólares, no hay rendimiento que mostrar. */
  hasReturn: boolean
}

/**
 * Cuánto costó la tenencia, en dólares.
 *
 * Si se pagó en pesos hace falta la cotización de ese día. Sin ella devuelve
 * `null` en vez de usar la de hoy: eso convertiría cualquier compra vieja en
 * una ganancia falsa del tamaño de la devaluación.
 */
export function costInUsd(holding: Holding, rates: readonly DailyRate[]): number | null {
  const total = holding.quantity * holding.purchase_price

  if (holding.purchase_currency === 'USD') return total

  const rate = rateOn(rates, holding.purchase_date)
  return rate ? total / rate : null
}

export function valuateHolding(
  holding: Holding,
  priceUsd: number,
  arsPerUsd: number,
  rates: readonly DailyRate[],
): HoldingValuation {
  const valueUsd = holding.quantity * priceUsd
  const costUsd = costInUsd(holding, rates)

  const hasReturn = costUsd !== null && costUsd > 0
  const returnUsd = hasReturn ? valueUsd - costUsd : 0

  return {
    priceUsd,
    valueUsd,
    valueArs: valueUsd * arsPerUsd,
    costUsd: costUsd ?? 0,
    returnUsd,
    returnPercent: hasReturn ? (returnUsd / costUsd) * 100 : 0,
    hasReturn,
  }
}

/** El precio de hoy: el de la fuente automática, o el que cargó el usuario. */
export function resolvePriceUsd(
  holding: Holding,
  prices: ReadonlyMap<string, number>,
): number | null {
  if (holding.price_source) {
    const live = prices.get(holding.price_source)
    // Si la fuente falló, el precio manual sirve de red antes que no mostrar nada.
    if (live !== undefined) return live
  }
  return holding.manual_price ?? null
}

export interface PortfolioTotals {
  valueUsd: number
  valueArs: number
  costUsd: number
  returnUsd: number
  returnPercent: number
  /** Cuántas tenencias no se pudieron valuar por falta de precio. */
  unpriced: number
}

export function portfolioTotals(
  valuations: readonly (HoldingValuation | null)[],
): PortfolioTotals {
  let valueUsd = 0
  let valueArs = 0
  let costUsd = 0
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
    if (v.hasReturn) costUsd += v.costUsd
  }

  const comparableValue = valuations
    .filter((v): v is HoldingValuation => v !== null && v.hasReturn)
    .reduce((sum, v) => sum + v.valueUsd, 0)

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
