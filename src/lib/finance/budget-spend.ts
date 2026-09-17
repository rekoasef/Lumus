import { rateOn, type DailyRate } from './purchasing-power'

/**
 * Cuánto se gastó contra un presupuesto.
 *
 * Los presupuestos se definen en pesos, así que un gasto en dólares tiene que
 * pasar a pesos antes de sumarse. Hasta el 2026-09-17 se sumaba crudo: un hotel
 * de US$ 120 contaba como $ 120, y el panel —que sí convertía— mostraba el mismo
 * presupuesto al 741 % mientras la pantalla de presupuestos decía 0 %.
 *
 * Se convierte con el dólar **del día del gasto** y no con el de hoy: lo que
 * costó ese hotel quedó fijo cuando se pagó, y el uso de un presupuesto no
 * tiene que moverse solo porque se movió el dólar (el motivo por el que antes
 * no se convertía).
 */

export interface SpendRow {
  category_id: string | null
  /** PostgREST puede mandar `numeric` como texto. */
  amount: number | string
  date: string
  /** La moneda de la billetera: un movimiento no tiene moneda propia. */
  currency: string
}

/** Cotización de hoy. Es el respaldo cuando la historia no alcanza. */
export type TodayToARS = (amount: number, currency: string) => number

/**
 * Un gasto, en pesos.
 *
 * La historia solo guarda el dólar. Para otra moneda, o para una fecha anterior
 * al primer dato guardado, se usa la cotización de hoy: una aproximación, pero
 * mucho mejor que contar un euro como un peso.
 */
export function spendInARS(row: SpendRow, history: readonly DailyRate[], todayToARS: TodayToARS): number {
  const amount = Number(row.amount)
  if (row.currency === 'ARS') return amount

  if (row.currency === 'USD') {
    const rate = rateOn(history, row.date)
    if (rate) return amount * rate
  }

  return todayToARS(amount, row.currency)
}

/**
 * Gasto en pesos agrupado por la clave que se pida.
 *
 * La clave es un parámetro porque el aviso diario agrupa por usuario y
 * categoría a la vez, y las pantallas solo por categoría. Las filas sin clave
 * (sin categoría) se descartan: ningún presupuesto las puede reclamar.
 */
export function spentByKey<T extends SpendRow>(
  rows: readonly T[],
  keyOf: (row: T) => string | null,
  history: readonly DailyRate[],
  todayToARS: TodayToARS,
): Record<string, number> {
  const totals: Record<string, number> = {}

  for (const row of rows) {
    const key = keyOf(row)
    if (!key) continue
    totals[key] = (totals[key] ?? 0) + spendInARS(row, history, todayToARS)
  }

  return totals
}
