import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { loanMovementRole, type LoanDirection, type LoanRepayment } from '@/lib/finance/loans'

type Client = SupabaseClient<Database>

export const LOAN_SELECT =
  'id, direction, counterparty, wallet_id, category_id, principal, installments, installment_amount, next_due_date, started_on, notes, preexisting, repaid_before_tracking, created_at, updated_at'

export const WALLET_SELECT =
  'id, name, type, balance, currency, color, icon, created_at, updated_at'

/**
 * Los movimientos de vuelta de cada préstamo: las cuotas pagadas y los cobros.
 *
 * Salen de `transactions` y no de un contador en `loans` porque un contador se
 * desincroniza el día que alguien borra un movimiento, y la plata que se movió
 * está en `transactions`.
 *
 * Cuál de los movimientos es una devolución y cuál el desembolso lo decide
 * `loanMovementRole`, en `lib/finance/loans.ts`. Está allá y no acá porque el
 * candado que impide borrar el desembolso desde la lista de movimientos usa la
 * misma regla, y las dos tienen que coincidir.
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

    if (loanMovementRole(direction, row.type, amount) === 'devolucion') {
      byLoan[row.loan_id].push({ id: row.id, amount: Math.abs(amount), date: row.date })
    }
  }

  return byLoan
}
