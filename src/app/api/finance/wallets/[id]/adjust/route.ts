import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const adjustSchema = z.object({
  new_balance: z.number().finite(),
  note: z.string().max(200).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = adjustSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { new_balance, note } = result.data

  // Traer billetera actual
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('id, balance, currency, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (walletError || !wallet) {
    return NextResponse.json({ error: 'Billetera no encontrada' }, { status: 404 })
  }

  const current_balance = Number(wallet.balance)

  if (Math.abs(new_balance - current_balance) < 0.01) {
    // Sin cambio significativo — devolver la billetera tal cual
    const { data: unchanged } = await supabase
      .from('wallets')
      .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
      .eq('id', id)
      .single()
    return NextResponse.json({ wallet: unchanged })
  }

  const today = new Date().toISOString().slice(0, 10)

  // Calcular el balance que el trigger conoce (suma de transacciones)
  const { data: txRows } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('wallet_id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  const tx_sum = (txRows ?? []).reduce<number>((sum, t) => {
    if (t.type === 'ingreso') return sum + Number(t.amount)
    if (t.type === 'gasto')   return sum - Number(t.amount)
    return sum
  }, 0)

  // Si hay balance implícito (saldo inicial no registrado como transacción),
  // lo materializamos para que el trigger lo tenga en cuenta
  const implicit = current_balance - tx_sum
  if (Math.abs(implicit) > 0.01) {
    await supabase.from('transactions').insert({
      user_id:         user.id,
      wallet_id:       id,
      type:            implicit > 0 ? 'ingreso' : 'gasto',
      amount:          Math.abs(implicit),
      description:     'Balance inicial',
      date:            (wallet.created_at ?? today).slice(0, 10),
      category_id:     null,
      auto_classified: false,
      deleted_at:      null,
    })
  }

  // Transacción de ajuste por la diferencia
  const diff = new_balance - current_balance
  const description = note ? `Ajuste de balance: ${note}` : 'Ajuste de balance'

  const { error: txError } = await supabase.from('transactions').insert({
    user_id:         user.id,
    wallet_id:       id,
    type:            diff > 0 ? 'ingreso' : 'gasto',
    amount:          Math.abs(diff),
    description,
    date:            today,
    category_id:     null,
    auto_classified: false,
    deleted_at:      null,
  })

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  // Devolver la billetera actualizada (el trigger ya recalculó el balance)
  const { data: updated, error: updError } = await supabase
    .from('wallets')
    .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
    .eq('id', id)
    .single()

  if (updError) return NextResponse.json({ error: updError.message }, { status: 500 })

  return NextResponse.json({ wallet: updated })
}
