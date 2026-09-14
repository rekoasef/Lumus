import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loanRepaymentSchema } from '@/lib/validations/finance'
import { loanProgress, nextDueDate, type Loan } from '@/lib/finance/loans'
import { LOAN_SELECT, WALLET_SELECT, loadRepayments } from '../../shared'

/**
 * Registrar una cuota pagada o un cobro recibido.
 *
 * El tipo del movimiento no es el mismo en las dos direcciones, y la asimetría
 * es la decisión de producto del ticket:
 *
 * - **Cuota de un préstamo tomado → `gasto`.** Es un egreso y tiene que
 *   aparecer en el presupuesto y en el reporte del mes. El patrimonio no se
 *   cuenta dos veces porque la deuda baja en paralelo.
 * - **Cobro de un préstamo otorgado → `prestamo` positivo.** No es un ingreso:
 *   es plata tuya volviendo. Contarlo como ingreso inflaría el mes con guita
 *   que ya era tuya.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = loanRepaymentSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }
  const input = result.data

  const { data: loanRow } = await supabase
    .from('loans')
    .select(LOAN_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!loanRow) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })
  const loan = loanRow as unknown as Loan

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('id', input.wallet_id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!wallet) return NextResponse.json({ error: 'Billetera no encontrada' }, { status: 404 })

  // Un préstamo ya saldado no acepta más pagos: seguir registrando cuotas
  // dejaría el pendiente clavado en cero mientras sale plata de la billetera.
  const before = loanProgress(loan, (await loadRepayments(supabase, user.id, [loan]))[loan.id] ?? [])
  if (before.settled) {
    return NextResponse.json({ error: 'Este préstamo ya está saldado' }, { status: 409 })
  }

  const isTaken = loan.direction === 'tomado'

  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id:     user.id,
      wallet_id:   input.wallet_id,
      loan_id:     loan.id,
      category_id: isTaken ? loan.category_id : null,
      type:        isTaken ? 'gasto' : 'prestamo',
      amount:      input.amount,
      description: isTaken
        ? `Cuota ${before.paidInstallments + 1}${loan.installments ? `/${loan.installments}` : ''} — ${loan.counterparty}`
        : `Devolución de ${loan.counterparty}`,
      date:        input.date,
    })
    .select('id, amount, date')
    .single()

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  // Con el pago nuevo adentro: si quedó saldado no hay próximo vencimiento que
  // avisar, y si no, corre un mes. `nextDueDate` recorta al último día del mes
  // destino — el 31 de enero vence el 28 de febrero, no el 3 de marzo.
  //
  // Se relee en vez de sumarle el pago al cálculo anterior: la devolución ya
  // está en `transactions`, y derivarla dos veces es la forma de que las dos
  // versiones se separen.
  const after = loanProgress(loan, (await loadRepayments(supabase, user.id, [loan]))[loan.id] ?? [])

  // Cuántas cuotas cubrió este pago. Pagar dos juntas corre el vencimiento dos
  // meses, y pagar menos de una cuota no lo corre: seguís debiendo la de este
  // mes. `nextDueDate` con 0 devuelve la misma fecha.
  const installmentsCovered = after.paidInstallments - before.paidInstallments

  const updatedDueDate = after.settled
    ? null
    : loan.next_due_date
      ? nextDueDate(loan.next_due_date, installmentsCovered)
      : null

  const { data: updatedLoan, error: updateError } = await supabase
    .from('loans')
    .update({ next_due_date: updatedDueDate, updated_at: new Date().toISOString() })
    .eq('id', loan.id)
    .eq('user_id', user.id)
    .select(LOAN_SELECT)
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { data: updatedWallet } = await supabase
    .from('wallets')
    .select(WALLET_SELECT)
    .eq('id', input.wallet_id)
    .single()

  return NextResponse.json({
    loan: updatedLoan,
    repayment: { id: transaction.id, amount: Number(transaction.amount), date: transaction.date },
    wallet: updatedWallet,
  })
}
