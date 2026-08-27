import type { TransactionType } from '@/types/finance.types'

/**
 * Con qué categoría y billetera precargar un movimiento nuevo.
 *
 * La idea del ticket: entre "gasté" y "quedó registrado" cada paso es una
 * transacción que no se carga nunca. Si la app ya sabe que nueve de cada diez
 * gastos van a Supermercado con la tarjeta, cargar uno tiene que ser escribir
 * el monto y tocar guardar.
 *
 * Se calcula sobre los movimientos recientes y no sobre todo el historial: lo
 * que usabas hace dos años no es lo que vas a usar hoy.
 */

export interface FrequentRow {
  category_id: string | null
  wallet_id: string | null
}

export interface FrequentDefaults {
  category_id: string | null
  wallet_id: string | null
}

/** Cuántos días hacia atrás se miran. */
export const FREQUENT_WINDOW_DAYS = 60

/**
 * El valor más repetido, o `null` si no hay ninguno.
 *
 * Empate: gana el primero, que por el orden de la consulta es el más reciente.
 * No vale la pena desempatar mejor — es un default, no un cálculo.
 */
function mostCommon(values: readonly (string | null)[]): string | null {
  const counts = new Map<string, number>()

  for (const value of values) {
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  let best: string | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }

  return best
}

export function frequentDefaults(rows: readonly FrequentRow[]): FrequentDefaults {
  return {
    category_id: mostCommon(rows.map(r => r.category_id)),
    wallet_id: mostCommon(rows.map(r => r.wallet_id)),
  }
}

/** Los tipos que precargamos. Una transferencia no tiene "la de siempre". */
export const FREQUENT_TYPES: readonly TransactionType[] = ['gasto', 'ingreso']
