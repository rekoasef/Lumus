import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateLoanSchema } from '@/lib/validations/finance'
import { loanMovementRole, loanProgress, type Loan } from '@/lib/finance/loans'
import { LOAN_SELECT, loadRepayments } from '../shared'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = updateLoanSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // La dirección no se edita: cambiarla daría vuelta el signo del desembolso ya
  // registrado y el saldo de la billetera quedaría mintiendo el doble del
  // capital. Para eso se borra el préstamo y se carga de nuevo.
  const { data: before } = await supabase
    .from('loans')
    .select(LOAN_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!before) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })
  const previous = before as unknown as Loan

  const { data: loan, error } = await supabase
    .from('loans')
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select(LOAN_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!loan) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })

  const updated = loan as unknown as Loan

  // ── El desembolso tiene que seguir al préstamo ───────────────────────────
  //
  // `principal` y `wallet_id` no son datos sueltos: describen un movimiento de
  // plata que ya está registrado. Editarlos sin tocarlo dejaba al préstamo
  // diciendo una cosa y a la billetera otra —500.000 de capital con un millón
  // adentro, o un préstamo apuntando a una billetera donde la plata nunca
  // entró—. En un préstamo otorgado eso mueve el patrimonio directo, porque
  // ahí lo que falta cobrar sale de `principal`.
  const amountChanged = updated.principal !== previous.principal
  const walletChanged = updated.wallet_id !== previous.wallet_id

  const wallets: { id: string; balance: number }[] = []

  if (amountChanged || walletChanged) {
    const { data: txRows } = await supabase
      .from('transactions')
      .select('id, type, amount')
      .eq('user_id', user.id)
      .eq('loan_id', id)
      .is('deleted_at', null)

    const disbursement = (txRows ?? []).find(
      t => loanMovementRole(updated.direction, t.type, Number(t.amount)) === 'desembolso',
    )

    if (disbursement) {
      // El signo lo sigue poniendo la dirección, que no se puede editar: entra
      // si lo sacaste, sale si lo prestaste.
      const signed = updated.direction === 'tomado' ? updated.principal : -updated.principal

      await supabase
        .from('transactions')
        .update({
          amount:     signed,
          wallet_id:  updated.wallet_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disbursement.id)
        .eq('user_id', user.id)

      // Las dos billeteras cuando la plata se mudó: la que la pierde y la que
      // la recibe.
      const touched = new Set([updated.wallet_id, previous.wallet_id])
      for (const walletId of touched) {
        await supabase.rpc('recompute_wallet_balance', { p_wallet_id: walletId })
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('id', walletId)
          .eq('user_id', user.id)
          .single()
        if (wallet) wallets.push({ id: wallet.id, balance: Number(wallet.balance) })
      }
    }
  }

  return NextResponse.json({ loan, wallets })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  // `archivar` deja los movimientos donde están; el default se lleva todo.
  const archive = req.nextUrl.searchParams.get('modo') === 'archivar'

  // ── Dos formas de sacar un préstamo de la pantalla ───────────────────────
  //
  // No son la misma intención y no pueden resolverse igual:
  //
  // - **Archivar** es "esto terminó, no lo quiero ver más". Los movimientos se
  //   quedan: las cuotas que pagaste son gastos reales, están en el presupuesto
  //   de su mes y en el reporte. Solo se permite con el préstamo **saldado**,
  //   porque con deuda pendiente archivarlo la haría desaparecer del patrimonio
  //   sin que nadie la haya pagado.
  //
  // - **Eliminar** es "esto nunca pasó": me equivoqué al cargarlo. Se lleva el
  //   desembolso y cada cuota, y los saldos vuelven a donde estaban.
  //
  // ── Por qué eliminar tiene que ir en cascada ─────────────────────────────
  //
  // Durante un tiempo el borrado dejaba los movimientos vivos, con el argumento
  // de que "la plata se movió de verdad". El argumento es cierto y la
  // conclusión estaba mal: un préstamo con pendiente es **dos** asientos que se
  // compensan —el desembolso en la billetera y la deuda— y borrar uno solo deja
  // el otro mintiendo.
  //
  // Un préstamo tomado de 1.000.000 en 6 cuotas de 200.000 lo mostró en
  // producción (2026-09-12):
  //
  //   antes de borrar   +1.000.000 en efectivo − 1.200.000 de deuda = −200.000
  //   después           +1.000.000 en efectivo −         0 de deuda = +1.000.000
  //
  // El patrimonio se infló 1.200.000 por archivar un préstamo. Es el mismo bug
  // que la migración 00029 se ocupó de evitar al crear el préstamo (que sacar
  // plata prestada no te haga más rico) reapareciendo al borrarlo.
  //
  // Así que borrar un préstamo significa "esto nunca pasó": se va con todos sus
  // movimientos y los saldos vuelven a donde estaban. La cuenta cierra sola en
  // las dos direcciones, que es como se sabe que el modelo está bien.
  const { data: loanRow } = await supabase
    .from('loans')
    .select(LOAN_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!loanRow) return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })
  const loan = loanRow as unknown as Loan

  if (archive) {
    const progress = loanProgress(loan, (await loadRepayments(supabase, user.id, [loan]))[loan.id] ?? [])

    // El candado que hace que archivar nunca mienta. Sin él, archivar sería la
    // puerta de atrás al mismo bug que este archivo arregla.
    if (!progress.settled) {
      return NextResponse.json({
        error: 'Todavía queda pendiente. Registrá lo que falta para darlo por saldado, o eliminalo si lo cargaste por error.',
      }, { status: 409 })
    }

    const { error: archiveError } = await supabase
      .from('loans')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if (archiveError) return NextResponse.json({ error: archiveError.message }, { status: 500 })

    // Sin billeteras en la respuesta: archivar no mueve un peso, justamente.
    return NextResponse.json({ success: true, archived: true, wallets: [], deletedTransactions: 0 })
  }

  // Las billeteras a recalcular: las cuotas pueden haberse pagado desde una
  // billetera distinta de la del desembolso.
  const { data: txRows, error: txReadError } = await supabase
    .from('transactions')
    .select('id, wallet_id')
    .eq('user_id', user.id)
    .eq('loan_id', id)
    .is('deleted_at', null)

  if (txReadError) return NextResponse.json({ error: txReadError.message }, { status: 500 })

  const txIds = (txRows ?? []).map(t => t.id)
  const walletIds = [...new Set((txRows ?? []).map(t => t.wallet_id).filter(Boolean))] as string[]
  const deletedAt = new Date().toISOString()

  // Los movimientos primero: si esto falla, el préstamo sigue entero y no se
  // perdió nada. Al revés quedaría el préstamo borrado y la plata colgada, que
  // es exactamente el estado que este borrado viene a evitar.
  if (txIds.length > 0) {
    const { error: txError } = await supabase
      .from('transactions')
      .update({ deleted_at: deletedAt })
      .in('id', txIds)
      .eq('user_id', user.id)

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  const { error } = await supabase
    .from('loans')
    .update({ deleted_at: deletedAt })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (error) {
    // Se deshace el borrado de los movimientos: con el préstamo vivo, sus
    // cuotas tienen que seguir contando para el pendiente.
    if (txIds.length > 0) {
      await supabase
        .from('transactions')
        .update({ deleted_at: null })
        .in('id', txIds)
        .eq('user_id', user.id)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Los saldos vuelven a donde estaban antes del préstamo. Se recalculan desde
  // las transacciones vivas y no restando a mano: la función de la base es la
  // única que sabe cómo suma cada tipo (ver migración 00029).
  const wallets: { id: string; balance: number }[] = []
  for (const walletId of walletIds) {
    await supabase.rpc('recompute_wallet_balance', { p_wallet_id: walletId })
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .single()
    if (wallet) wallets.push({ id: wallet.id, balance: Number(wallet.balance) })
  }

  return NextResponse.json({ success: true, wallets, deletedTransactions: txIds.length })
}
