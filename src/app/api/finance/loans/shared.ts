import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { LoanDirection, LoanRepayment } from '@/lib/finance/loans'

type Client = SupabaseClient<Database>

export const LOAN_SELECT =
  'id, direction, counterparty, wallet_id, category_id, principal, installments, installment_amount, next_due_date, started_on, notes, created_at, updated_at'

export const WALLET_SELECT =
  'id, name, type, balance, currency, color, icon, created_at, updated_at'

/**
 * Los movimientos de vuelta de cada préstamo: las cuotas pagadas y los cobros.
 *
 * Salen de `transactions` y no de un contador en `loans` porque un contador se
 * desincroniza el día que alguien borra un movimiento, y la plata que se movió
 * está en `transactions`.
 *
 * ── Cómo se distingue una devolución del desembolso ──
 *
 * No por el orden ni por la fecha —dos movimientos del mismo día no tienen un
 * orden confiable— sino por el tipo y el signo, que están determinados por la
 * dirección del préstamo:
 *
 *   tomado    desembolso = `prestamo` (+)   ·  cuota = `gasto`
 *   otorgado  desembolso = `prestamo` (−)   ·  cobro = `prestamo` (+)
 *
 * O sea: en un préstamo tomado las devoluciones son **todos** los `gasto`, y en
 * uno otorgado son **todos** los `prestamo` positivos. Sin heurísticas.
 */
export async function loadRepayments(
  supabase: Client,
  userId: string,
  loans: readonly { id: string; direction: LoanDirection }[],
): Promise<Record<string, LoanRepayment[]>> {
  const byLoan: Record<string, LoanRepayment[]> = {}
  for (const loan of loans) byLoan[loan.id] = []

  if (loans.length === 0) return byLoan

  const directionOf = new Map(loans.map(l => [l.id, l.direction]))

  const { data } = await supabase
    .from('transactions')
    .select('id, loan_id, amount, date, type')
    .eq('user_id', userId)
    .in('loan_id', loans.map(l => l.id))
    .in('type', ['gasto', 'prestamo'])
    .is('deleted_at', null)
    .order('date', { ascending: true })

  for (const row of data ?? []) {
    if (!row.loan_id) continue
    const direction = directionOf.get(row.loan_id)
    if (!direction) continue

    const amount = Number(row.amount)
    const isRepayment = direction === 'tomado'
      ? row.type === 'gasto'
      : row.type === 'prestamo' && amount > 0

    if (isRepayment) {
      byLoan[row.loan_id].push({ id: row.id, amount: Math.abs(amount), date: row.date })
    }
  }

  return byLoan
}
