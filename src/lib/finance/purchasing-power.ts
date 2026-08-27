/**
 * Qué le pasó a tu plata, no a tu número.
 *
 * Toda app de finanzas del mundo asume que la moneda mantiene su valor, porque
 * están hechas donde ahorrar en la moneda local significa algo. Acá "ahorraste
 * 200.000 pesos este mes" no dice nada si no sabés qué hizo el dólar en esos
 * treinta días: podés haber ahorrado y ser más pobre.
 *
 * Todo esto es aritmética pura sobre dos cotizaciones. Vive separado de la UI
 * porque un signo al revés acá es decirle a alguien que ganó cuando perdió.
 */

export interface DailyRate {
  date: string
  usd: number
}

export interface PurchasingPowerChange {
  /** Cuánto valía en dólares al principio del período. */
  usdBefore: number
  /** Cuánto vale en dólares hoy. */
  usdNow: number
  /** Variación en dólares, en porcentaje. Negativo = perdiste poder de compra. */
  percent: number
  /** Cuántos pesos de hoy representa esa pérdida (o ganancia). */
  amountArs: number
  lost: boolean
}

/**
 * Qué le pasó a un monto en pesos que quedó quieto.
 *
 * No mide inflación: mide el valor contra el dólar, que es la vara con la que
 * se mide el ahorro en Argentina y el único dato que la app tiene de verdad.
 */
export function purchasingPowerChange(
  amountArs: number,
  rateBefore: number,
  rateNow: number,
): PurchasingPowerChange | null {
  // Sin cotizaciones válidas no se inventa un resultado: la UI muestra nada.
  if (rateBefore <= 0 || rateNow <= 0) return null

  const usdBefore = amountArs / rateBefore
  const usdNow = amountArs / rateNow
  const percent = (rateBefore / rateNow - 1) * 100

  return {
    usdBefore,
    usdNow,
    percent,
    // La pérdida expresada en pesos de hoy: es la forma en que la gente la
    // entiende sin tener que pensar en dólares.
    amountArs: (usdNow - usdBefore) * rateNow,
    lost: percent < 0,
  }
}

/**
 * La cotización más cercana a una fecha, mirando hacia atrás.
 *
 * Los fines de semana y feriados no tienen cotización, así que pedir "la del
 * 2026-08-30" tiene que devolver la del viernes. Hacia atrás y no hacia
 * adelante: valuar una fecha con una cotización que todavía no había pasado es
 * mirar el futuro.
 */
export function rateOn(rates: readonly DailyRate[], date: string): number | null {
  let best: DailyRate | null = null

  for (const rate of rates) {
    if (rate.date > date) continue
    if (!best || rate.date > best.date) best = rate
  }

  return best?.usd ?? null
}

/** Convierte a dólares con la cotización de una fecha. */
export function toUsdOn(amountArs: number, rates: readonly DailyRate[], date: string): number | null {
  const rate = rateOn(rates, date)
  return rate ? amountArs / rate : null
}
