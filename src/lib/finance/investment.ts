/**
 * Qué parte del saldo de una inversión es plata que pusiste y qué parte rindió.
 *
 * Una billetera de inversión con saldo —Inversiones MP, un plazo fijo, un FCI—
 * no dice por qué cambió su número. Puede haber subido porque invertiste más o
 * porque ganó, y son cosas opuestas: la primera no te hizo más rico, solo movió
 * plata de lugar. Sin separarlas no hay rendimiento que calcular.
 *
 * Vive acá, en funciones puras, por la misma razón que `rules.ts`: un signo al
 * revés le dice a alguien que ganó cuando perdió. Y como el rendimiento en
 * dólares se calcula valuando cada aporte con la cotización de **su** día, la
 * cuenta es lo bastante larga como para que valga tenerla probada y en un solo
 * lugar.
 */

import { rateOn, type DailyRate } from './purchasing-power'

/**
 * Un movimiento de plata hacia adentro o hacia afuera de la inversión.
 * Positivo es aporte, negativo es retiro. **No incluye el rendimiento**: esa es
 * justamente la distinción que hace toda esta cuenta posible.
 */
export interface InvestmentMovement {
  date: string
  amount: number
}

/**
 * Todo lo que le pasó a una inversión: la plata que entró o salió y lo que
 * ganó o perdió sola. Es lo que la app sabe de verdad — no hay una foto diaria
 * del saldo, solo los momentos en que el dueño lo actualizó.
 */
export interface InvestmentEvent {
  date: string
  amount: number
  kind: 'movimiento' | 'rendimiento'
}

/** Los aportes y retiros, que son los que cambian el capital invertido. */
export function movementsOf(events: readonly InvestmentEvent[]): InvestmentMovement[] {
  return events
    .filter(e => e.kind === 'movimiento')
    .map(({ date, amount }) => ({ date, amount }))
}

export interface YieldPoint {
  date: string
  /** Lo que rindió esa vez. */
  amount: number
  /** Lo que lleva acumulado hasta esa fecha, inclusive. */
  accumulated: number
}

/**
 * El rendimiento a lo largo del tiempo, acumulado.
 *
 * Solo tiene puntos donde hubo un rendimiento registrado: entre dos
 * actualizaciones la app no sabe qué pasó, y dibujar una línea que suba
 * suavemente sería inventar días que nadie midió. Varios rendimientos del mismo
 * día se suman en un punto solo.
 */
export function yieldTimeline(events: readonly InvestmentEvent[]): YieldPoint[] {
  const byDate = new Map<string, number>()

  for (const event of events) {
    if (event.kind !== 'rendimiento') continue
    byDate.set(event.date, (byDate.get(event.date) ?? 0) + event.amount)
  }

  let accumulated = 0

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => {
      accumulated += amount
      return { date, amount, accumulated }
    })
}

export interface InvestmentReturn {
  /** Base + aportes − retiros: toda la plata tuya que hay adentro. */
  investedArs: number
  /** El saldo de hoy. */
  balanceArs: number
  /** Saldo − invertido. Negativo es pérdida. */
  returnArs: number
  /** El rendimiento sobre lo invertido. `null` si no hay capital: 0/0 no es 0%. */
  percent: number | null
}

/**
 * Cuánta plata tuya hay adentro.
 *
 * La base es el saldo del día en que la billetera pasó a ser de inversión. Los
 * ajustes anteriores a ese día no se pueden clasificar hacia atrás —solo el
 * dueño sabe cuál fue aporte y cuál fue ganancia— así que el contador arranca
 * ahí y el histórico queda como está.
 */
export function investedCapital(
  baselineArs: number,
  movements: readonly InvestmentMovement[],
): number {
  return movements.reduce((total, m) => total + m.amount, baselineArs)
}

export function investmentReturn(
  balanceArs: number,
  baselineArs: number,
  movements: readonly InvestmentMovement[],
): InvestmentReturn {
  const investedArs = investedCapital(baselineArs, movements)
  const returnArs = balanceArs - investedArs

  return {
    investedArs,
    balanceArs,
    returnArs,
    // Con capital cero o negativo el porcentaje no significa nada. Mostrar
    // "+∞%" o un número enorme es peor que no mostrar nada.
    percent: investedArs > 0 ? (returnArs / investedArs) * 100 : null,
  }
}

export interface InvestmentReturnUsd {
  /** Lo invertido, valuando cada aporte con la cotización de su día. */
  investedUsd: number
  /** El saldo de hoy al dólar de hoy. */
  balanceUsd: number
  returnUsd: number
  percent: number | null
}

/**
 * El mismo rendimiento, en dólares.
 *
 * Es el número que importa acá: ganar 20% en pesos mientras el dólar sube 30%
 * es perder, y en pesos eso se ve como una ganancia. Cada aporte se valúa con
 * la cotización del día en que entró, porque 100.000 pesos de hace un año no
 * son los mismos 100.000 de hoy.
 *
 * Devuelve `null` si falta alguna cotización en vez de completar con la que
 * haya a mano: un rendimiento inventado sobre la plata de alguien no sirve.
 */
export function investmentReturnUsd(
  balanceArs: number,
  baselineArs: number,
  baselineDate: string,
  movements: readonly InvestmentMovement[],
  rates: readonly DailyRate[],
  today: string,
): InvestmentReturnUsd | null {
  const rateNow = rateOn(rates, today)
  if (!rateNow || rateNow <= 0) return null

  const baselineRate = rateOn(rates, baselineDate)
  if (!baselineRate || baselineRate <= 0) return null

  let investedUsd = baselineArs / baselineRate

  for (const movement of movements) {
    const rate = rateOn(rates, movement.date)
    if (!rate || rate <= 0) return null
    investedUsd += movement.amount / rate
  }

  const balanceUsd = balanceArs / rateNow
  const returnUsd = balanceUsd - investedUsd

  return {
    investedUsd,
    balanceUsd,
    returnUsd,
    percent: investedUsd > 0 ? (returnUsd / investedUsd) * 100 : null,
  }
}

export interface BalanceChangeSplit {
  /** Lo que entró o salió de la inversión. Firmado: + aporte, − retiro. */
  movement: number
  /** Lo que la inversión ganó o perdió sola. Firmado. */
  yield: number
}

/**
 * Cómo se reparte un cambio de saldo entre "puse/saqué plata" y "rindió".
 *
 * En la misma actualización pueden haber pasado las dos cosas —el 2026-06-19
 * entraron 252.222 a Inversiones MP de los cuales 250.000 salieron de Mercado
 * Pago y 2.222 ya eran ganancia— así que el formulario deja cargar el aporte y
 * el resto se toma como rendimiento. Esta función es la única que hace ese
 * reparto: la usan el formulario para mostrar el resultado en vivo y la API
 * para guardarlo, y así no pueden discrepar.
 */
export function splitBalanceChange(
  currentBalance: number,
  newBalance: number,
  movement: number,
): BalanceChangeSplit {
  return {
    movement,
    yield: newBalance - currentBalance - movement,
  }
}

/** Debajo de esto un monto se considera cero: son centavos de redondeo. */
export const NEGLIGIBLE = 0.01

export function isNegligible(amount: number): boolean {
  return Math.abs(amount) < NEGLIGIBLE
}
