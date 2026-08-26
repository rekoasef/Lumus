import type { FinanceSummaryRow, TransactionType } from '@/types/finance.types'

/** Convierte un monto de `currency` a ARS. Lo resuelve el cliente, no la base. */
export type ToARS = (amount: number, currency: string) => number

export interface CategoryTotal {
  categoryId: string | null
  total: number
  count: number
}

/**
 * Total de un tipo de movimiento, convertido a ARS.
 *
 * El agregado viene separado por moneda justamente porque no se pueden sumar
 * pesos con dólares: la conversión pasa acá, con la cotización del cliente.
 */
export function sumSummary(rows: FinanceSummaryRow[], type: TransactionType, toARS: ToARS): number {
  return rows
    .filter(row => row.type === type)
    .reduce((sum, row) => sum + toARS(Number(row.total), row.currency), 0)
}

/** Cantidad de movimientos de un tipo. La moneda no importa para contar. */
export function countSummary(rows: FinanceSummaryRow[], type: TransactionType): number {
  return rows
    .filter(row => row.type === type)
    .reduce((sum, row) => sum + Number(row.tx_count), 0)
}

/**
 * Totales por categoría (en ARS), de mayor a menor.
 *
 * Una misma categoría aparece en varias filas del agregado si tiene
 * movimientos en más de una moneda — acá se juntan en una sola.
 */
export function totalsByCategory(rows: FinanceSummaryRow[], type: TransactionType, toARS: ToARS): CategoryTotal[] {
  const byCategory = new Map<string, CategoryTotal>()

  for (const row of rows) {
    if (row.type !== type) continue
    const key = row.category_id ?? NO_CATEGORY
    const current = byCategory.get(key)
    const amount = toARS(Number(row.total), row.currency)
    if (current) {
      current.total += amount
      current.count += Number(row.tx_count)
    } else {
      byCategory.set(key, {
        categoryId: row.category_id,
        total: amount,
        count: Number(row.tx_count),
      })
    }
  }

  return Array.from(byCategory.values()).sort((a, b) => b.total - a.total)
}

/** Clave de agrupación de los movimientos sin categoría. */
export const NO_CATEGORY = '__none__'

/** Suma cruda por categoría, sin convertir monedas — para presupuestos, que se definen en ARS. */
export function rawTotalsByCategory(rows: FinanceSummaryRow[], type: TransactionType): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    if (row.type !== type || !row.category_id) return acc
    acc[row.category_id] = (acc[row.category_id] ?? 0) + Number(row.total)
    return acc
  }, {})
}
