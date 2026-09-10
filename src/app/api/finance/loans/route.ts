import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLoanSchema } from '@/lib/validations/finance'
import { LOAN_SELECT, WALLET_SELECT, loadRepayments } from './shared'
import type { Loan } from '@/lib/finance/loans'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('loans')
    .select(LOAN_SELECT)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // `direction` es `text` en la base, así que llega como `string`. El check de
  // la tabla es el que garantiza que sea uno de los dos valores.
  const loans = (data ?? []) as unknown as Loan[]
  const repayments = await loadRepayments(supabase, user.id, loans)

  return NextResponse.json({ loans, repayments })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const result = createLoanSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }
  const input = result.data

  // La billetera tiene que ser del usuario. La RLS ya lo garantiza para el
  // insert, pero un id ajeno daría un error de FK opaco en vez de un mensaje.
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('id', input.wallet_id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!wallet) return NextResponse.json({ error: 'Billetera no encontrada' }, { status: 404 })

  const { data: loan, error } = await supabase
    .from('loans')
    .insert({
      user_id:            user.id,
      direction:          input.direction,
      counterparty:       input.counterparty.trim(),
      wallet_id:          input.wallet_id,
      category_id:        input.category_id ?? null,
      principal:          input.principal,
      installments:       input.installments ?? null,
      installment_amount: input.installment_amount ?? null,
      next_due_date:      input.next_due_date ?? null,
      started_on:         input.started_on,
      notes:              input.notes ?? null,
    })
    .select(LOAN_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // El desembolso. Tipo `prestamo` y no `ingreso`/`gasto` a propósito: sacar un
  // préstamo no es ganar plata y prestarla no es gastarla. Va firmado — entra
  // si lo sacaste, sale si lo prestaste — y el trigger de la billetera lo suma
  // tal cual (ver migración 00029).
  const signedAmount = input.direction === 'tomado' ? input.principal : -input.principal

  const { error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id:     user.id,
      wallet_id:   input.wallet_id,
      loan_id:     loan.id,
      type:        'prestamo',
      amount:      signedAmount,
      description: input.direction === 'tomado'
        ? `Préstamo de ${loan.counterparty}`
        : `Préstamo a ${loan.counterparty}`,
      date:        input.started_on,
    })

  if (txError) {
    // Sin el movimiento, el préstamo existiría con un saldo que no se movió:
    // peor que no haberlo creado. Se deshace.
    await supabase.from('loans').delete().eq('id', loan.id).eq('user_id', user.id)
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  const { data: updatedWallet } = await supabase
    .from('wallets')
    .select(WALLET_SELECT)
    .eq('id', input.wallet_id)
    .single()

  return NextResponse.json({ loan, wallet: updatedWallet }, { status: 201 })
}
