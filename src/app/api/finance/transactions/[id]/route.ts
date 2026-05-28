import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateTransactionSchema } from '@/lib/validations/finance'

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

  // Guardar wallet_id anterior antes de actualizar
  const { data: existing } = await supabase
    .from('transactions')
    .select('wallet_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  const { data, error } = await supabase
    .from('transactions')
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select(`
      id, wallet_id, category_id, type, amount, description, date, auto_classified, created_at, updated_at,
      wallet:wallets(id, name, color),
      category:finance_categories(id, name, color, icon)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recomputar balance de todas las billeteras afectadas
  const walletIds = new Set<string>([data.wallet_id])
  if (existing?.wallet_id) walletIds.add(existing.wallet_id)

  for (const wid of walletIds) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('recompute_wallet_balance', { p_wallet_id: wid })
  }

  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
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

  // Guardar wallet_id antes de soft delete
  const { data: existing } = await supabase
    .from('transactions')
    .select('wallet_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (existing?.wallet_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('recompute_wallet_balance', { p_wallet_id: existing.wallet_id })

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, name, type, balance, currency, color, icon, created_at, updated_at')
      .eq('id', existing.wallet_id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    return NextResponse.json({ success: true, wallet })
  }

  return NextResponse.json({ success: true })
}
