/**
 * La foto del patrimonio, como funciones puras.
 *
 * Son los números que después lee la IA. Están acá y no armados a mano en la
 * ruta porque **la IA no calcula nada**: recibe cifras ya resueltas y las
 * explica. Un modelo haciendo cuentas sobre la plata de alguien es la peor
 * versión posible de esta feature.
 */

export interface WealthComposition {
  /** Plata en pesos, en pesos. */
  arsArs: number
  /** Plata en moneda extranjera, convertida a pesos. */
  foreignArs: number
  /** Inversiones valuadas, en pesos. */
  holdingsArs: number
  /** Lo prestado que falta cobrar. Es un activo: plata tuya, en otro lado. */
  receivableArs: number
  /** Lo que se debe. Lo único que resta. */
  debtArs: number
  /** Lo que se tiene, sin descontar deuda. */
  totalArs: number
  /** Lo que se tiene menos lo que se debe. Es el patrimonio de verdad. */
  netArs: number
  /** Qué porcentaje de los activos está expuesto al peso. */
  pesoExposurePercent: number
}

/**
 * La composición del patrimonio.
 *
 * `totalArs` y `netArs` son dos números distintos y los dos importan: alguien
 * con 3 millones y una deuda de 2,5 no tiene lo mismo que alguien con 3 y nada.
 * La exposición al peso se mide contra **los activos** y no contra el neto: es
 * qué proporción de lo que tenés se devalúa, y una deuda en pesos no cambia eso
 * (la achica, pero esa es otra conversación).
 */
export function wealthComposition(
  arsArs: number,
  foreignArs: number,
  holdingsArs: number,
  receivableArs = 0,
  debtArs = 0,
): WealthComposition {
  const totalArs = arsArs + foreignArs + holdingsArs + receivableArs

  return {
    arsArs,
    foreignArs,
    holdingsArs,
    receivableArs,
    debtArs,
    totalArs,
    netArs: totalArs - debtArs,
    // Sin patrimonio no hay exposición: 0 y no NaN.
    pesoExposurePercent: totalArs > 0 ? (arsArs / totalArs) * 100 : 0,
  }
}

/**
 * Cuántos meses de gastos cubre la plata líquida.
 *
 * Solo cuenta lo líquido: las inversiones no son el colchón de emergencia, y
 * contarlas ahí daría una sensación de respaldo que no existe el día que hay
 * que vender algo apurado.
 */
export function monthsOfRunway(liquidArs: number, monthlyExpensesArs: number): number | null {
  if (monthlyExpensesArs <= 0) return null
  return liquidArs / monthlyExpensesArs
}

export interface RateChange {
  label: string
  percent: number
}

/**
 * Cuánto perdió el peso contra el dólar en varias ventanas.
 *
 * Es la vara con la que se mide el ahorro acá. No es inflación: es el dato que
 * la app tiene de verdad, y decir "perdió contra el dólar" es preciso mientras
 * que decir "perdió por la inflación" sería inventar.
 */
export function pesoLossOverWindows(
  rateNow: number,
  windows: readonly { label: string; rateThen: number | null }[],
): RateChange[] {
  if (rateNow <= 0) return []

  return windows
    .filter((w): w is { label: string; rateThen: number } => w.rateThen !== null && w.rateThen > 0)
    .map(w => ({ label: w.label, percent: (w.rateThen / rateNow - 1) * 100 }))
}
