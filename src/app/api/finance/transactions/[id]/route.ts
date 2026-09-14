import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateTransactionSchema } from '@/lib/validations/finance'
import { loanMovementRole, type LoanDirection, type LoanMovementRole } from '@/lib/finance/loans'

const LOAN_LOCK_ERROR =
  'Este movimiento es el desembolso de un préstamo. Se borra desde Préstamos, junto con el préstamo entero.'
const LOAN_TYPE_ERROR =
  'No se puede cambiar el tipo de un movimiento de préstamo: dejaría de contar como cuota y la deuda subiría sin que la plata vuelva.'

/**
 * Qué es esta transacción para su préstamo, si pertenece a alguno.
 *
 * ── Por qué existe este candado ──
 *
 * Un préstamo con pendiente son **dos asientos que se compensan**: el
 * desembolso en la billetera y la deuda. Borrar el desembolso desde la lista de
 * movimientos deja la deuda sin la plata que la justifica, y el patrimonio pasa
 * a estar subestimado por todo el capital. Es la imagen espejo del bug que se
 * arregló en el borrado de préstamos (2026-09-14): ahí el préstamo se iba y la
 * plata quedaba, acá la plata se va y el préstamo queda.
 *
 * Una **devolución** no tiene ese problema y se sigue pudiendo borrar: borrar
 * una cuota devuelve la plata a la billetera y sube la deuda en paralelo, que
 * es exactamente deshacer el pago. La cuenta cierra sola.
 */
async function loanRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  id: string,
): Promise<{ walletId: string | null; role: LoanMovementRole | null }> {
  const { data } = await supabase
    .from('transactions')
    .select('wallet_id, type, amount, loan_id, loan:loans(direction)')
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()

  if (!data) return { walletId: null, role: null }

  const direction = data.loan?.direction as LoanDirection | undefined
  return {
    walletId: data.wallet_id,
    // Sin préstamo no hay candado: es un movimiento común.
    role: data.loan_id && direction
      ? loanMovementRole(direction, data.type, Number(data.amount))
      : null,
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = updateTransactionSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // El wallet_id anterior (para recomputar la billetera que deja de tenerlo) y
  // el papel que juega en su préstamo, si pertenece a alguno.
  const { walletId: previousWalletId, role } = await loanRole(supabase, user.id, id)

  if (role === 'desembolso') {
    return NextResponse.json({ error: LOAN_LOCK_ERROR }, { status: 409 })
  }
  // Una cuota se puede corregir —el monto, la fecha, la billetera— pero no
  // dejar de ser una cuota: `loanMovementRole` la reconoce por el tipo, y con
  // otro tipo saldría del cálculo del pendiente.
  if (role !== null && result.data.type !== undefined) {
    return NextResponse.json({ error: LOAN_TYPE_ERROR }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select(`
      id, wallet_id, category_id, type, amount, description, date, created_at, updated_at,
      loan_id, loan:loans(direction),
      wallet:wallets(id, name, color, currency),
      category:finance_categories(id, name, color, icon)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recomputar balance de todas las billeteras afectadas
  const walletIds = new Set<string>([data.wallet_id])
  if (previousWalletId) walletIds.add(previousWalletId)

  for (const wid of walletIds) {
    await supabase.rpc('recompute_wallet_balance', { p_wallet_id: wid })
  }

  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, type, balance, currency, color, icon, investment_baseline, investment_baseline_date, created_at, updated_at')
    .in('id', [...walletIds])
    .eq('user_id', user.id)
    .is('deleted_at', null)

  return NextResponse.json({ transaction: data, wallets: wallets ?? [] })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  const { walletId, role } = await loanRole(supabase, user.id, id)

  // El desembolso no se borra suelto: se va con el préstamo o no se va. Ver la
  // nota de `loanRole`.
  if (role === 'desembolso') {
    return NextResponse.json({ error: LOAN_LOCK_ERROR }, { status: 409 })
  }

  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (walletId) {
    await supabase.rpc('recompute_wallet_balance', { p_wallet_id: walletId })

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, name, type, balance, currency, color, icon, investment_baseline, investment_baseline_date, created_at, updated_at')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    return NextResponse.json({ success: true, wallet })
  }

  return NextResponse.json({ success: true })
}
