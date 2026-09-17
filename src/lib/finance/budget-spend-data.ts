import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { convertToARS, getExchangeRates } from './exchange-rates'
import { fetchRateHistory } from './rate-history'
import { spentByKey, type SpendRow } from './budget-spend'

/**
 * Lo que necesita cualquier pantalla para saber cuánto se gastó contra sus
 * presupuestos: los gastos del mes con su moneda, y las cotizaciones.
 *
 * Lo usan la pantalla de presupuestos, su API, el panel, el informe de IA y el
 * aviso diario. Cinco lugares con cinco consultas propias es como se llegó a
 * que dos pantallas dijeran cosas distintas del mismo presupuesto.
 */

type Client = SupabaseClient<Database>

/** El techo de PostgREST: más filas se pierden sin aviso. Hay que paginar. */
const PAGE_SIZE = 1000
const MAX_PAGES = 50

/** Margen hacia atrás para la cotización: un mes que empieza en domingo toma la del viernes. */
const RATE_LOOKBACK_DAYS = 7

export interface BudgetSpendRow extends SpendRow {
  user_id: string
}

interface SpendQuery {
  from: string
  to: string
  categoryIds: readonly string[]
  /** Sin usuario lee todos: solo tiene sentido con `service_role` (el aviso diario). */
  userId?: string
}

/** Los gastos de esas categorías en el período, con la moneda de su billetera. */
export async function fetchBudgetSpendRows(supabase: Client, query: SpendQuery): Promise<BudgetSpendRow[]> {
  if (query.categoryIds.length === 0) return []

  const rows: BudgetSpendRow[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    let request = supabase
      .from('transactions')
      .select('id, user_id, category_id, amount, date, wallet:wallets(currency)')
      .eq('type', 'gasto')
      .is('deleted_at', null)
      .in('category_id', [...query.categoryIds])
      .gte('date', query.from)
      .lte('date', query.to)
      .order('id')
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (query.userId) request = request.eq('user_id', query.userId)

    const { data, error } = await request
    // Mejor fallar que devolver un gasto a medias: un presupuesto al 40 %
    // cuando va al 110 % es justo el aviso que no llega.
    if (error) throw new Error(`gastos del mes: ${error.message}`)

    const pageRows = data ?? []
    for (const r of pageRows) {
      rows.push({
        user_id: r.user_id,
        category_id: r.category_id,
        amount: r.amount,
        date: r.date,
        currency: r.wallet?.currency ?? 'ARS',
      })
    }

    if (pageRows.length < PAGE_SIZE) break
  }

  return rows
}

/** Resta días a una fecha `YYYY-MM-DD` sin pasar por la zona horaria local. */
function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Convierte las filas a pesos y las agrupa. Ver `spentByKey`. */
export async function sumBudgetSpend<T extends BudgetSpendRow>(
  supabase: Client,
  rows: readonly T[],
  from: string,
  keyOf: (row: T) => string | null,
): Promise<Record<string, number>> {
  // Todo en pesos: no hace falta ninguna cotización.
  if (rows.every(r => r.currency === 'ARS')) return spentByKey(rows, keyOf, [], amount => amount)

  const [history, today] = await Promise.all([
    fetchRateHistory(supabase, daysBefore(from, RATE_LOOKBACK_DAYS)),
    getExchangeRates(),
  ])

  return spentByKey(rows, keyOf, history, (amount, currency) => convertToARS(amount, currency, today))
}

/** Gasto en pesos por categoría de un usuario en un período. */
export async function fetchSpentByCategory(
  supabase: Client,
  userId: string,
  categoryIds: readonly string[],
  from: string,
  to: string,
): Promise<Record<string, number>> {
  const rows = await fetchBudgetSpendRows(supabase, { from, to, categoryIds, userId })
  return sumBudgetSpend(supabase, rows, from, r => r.category_id)
}
