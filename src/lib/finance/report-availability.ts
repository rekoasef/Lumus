/**
 * Cuándo tiene sentido ofrecer el informe mensual.
 *
 * Hasta el 2026-09-17 el aviso de "tu informe de X está listo para generar"
 * aparecía por una sola razón: que no existiera el informe del mes anterior.
 * Una cuenta creada el 17 de septiembre veía, en su primer minuto y con la app
 * vacía, la oferta de analizar agosto — un mes en el que no existía.
 *
 * La regla, decidida por el dueño: **el informe de un mes se ofrece recién
 * cuando ese mes terminó, y solo si la cuenta ya existía durante ese mes**. Si
 * alguien se registra el 17 de septiembre, el primer informe posible es el de
 * septiembre, el 1° de octubre; si se registra el 1° de noviembre, el primero
 * es el de noviembre, el 1° de diciembre. Nunca uno anterior a la cuenta.
 *
 * Se suma un tercer freno que ya existía en los avisos por mail
 * (`selectMonthlyReportNotice`): un mes sin un solo movimiento no se analiza.
 * No es cosmético — el informe es la única llamada paga de Lumus, y pagarla
 * para que Claude diga "no hay datos" es tirar la plata dos veces: la del
 * proveedor y la del tope de regeneraciones, que se gasta igual.
 */

/** Por qué no se puede pedir el informe de un mes. `null` = se puede. */
export type ReportBlock = 'mes_sin_cerrar' | 'antes_de_la_cuenta' | 'sin_movimientos'

/** El texto que ve el usuario por cada freno. */
export const REPORT_BLOCK_MESSAGES: Record<ReportBlock, string> = {
  mes_sin_cerrar: 'Ese mes todavía no terminó. El informe se genera cuando cierra el mes.',
  antes_de_la_cuenta: 'Ese mes es anterior a tu cuenta, así que no hay nada para analizar. Tu primer informe es el del mes en que te registraste, y se puede generar cuando ese mes termine.',
  sin_movimientos: 'No cargaste ningún movimiento en ese mes, así que no hay nada para analizar.',
}

/**
 * El mes de una fecha en Argentina, `YYYY-MM`.
 *
 * Con el huso del servidor, el 1° de mes a las 00:30 de Argentina (03:30 UTC)
 * ya es mes nuevo en UTC pero todavía no acá: el informe aparecería un día
 * antes para el usuario. Vercel corre en UTC, así que no es hipotético.
 */
export function monthInArgentina(date: Date = new Date()): string {
  // en-CA da YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date).slice(0, 7)
}

/** El mes anterior a `month` (`2026-01` → `2025-12`). */
export function previousMonth(month: string): string {
  const year = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return m === 1
    ? `${year - 1}-12`
    : `${year}-${String(m - 1).padStart(2, '0')}`
}

/**
 * El único mes del que hoy se puede pedir un informe: el último cerrado.
 *
 * Es el mes que mira la pantalla de Gastos. Que la cuenta llegue a pedirlo o no
 * lo decide `reportBlock`.
 */
export function reportableMonth(now: Date = new Date()): string {
  return previousMonth(monthInArgentina(now))
}

export interface ReportBlockInput {
  /** El mes pedido, `YYYY-MM`. */
  month: string
  /** `created_at` del usuario en Supabase Auth. */
  accountCreatedAt: string
  /** Movimientos no borrados con fecha dentro del mes. */
  movements: number
  now?: Date
}

/**
 * Qué frena el informe de un mes, o `null` si se puede generar.
 *
 * Los meses se comparan como texto `YYYY-MM`: ordena igual que las fechas y no
 * arrastra husos ni fines de mes.
 */
export function reportBlock({
  month,
  accountCreatedAt,
  movements,
  now = new Date(),
}: ReportBlockInput): ReportBlock | null {
  if (month >= monthInArgentina(now)) return 'mes_sin_cerrar'
  if (month < monthInArgentina(new Date(accountCreatedAt))) return 'antes_de_la_cuenta'
  if (movements === 0) return 'sin_movimientos'
  return null
}
